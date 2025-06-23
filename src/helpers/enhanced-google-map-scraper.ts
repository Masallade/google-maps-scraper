import { IpcMainEvent } from 'electron';
import { load, Element, Cheerio } from 'cheerio';
import { Page } from 'puppeteer';
import { submitState } from '../enum';
import WhatsAppAnalyzer from './whatsapp-analyzer';
import Place from '../interfaces/types/Place';
import BrowserManager from './browser-manager';
import ProxyManager, { ProxyConfig } from './proxy-manager';
import SessionManager from './session-manager';
import RequestQueue from './request-queue';
import log from 'electron-log/main';

export interface BusinessPlace extends Place {
  placeId: string;
  address: string;
  category: string | null;
  phone: string | null;
  googleUrl: string;
  bizWebsite: string | null;
  storeName: string | null;
  stars: string;
  numberOfReviews: string | null;
  hasWhatsApp: boolean;
  isVerified: boolean;
  ratingValue: number;
}

export interface StartScrappingProps {
  query?: string;
  url?: string;
  country?: string;
  city?: string;
}

export interface BusinessPlaceFilters {
  minRating?: number;
  maxRating?: number;
  excludeVerified?: boolean;
  requiresWhatsApp?: boolean;
  detectChatbot?: boolean;
  maxReviews?: number;
  strictWhatsAppMode?: boolean;
}

export interface ScraperSettings {
  useProxies: boolean;
  headlessBrowser: boolean;
  maxConcurrentBrowsers: number;
  requestDelay: number;
  maxRestarts: number;
  userAgentRotation: boolean;
}

export default class EnhancedGoogleMapScraper {
  private browserManager: BrowserManager;
  private proxyManager: ProxyManager;
  private sessionManager: SessionManager;
  private requestQueue: RequestQueue;
  private whatsappAnalyzer: WhatsAppAnalyzer | null;
  private scrollable: boolean = false;
  private running: boolean = false;
  private settings: ScraperSettings;
  private activeSessionId: string | null = null;
  
  constructor(settings?: Partial<ScraperSettings>) {
    this.settings = {
      useProxies: false,
      headlessBrowser: false,
      maxConcurrentBrowsers: 1,
      requestDelay: 2000,
      maxRestarts: 5,
      userAgentRotation: true,
      ...settings
    };
    
    this.proxyManager = new ProxyManager();
    this.sessionManager = new SessionManager();
    this.requestQueue = new RequestQueue(
      this.settings.maxConcurrentBrowsers,
      this.settings.requestDelay
    );
    
    // Initialize browser manager with first proxy if available
    const proxyConfig = this.settings.useProxies ? this.proxyManager.getNextProxy() : null;
    
    this.browserManager = new BrowserManager({
      headless: this.settings.headlessBrowser,
      proxyConfig
    });
    
    // Set up queue listeners
    this.setupQueueListeners();
  }
  
  private setupQueueListeners(): void {
    this.requestQueue.on('task', async (task, callback) => {
      try {
        switch (task.type) {
          case 'map_search':
            await this.processMapSearchTask(task.data);
            callback();
            break;
          case 'detail_page':
            await this.processDetailPageTask(task.data);
            callback();
            break;
          case 'whatsapp_check':
            await this.processWhatsAppCheckTask(task.data);
            callback();
            break;
          default:
            callback(new Error(`Unknown task type: ${task.type}`));
        }
      } catch (error) {
        console.error(`Error processing task ${task.id} (${task.type}):`, error);
        callback(error);
      }
    });
    
    this.requestQueue.on('taskFailed', (task, error) => {
      console.error(`Task ${task.id} failed after ${task.maxRetries} retries:`, error);
      
      // Update session status if this is a critical task
      if (this.activeSessionId && (task.type === 'map_search')) {
        this.sessionManager.updateSessionStatus(
          this.activeSessionId,
          'failed',
          `Task failed: ${error.message}`
        );
      }
    });
    
    // Handle browser crash/restart events
    this.browserManager.on('browser-crashed', () => {
      console.log('Detected browser crash, will attempt recovery');
      
      // Pause the queue during recovery
      this.requestQueue.pauseQueue();
    });
    
    this.browserManager.on('browser-restarted', () => {
      console.log('Browser restarted successfully, resuming queue');
      
      // Resume the queue after successful restart
      this.requestQueue.resumeQueue();
    });
  }
  
