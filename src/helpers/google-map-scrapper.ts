import { IpcMainEvent } from 'electron';
// import * as cheerio from "cheerio";
import { load, Element, Cheerio } from 'cheerio';
const {chrome} = require('chrome-paths');
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { submitState } from '../enum';
import WhatsAppAnalyzer from './whatsapp-analyzer';
import Place from '../interfaces/types/Place';

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

export default class GoogleMapScrapper {
  private browser: Browser;
  private scrollable: boolean;
  private whatsappAnalyzer: WhatsAppAnalyzer | null;
  
  constructor() {
    this.browser = null;
    this.scrollable = false;
    this.whatsappAnalyzer = null;
  }
  
  async startScrapping(electronEvent: IpcMainEvent, params: StartScrappingProps, filters?: BusinessPlaceFilters) {
    try {
      const os = require('os');

      puppeteer.use(StealthPlugin());
  
      this.browser = await puppeteer.launch({
        headless: false,
        executablePath: chrome,
        args: ['--no-sandbox', '--start-maximized'],
      });
      
      // Initialize WhatsApp Analyzer if needed
      if (filters && (filters.requiresWhatsApp || filters.detectChatbot)) {
        try {
          // Use the strict mode setting if provided (default to true for safety)
          const strictMode = filters.strictWhatsAppMode !== false;
          console.log(`Using WhatsApp detection in ${strictMode ? 'strict' : 'loose'} mode`);
          
          this.whatsappAnalyzer = new WhatsAppAnalyzer(strictMode);
          await this.whatsappAnalyzer.init();
          
          // Log whether we're using the API
          console.log('WhatsApp detector initialized');
        } catch (error) {
          console.error("Error initializing WhatsApp analyzer:", error);
        }
      }
      
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.scrapping);
  
      const page = await this.browser.newPage();
  
      try {
        let url = null;
        if (params.query) {
          // Construct query with location parameters if provided
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
        const parseUrl = new URL(url);
        parseUrl.searchParams.append('hl', 'en'); // English language
        console.log(parseUrl.toString());
        
        // Use retry logic for more reliable connection
        const success = await this.fetchWithRetry(page, parseUrl.toString());
        if (!success) {
          throw new Error("Failed to load Google Maps after multiple attempts");
        }
      } catch (error) {
        electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
        return Promise.reject(error)
      }

      this.scrollable = true;
      const listing:Array<BusinessPlace> = [];
      let processedListElement = 0;
      const mainProcess = async () => {
        while (this.scrollable) {
          const html = await page.content();
          const $ = load(html);
          let googleMapListElements = $('div[role="feed"] > div');
          googleMapListElements.splice(0, processedListElement);
  
          for await (const el of googleMapListElements) {
            const aElement = $(el).find("a");
            if (aElement.length) {
              const href = aElement.attr("href");
              if (href && href.includes("/maps/place/")) {
                let data: BusinessPlace = this.htmlToObject(
                  aElement.parent()
                );
                
                // Set location data if provided
                if (params.city) data.city = params.city;
                if (params.country) data.country = params.country;
                
                // Detect verification status from the HTML
                data.isVerified = this.detectVerificationBadge(aElement.parent());
                
                // Extract rating as a number for filtering
                data.ratingValue = data.stars ? parseFloat(data.stars) : 0;
                
                if (!data.address || !data.phone) {
                  try {
                    // Click on the listing to open details
                    await page.click(`a[href="${data.googleUrl}"]`);
                    
                    // Wait for navigation with better reliability
                    await page.waitForNavigation({
                        waitUntil: 'domcontentloaded',
                      timeout: 10000
                    }).catch(e => console.log("Navigation timeout, continuing anyway"));
                    
                    // Wait for details to load with retry logic
                    await this.waitForSelectorWithRetry(page, '[data-item-id]', 8000, 2);
                    
                    let phoneNumber = null;
                    let address = data.address;

                    const html = await page.content();
                    const $ = load(html);

                    const dataItemAddress = $('[data-item-id="address"]');
                    if (dataItemAddress) {
                      const addressElement = dataItemAddress.find('.fontBodyMedium');
                      if (addressElement) {
                        address = dataItemAddress.text();
                      }
                    }
                    data.address = address;
                    
                    const dataItemPhone = $('[data-item-id^="phone:tel"]');
                    if (dataItemPhone) {
                      phoneNumber = dataItemPhone.attr('data-item-id');
                      if (phoneNumber) {
                        phoneNumber = phoneNumber.replace('phone:tel:', '')
                      }
                    }
                    data.phone = phoneNumber;
  
                    const dataWebsite = $('[aria-label^="Website:"]');
                    if (dataWebsite) {
                      data.bizWebsite = dataWebsite.attr('href');
                    }
                    
                    // Re-check verification status on the detail page
                    data.isVerified = data.isVerified || this.detectVerificationBadgeFromDetail($);
  
                    const promise = new Promise(async (resolve) => {
                      try {
                        await page.click('div[role="main"][aria-label] .VfPpkd-kBDsod')
                      } catch (e) {
                        // console.log('error on close', e)
                      }
                      return setTimeout(resolve, 500, null);
                    });
                    await Promise.all([
                      promise
                    ]);
                  } catch (e) {
                    console.error("Error processing detail page:", e);
                  }
                }
                
                data.address = data.address ? data.address.replace(/[^\x00-\x7F]/g, "") : '';
                
                // Check WhatsApp if needed
                if (filters && (filters.requiresWhatsApp || filters.detectChatbot) && data.phone) {
                  try {
                    // Reset to false by default - we won't assume a number has WhatsApp
                    data.hasWhatsApp = false;
                    
                    // Check the phone number using the analyzer if available
                    if (this.whatsappAnalyzer) {
                      try {
                        // Clean the phone number
                        const cleanPhone = data.phone.replace(/[^0-9+]/g, '');
                        
                        // Run the actual WhatsApp check - this uses the web-based verification
                        console.log(`Checking if ${cleanPhone} is on WhatsApp...`);
                        const result = await this.whatsappAnalyzer.detectWhatsApp(cleanPhone);
                        
                        // Use the actual detected result
                        data.hasWhatsApp = result.hasWhatsApp;
                        if (data.hasWhatsApp) {
                          data.whatsAppNumber = result.number;
                        }
                        
                        console.log(`WhatsApp detection result for ${cleanPhone}:`, data.hasWhatsApp);
                      } catch (error) {
                        console.error(`WhatsApp detection error for ${data.phone}:`, error);
                        data.hasWhatsApp = false;
                      }
                    } else {
                      // No analyzer available, default to false
                      data.hasWhatsApp = false;
                      console.log(`No WhatsApp analyzer available, setting ${data.phone} to false`);
                    }
                    
                    // Only try to detect chatbot if requested and has WhatsApp
                    if (filters.detectChatbot && data.hasWhatsApp && this.whatsappAnalyzer) {
                      data.isChatbot = false; // Default to false for now
                    }
                  } catch (error) {
                    console.error("Error checking WhatsApp:", error);
                    // Default to false for WhatsApp in case of detection error
                    data.hasWhatsApp = false;
                    data.isChatbot = false;
                  }
                }
                
                // Add to listing regardless of filters
                listing.push(data);
                
                // Check if this business matches all filters
                const matchesFilters = this.applyFilters(data, filters);
                
                // Send to renderer with filter match status
                electronEvent.sender.send('receiveGoogleMapScrappingResult', {
                  ...data,
                  matchesFilters
                });
              }
            }
          }
          processedListElement += googleMapListElements.length;
  
          // Check if reached end of page
          const lastElementWrapper = $('div[role="feed"] > div:last-child');
          if (lastElementWrapper.length && (
            lastElementWrapper.html().toLowerCase().includes("you've reached the end of the list")
          )) {
            this.scrollable = false;
          } else {
            await page.evaluate(() => {
              const wrapper = document.querySelector('div[role="feed"]');
              wrapper.scrollBy(0, 1000);
            });
          }
        }
  
        return Promise.resolve(true)
      }
  
      await mainProcess();
  
      if (page.isClosed()) {
        electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
        return Promise.resolve(listing);
      }
      
      await this.processCompleted();
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
      return Promise.resolve(listing);
  
    } catch (error) {
      electronEvent.sender.send('receiveGoogleMapScrappingTaskState', submitState.idle);
      return Promise.reject(error)
    }
  }

