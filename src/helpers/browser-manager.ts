import puppeteer from 'puppeteer-extra';
import { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { ProxyConfig } from './proxy-manager';
const { chrome } = require('chrome-paths');
import EventEmitter from 'events';

interface BrowserOptions {
  headless?: boolean;
  userAgent?: string;
  proxyConfig?: ProxyConfig;
  extraArgs?: string[];
}

export default class BrowserManager extends EventEmitter {
  private browser: Browser | null = null;
  private isRestarting = false;
  private restartCount = 0;
  private maxRestarts = 10;
  private lastRestartTime = 0;
  private pages: Map<string, Page> = new Map();
  private options: BrowserOptions;
  
  constructor(options: BrowserOptions = {}) {
    super();
    this.options = {
      headless: false,
      ...options
    };
    
    puppeteer.use(StealthPlugin());
  }
  
  public async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.isBrowserHealthy()) {
      await this.launchBrowser();
    }
    return this.browser;
  }
  
  private async launchBrowser(): Promise<void> {
    // If already restarting, wait for it to complete
    if (this.isRestarting) {
      await new Promise<void>(resolve => {
        this.once('browser-restarted', () => resolve());
      });
      return;
    }
    
    // Check if we're restarting too frequently
    const now = Date.now();
    if (now - this.lastRestartTime < 60000 && this.restartCount > this.maxRestarts) {
      throw new Error(`Too many browser restarts in a short period (${this.restartCount} restarts)`);
    }
    
    try {
      this.isRestarting = true;
      
      // Close existing browser if it exists
      if (this.browser) {
        try {
          for (const [id, page] of this.pages) {
            try {
              if (!page.isClosed()) await page.close();
            } catch (e) {
              console.error(`Error closing page ${id}:`, e);
            }
          }
          await this.browser.close();
        } catch (e) {
          console.error('Error closing browser:', e);
        }
        
        this.browser = null;
        this.pages.clear();
      }
      
      // Build launch arguments
      const args = [
        '--no-sandbox',
        '--start-maximized',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        ...(this.options.extraArgs || [])
      ];
      
      // Add proxy if specified
      if (this.options.proxyConfig) {
        const { host, port, username, password } = this.options.proxyConfig;
        const auth = username && password ? `${username}:${password}@` : '';
        args.push(`--proxy-server=http://${auth}${host}:${port}`);
      }
      
      // Launch new browser
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        executablePath: chrome,
        args,
        ignoreHTTPSErrors: true,
        defaultViewport: null
      });
      
      // Set up event listeners
      this.browser.on('disconnected', () => {
        console.log('Browser disconnected event detected');
        this.handleBrowserCrash();
      });
      
      // Increment restart count
      this.restartCount++;
      this.lastRestartTime = now;
      
      console.log(`Browser restarted successfully (restart #${this.restartCount})`);
      this.emit('browser-restarted', this.browser);
    } catch (error) {
      console.error('Failed to restart browser:', error);
      this.emit('browser-restart-failed', error);
      throw error;
    } finally {
      this.isRestarting = false;
    }
  }
  
  private async handleBrowserCrash(): Promise<void> {
    console.log('Handling browser crash');
    this.browser = null;
    
    // Notify about the crash
    this.emit('browser-crashed');
    
    // Automatically restart the browser
    try {
      await this.launchBrowser();
    } catch (error) {
      console.error('Failed to auto-restart browser after crash:', error);
    }
  }
  
  public async newPage(id?: string): Promise<{ page: Page, pageId: string }> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Generate page ID if not provided
    const pageId = id || `page_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Set user agent if specified
    if (this.options.userAgent) {
      await page.setUserAgent(this.options.userAgent);
    }
    
    // Set up error handling
    page.on('error', error => {
      console.error(`Error in page ${pageId}:`, error);
      this.emit('page-error', { pageId, error });
    });
    
    // Store the page
    this.pages.set(pageId, page);
    
    return { page, pageId };
  }
  
  public async closePage(pageId: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (page && !page.isClosed()) {
      await page.close();
    }
    this.pages.delete(pageId);
  }
  
  public async getPage(pageId: string): Promise<Page | null> {
    return this.pages.get(pageId) || null;
  }
  
  public async close(): Promise<void> {
    if (this.browser) {
      for (const [id, page] of this.pages) {
        try {
          if (!page.isClosed()) await page.close();
        } catch (e) {
          console.error(`Error closing page ${id}:`, e);
        }
      }
      
      try {
        await this.browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
      
      this.browser = null;
      this.pages.clear();
    }
  }
  
  private isBrowserHealthy(): boolean {
    if (!this.browser) return false;
    
    try {
      return !this.browser.process()?.killed;
    } catch (e) {
      return false;
    }
  }
} 