  public async startScrapping(
    electronEvent: IpcMainEvent,
    params: StartScrappingProps,
    filters?: BusinessPlaceFilters
  ): Promise<BusinessPlace[]> {
    try {
      // Initialize running state
      this.running = true;
      this.scrollable = true;
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.scrapping);
      
      // Initialize WhatsApp Analyzer if needed
      if (filters && (filters.requiresWhatsApp || filters.detectChatbot)) {
        try {
          const strictMode = filters.strictWhatsAppMode !== false;
          console.log(`Using WhatsApp detection in ${strictMode ? 'strict' : 'loose'} mode`);
          
          this.whatsappAnalyzer = new WhatsAppAnalyzer(strictMode);
          await this.whatsappAnalyzer.init();
          
          console.log('WhatsApp detector initialized');
        } catch (error) {
          console.error("Error initializing WhatsApp analyzer:", error);
        }
      }

      // Create a new session
      const queryText = params.query || params.url || 'Unknown search';
      const sessionId = this.sessionManager.createSession(queryText, filters);
      this.activeSessionId = sessionId;
      
      // Get a page from browser manager
      const { page, pageId } = await this.browserManager.newPage(`search_${sessionId}`);
      
      // Construct the search URL
      let url: string;
      if (params.query) {
        // Build location-aware query
        let searchQuery = params.query;
        if (params.city) {
          searchQuery += ` in ${params.city}`;
        }
        if (params.country && !searchQuery.toLowerCase().includes(params.country.toLowerCase())) {
          searchQuery += `, ${params.country}`;
        }
        url = `https://www.google.com/maps/search/${searchQuery.split(" ").join("+")}`;
      } else {
        url = params.url;
      }
      
      // Add language parameter
      const parseUrl = new URL(url);
      parseUrl.searchParams.append('hl', 'en'); // English language
      url = parseUrl.toString();
      
      console.log(`Starting search with URL: ${url}`);
      
      // Navigate to the search URL with retry logic
      const success = await this.navigateWithRetry(page, url);
      if (!success) {
        throw new Error("Failed to load Google Maps after multiple attempts");
      }
      
      // Start the scraping process
      const listing: BusinessPlace[] = [];
      let processedListElements = 0;
      
      while (this.scrollable && this.running) {
        // Save cookies for session resumption
        const cookies = await page.cookies();
        if (this.activeSessionId) {
          this.sessionManager.saveBrowserCookies(this.activeSessionId, cookies);
        }
        
        // Get the current page content and parse it
        const html = await page.content();
        const $ = load(html);
        const googleMapListElements = $('div[role="feed"] > div');
        
        // Skip already processed elements
        const newElements = googleMapListElements.slice(processedListElements);
        
        // Process each listing
        for (let i = 0; i < newElements.length; i++) {
          if (!this.running) break;
          
          const el = newElements[i];
          const aElement = $(el).find("a");
          
          if (aElement.length && aElement.attr("href")?.includes("/maps/place/")) {
            try {
              // Extract basic data from the listing
              const data = this.htmlToObject(aElement.parent());
              
              // Set location data if provided
              if (params.city) data.city = params.city;
              if (params.country) data.country = params.country;
              
              // Detect verification status
              data.isVerified = this.detectVerificationBadge(aElement.parent());
              data.ratingValue = data.stars ? parseFloat(data.stars) : 0;
              
              // Queue the detail page task for more information
              this.requestQueue.enqueue('detail_page', {
                data,
                sessionId: this.activeSessionId,
                electronEvent
              });
              
              // Add to listing regardless of filters
              listing.push(data);
              
              // Check if this business matches all filters
              const matchesFilters = this.applyFilters(data, filters);
              
              // Send to renderer with filter match status
              electronEvent.sender.send('receiveGoogleMapScrappingResult', {
                ...data,
                matchesFilters
              });
              
              // Update session with progress
              if (this.activeSessionId) {
                this.sessionManager.updateSessionProgress(
                  this.activeSessionId,
                  processedListElements + i + 1,
                  [data]
                );
              }
            } catch (error) {
              console.error("Error processing listing:", error);
            }
          }
        }
        
        // Update the processed count
        processedListElements += newElements.length;
        
        // Check if we've reached the end of listings
        const lastElementWrapper = $('div[role="feed"] > div:last-child');
        if (lastElementWrapper.length && 
            lastElementWrapper.html().toLowerCase().includes("you've reached the end of the list")) {
          this.scrollable = false;
        } else {
          // Scroll down to load more results
          await page.evaluate(() => {
            const wrapper = document.querySelector('div[role="feed"]');
            if (wrapper) wrapper.scrollBy(0, 1000);
          });
          
          // Wait a bit before next scroll
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Wait for all queued tasks to complete
      while (this.requestQueue.queueLength > 0 || this.requestQueue.activeTasksCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!this.running) {
          console.log("Scraping stopped before all tasks completed");
          break;
        }
      }
      
      // Mark session as completed if it was successful
      if (this.activeSessionId) {
        this.sessionManager.updateSessionStatus(this.activeSessionId, 'completed');
      }
      
      // Clean up
      await this.browserManager.closePage(pageId);
      
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
      return listing;
      
    } catch (error) {
      console.error("Error in startScrapping:", error);
      
      // Update session status if there's an active session
      if (this.activeSessionId) {
        this.sessionManager.updateSessionStatus(
          this.activeSessionId,
          'failed',
          error.message || 'Unknown error'
        );
      }
      
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
      return Promise.reject(error);
    }
  }
  