  async stopScrapping() {
    this.scrollable = false;
    if (this.whatsappAnalyzer) {
      try {
        await this.whatsappAnalyzer.close();
      } catch (error) {
        console.error("Error closing WhatsApp analyzer:", error);
      }
    }
  }

  async processCompleted() {
    try {
        // close all page
        const pages = await this.browser.pages();
        await Promise.all(pages.map((page) => page.close()));
        // close browser
        await this.browser.close();
        
        // Close WhatsApp analyzer if it exists
        if (this.whatsappAnalyzer) {
          await this.whatsappAnalyzer.close();
          this.whatsappAnalyzer = null;
        }
        
        return Promise.resolve(null);
    } catch (e) {
      return Promise.reject(e)
    }
  }

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
    
    // Filter by WhatsApp presence - this now uses accurate detection
    if (filters.requiresWhatsApp && !data.hasWhatsApp) {
      matchesWhatsApp = false;
    }
    
    // Filter by chatbot presence - only apply if specifically requested
    if (filters.detectChatbot && !data.isChatbot) {
      matchesChatbot = true; // Changed to true since we don't have reliable chatbot detection
    }
    
    // Log the filter results for debugging
    console.log(`Business ${data.storeName} filter results:`, {
      rating: matchesRating,
      reviews: matchesReviews,
      verification: matchesVerification,
      whatsApp: matchesWhatsApp,
      chatbot: matchesChatbot,
      hasWhatsApp: data.hasWhatsApp
    });
    
    // Business matches if it passes ALL applicable filters
    return matchesRating && matchesReviews && matchesVerification && matchesWhatsApp && matchesChatbot;
  }
  
  private detectVerificationBadge(element: Cheerio<Element>): boolean {
    // Look for verification badge in the listing
    // This is a placeholder implementation - actual detection would need to
    // check for specific elements that indicate a verified business
    
    // For simplicity, we'll check if the text includes common verification terms
    const text = element.text().toLowerCase();
    return text.includes('verified') || text.includes('official');
  }
  
  private detectVerificationBadgeFromDetail($: any): boolean {
    // Look for verification badge in the detail page
    // This is a placeholder implementation
    
    // Check for verification badge elements
    const verificationElements = $('[aria-label*="Verified"]');
    return verificationElements.length > 0;
  }

  htmlToObject(item: Cheerio<Element>): BusinessPlace {
    const url = item.find("a").attr("href");
    const website = item.find('a[data-value="Website"]').attr("href");
    let storeName = item.find("div.fontHeadlineSmall").text();
    if (item.find("div.fontHeadlineSmall").length > 1) {
      storeName = item.find("div.fontHeadlineSmall:first").text();
    }
    
    const ratingText = item
      .find("span.fontBodyMedium > span")
      .attr("aria-label");
    const ratingNumber = item
      .find("span.MW4etd").text();
      const reviewCounter = item
        .find("span.UY7F9").text();
      const phoneNumber = item
        .find("span.UsdlK").text();
  
    const bodyDiv = item.find("div.fontBodyMedium").first();
    const children = bodyDiv.children();
    const lastChild = children.last();
    const firstOfLast = lastChild.children().first();
    
    const categoryText = firstOfLast?.text()?.split("·")?.[0]?.trim();
    const addressText = firstOfLast?.text()?.split("·")?.[1]?.trim();
  
    return {
      placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
      address: addressText || '',
      category: categoryText,
      phone: phoneNumber ? phoneNumber : null,
      googleUrl: url,
      bizWebsite: website,
      storeName,
      ratingText,
      stars: ratingNumber,
      numberOfReviews: reviewCounter ? reviewCounter.replace(/[{()}]/g, '') : null,
      hasWhatsApp: false,
      isVerified: false,
      ratingValue: ratingNumber ? parseFloat(ratingNumber) : 0
    };
  }

  private async fetchWithRetry(page: any, url: string, maxRetries = 3): Promise<boolean> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await page.goto(url, { timeout: 30000 });
        return true;
      } catch (error) {
        console.error(`Connection error (attempt ${retries + 1}/${maxRetries}):`, error);
        retries++;
        if (retries >= maxRetries) {
          console.error("Max retries reached, giving up");
          return false;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return false;
  }

  private async waitForSelectorWithRetry(page: any, selector: string, timeout = 10000, maxRetries = 3): Promise<boolean> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await page.waitForSelector(selector, { timeout });
        return true;
      } catch (error) {
        console.error(`Selector wait error (attempt ${retries + 1}/${maxRetries}):`, error);
        retries++;
        if (retries >= maxRetries) {
          console.error("Max retries reached for selector, continuing anyway");
          return false;
        }
      }
    }
    return false;
  }
}