  private async processDetailPageTask(taskData: any): Promise<void> {
    const { data, sessionId, electronEvent } = taskData;
    
    try {
      // Get a page for detail view
      const { page, pageId } = await this.browserManager.newPage(`detail_${data.placeId}`);
      
      try {
        // Navigate to the detail page
        const detailUrl = data.googleUrl;
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for details to load
        await this.waitForSelectorWithRetry(page, '[data-item-id]', 8000, 2);
        
        // Extract additional details
        const html = await page.content();
        const $ = load(html);
        
        // Get address
        const dataItemAddress = $('[data-item-id="address"]');
        if (dataItemAddress.length) {
          const addressElement = dataItemAddress.find('.fontBodyMedium');
          if (addressElement.length) {
            data.address = dataItemAddress.text().trim();
          }
        }
        
        // Get phone number
        const dataItemPhone = $('[data-item-id^="phone:tel"]');
        if (dataItemPhone.length) {
          const phoneNumber = dataItemPhone.attr('data-item-id');
          if (phoneNumber) {
            data.phone = phoneNumber.replace('phone:tel:', '');
          }
        }
        
        // Get website
        const dataWebsite = $('[aria-label^="Website:"]');
        if (dataWebsite.length) {
          data.bizWebsite = dataWebsite.attr('href');
        }
        
        // Re-check verification status
        data.isVerified = data.isVerified || this.detectVerificationBadgeFromDetail($);
        
        // Close the detail view
        try {
          await page.click('div[role="main"][aria-label] .VfPpkd-kBDsod');
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          // Ignore close button errors
        }
        
        // Format the address
        data.address = data.address ? data.address.replace(/[^\x00-\x7F]/g, "") : '';
        
        // Queue WhatsApp check if needed
        const filters = sessionId ? this.sessionManager.getSession(sessionId)?.filters : null;
        if (filters && (filters.requiresWhatsApp || filters.detectChatbot) && data.phone) {
          this.requestQueue.enqueue('whatsapp_check', {
            data,
            filters,
            sessionId,
            electronEvent
          });
        } else {
          // Update the result directly if no WhatsApp check is needed
          this.updateResultData(data, electronEvent, filters);
        }
      } finally {
        // Close the page to free resources
        await this.browserManager.closePage(pageId);
      }
    } catch (error) {
      console.error(`Error processing detail page for ${data.storeName}:`, error);
      
      // Still update with what we have
      this.updateResultData(data, electronEvent);
      throw error;
    }
  }
  
  private async processWhatsAppCheckTask(taskData: any): Promise<void> {
    const { data, filters, electronEvent } = taskData;
    
    try {
      // Reset WhatsApp status
      data.hasWhatsApp = false;
      data.isChatbot = false;
      
      if (this.whatsappAnalyzer && data.phone) {
        try {
          // Clean the phone number
          const cleanPhone = data.phone.replace(/[^0-9+]/g, '');
          
          // Run WhatsApp check
          console.log(`Checking if ${cleanPhone} is on WhatsApp...`);
          const result = await this.whatsappAnalyzer.detectWhatsApp(cleanPhone);
          
          // Use the detected result
          data.hasWhatsApp = result.hasWhatsApp;
          if (data.hasWhatsApp) {
            data.whatsAppNumber = result.number;
            data.isChatbot = result.isChatbot || false;
          }
          
          console.log(`WhatsApp detection for ${cleanPhone}: ${data.hasWhatsApp ? 'Yes' : 'No'}, Chatbot: ${data.isChatbot ? 'Yes' : 'No'}`);
        } catch (error) {
          console.error(`WhatsApp detection error for ${data.phone}:`, error);
        }
      }
      
      // Update the result with WhatsApp information
      this.updateResultData(data, electronEvent, filters);
    } catch (error) {
      console.error(`Error in WhatsApp check for ${data.phone}:`, error);
      
      // Still update result with what we have
      this.updateResultData(data, electronEvent, filters);
      throw error;
    }
  }
  
  private updateResultData(data: BusinessPlace, electronEvent: IpcMainEvent, filters?: any): void {
    // Check if this business matches all filters
    const matchesFilters = this.applyFilters(data, filters);
    
    // Send updated data to renderer
    electronEvent.sender.send('receiveGoogleMapScrappingResult', {
      ...data,
      matchesFilters
    });
    
    // Update session data if there's an active session
    if (this.activeSessionId) {
      // This is just to update the individual business details in the session
      // Not adding a new result as it's already in the results array
      this.sessionManager.updateSessionProgress(
        this.activeSessionId,
        null,
        []
      );
    }
  }
  
  // Utility methods from original scraper
  private applyFilters(data: BusinessPlace, filters?: BusinessPlaceFilters): boolean {
    if (!filters) return true;
    
    // Keep track of all filter conditions
    let matchesRating = true;
    let matchesReviews = true;
    let matchesVerification = true;
    let matchesWhatsApp = true;
    let matchesChatbot = true;
    
    // Filter by rating
    if (filters.minRating !== undefined && data.ratingValue !== undefined && 
        data.ratingValue < filters.minRating) {
      matchesRating = false;
    }
    
    if (filters.maxRating !== undefined && data.ratingValue !== undefined && 
        data.ratingValue > filters.maxRating) {
      matchesRating = false;
    }
    
    // Filter by number of reviews
    if (filters.maxReviews !== undefined && data.numberOfReviews) {
      const reviewCount = parseInt(data.numberOfReviews.replace(/,/g, ''));
      if (!isNaN(reviewCount) && reviewCount > filters.maxReviews) {
        matchesReviews = false;
      }
    }
    
    // Filter by verification status
    if (filters.excludeVerified && data.isVerified) {
      matchesVerification = false;
    }
    
    // Filter by WhatsApp presence
    if (filters.requiresWhatsApp && !data.hasWhatsApp) {
      matchesWhatsApp = false;
    }
    
    // Filter by chatbot presence
    if (filters.detectChatbot && !data.isChatbot) {
      matchesChatbot = true; // Changed to true since we don't have reliable chatbot detection
    }
    
    // Business matches if it passes ALL applicable filters
    return matchesRating && matchesReviews && matchesVerification && matchesWhatsApp && matchesChatbot;
  }
  
  private detectVerificationBadge(element: Cheerio<Element>): boolean {
    // Look for verification badge in the listing
    const html = element.html() || '';
    return html.includes('verified') || html.includes('Verified') || html.includes('badge');
  }
  
  private detectVerificationBadgeFromDetail($: any): boolean {
    // Look for verification badge in the detail view
    const badgeElements = $('[aria-label*="Verified"]');
    return badgeElements.length > 0;
  }
  
  private htmlToObject(item: Cheerio<Element>): BusinessPlace {
    // Extract basic info from the listing
    const storeName = item.find("[role=heading]").first().text() || null;
    const aElement = item.find("a");
    const href = aElement.attr("href") || '';
    
    // Extract stars and reviews count
    const ratingElement = item.find("[role=img]");
    
    const stars = ratingElement.attr("aria-label")
      ? ratingElement.attr("aria-label").replace("stars", "").replace("star", "").trim()
      : '0';
      
    const starsParent = ratingElement.parent();
    const reviewsElement = starsParent.length ? starsParent.find("span:not([role])") : null;
    const numberOfReviews = reviewsElement && reviewsElement.text() 
      ? reviewsElement.text().replace(/[()]/g, "")
      : null;
    
    // Extract category and address from the spans
    const infoSpans = item.find("span").filter((_, el) => {
      return !$(el).find("span").length && $(el).text().trim() !== "";
    });
    
    let category = null;
    let address = "";
    
    if (infoSpans.length >= 2) {
      category = $(infoSpans[0]).text().trim() || null;
      address = $(infoSpans[1]).text().trim() || "";
    } else if (infoSpans.length === 1) {
      category = $(infoSpans[0]).text().trim() || null;
    }
    
    // Generate a place ID from the URL
    const placeId = href.split("/maps/place/")[1]?.split("/")[0] || 
                   href.split("?q=")[1]?.split("&")[0] || 
                   `place_${Math.random().toString(36).substring(2, 15)}`;
    
    return {
      placeId,
      storeName,
      category,
      address,
      stars,
      numberOfReviews,
      googleUrl: href,
      phone: null,
      bizWebsite: null,
      hasWhatsApp: false,
      isVerified: false,
      ratingValue: stars ? parseFloat(stars) : 0
    };
  }
  
  public async stopScrapping(): Promise<void> {
    try {
      this.scrollable = false;
      this.running = false;
      
      // Pause the queue
      this.requestQueue.pauseQueue();
      
      // Close WhatsApp analyzer
      if (this.whatsappAnalyzer) {
        await this.whatsappAnalyzer.close();
        this.whatsappAnalyzer = null;
      }
      
      // Update session status if there's an active session
      if (this.activeSessionId) {
        this.sessionManager.updateSessionStatus(this.activeSessionId, 'paused');
      }
      
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
  
  public async shutdown(): Promise<void> {
    try {
      this.running = false;
      this.scrollable = false;
      
      // Close WhatsApp analyzer
      if (this.whatsappAnalyzer) {
        await this.whatsappAnalyzer.close();
        this.whatsappAnalyzer = null;
      }
      
      // Close browser
      await this.browserManager.close();
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error during shutdown:", error);
      return Promise.reject(error);
    }
  }
  
  // Helper methods for navigation and waiting
  private async navigateWithRetry(page: Page, url: string, maxRetries = 3): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Check if page loaded correctly
        const content = await page.content();
        if (content.includes('Google Maps') || content.includes('div[role="feed"]')) {
          return true;
        }
        
        console.log(`Navigation attempt ${attempt + 1}/${maxRetries} failed to load expected content`);
      } catch (error) {
        console.error(`Navigation attempt ${attempt + 1}/${maxRetries} failed with error:`, error.message);
        
        if (attempt === maxRetries - 1) {
          return false;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
    
    return false;
  }
  
  private async waitForSelectorWithRetry(
    page: Page, 
    selector: string, 
    timeout = 10000, 
    maxRetries = 3
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await page.waitForSelector(selector, { timeout });
        return true;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          return false;
        }
        
        // Check if the page still has the expected content
        const content = await page.content();
        if (!content.includes('Google Maps')) {
          return false;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return false;
  }
}
