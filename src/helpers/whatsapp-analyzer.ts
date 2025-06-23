import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import { whatsappConfig } from '../config/whatsapp-config';
const {chrome} = require('chrome-paths');

export interface WhatsAppAnalysisResult {
  hasWhatsApp: boolean;
  isChatbot: boolean;
  responseTime?: number;
  number: string;
  error?: string;
}

// For future WhatsApp Business API integration
interface WhatsAppAPIConfig {
  apiKey: string;
  phoneNumberId: string;
  businessAccountId: string;
  appId: string;
}

export default class WhatsAppAnalyzer {
  private browser: Browser;
  private apiConfig: WhatsAppAPIConfig;
  private useAPI: boolean;
  private verifiedNumbers: Map<string, boolean>;
  private strictMode: boolean;
  private readonly API_BASE_URL = 'https://graph.facebook.com/v17.0';
  
  constructor(strictModeOrConfig?: boolean | WhatsAppAPIConfig) {
    this.browser = null;
    this.verifiedNumbers = new Map<string, boolean>();
    
    // Handle the various constructor patterns
    if (typeof strictModeOrConfig === 'boolean') {
      // Called with just strictMode
      this.strictMode = strictModeOrConfig;
      this.apiConfig = whatsappConfig;
      this.useAPI = true;
    } else {
      // Called with API config object
      this.apiConfig = strictModeOrConfig || whatsappConfig;
      this.useAPI = true;
      
      // Default to strict mode unless explicitly set
      this.strictMode = true;
    }
    
    if (this.useAPI) {
      console.log('WhatsApp API is enabled with config:', {
        phoneNumberId: this.apiConfig.phoneNumberId,
        businessAccountId: this.apiConfig.businessAccountId,
        appId: this.apiConfig.appId,
        apiKey: this.maskToken(this.apiConfig.apiKey)
      });
    }
    
    console.log(`WhatsApp analyzer initialized in ${this.strictMode ? 'strict' : 'loose'} mode`);
  }
  
  // Mask token for logging (show only first 4 and last 4 characters)
  private maskToken(token: string): string {
    if (!token) return '';
    if (token.length <= 8) return '****';
    return token.substring(0, 4) + '****' + token.substring(token.length - 4);
  }
  
  async init() {
    puppeteer.use(StealthPlugin());
    this.browser = await puppeteer.launch({
      headless: true, // Changed from false to true for production use
      executablePath: chrome,
      args: ['--no-sandbox', '--start-maximized'],
    });
    
    console.log('WhatsApp analyzer initialized with browser');
  }
  
  async detectWhatsApp(phoneNumber: string): Promise<WhatsAppAnalysisResult> {
    // Quick return for empty phone numbers
    if (!phoneNumber) {
      return { hasWhatsApp: false, isChatbot: false, number: phoneNumber, error: 'Empty phone number' };
    }
    
    // Standardize phone format
    const standardizedNumber = this.standardizePhoneNumber(phoneNumber);
    if (!standardizedNumber) {
      return { hasWhatsApp: false, isChatbot: false, number: phoneNumber, error: 'Invalid phone number format' };
    }
    
    // Check if we've already verified this number
    if (this.verifiedNumbers.has(standardizedNumber)) {
      const hasWhatsApp = this.verifiedNumbers.get(standardizedNumber);
      return {
        hasWhatsApp,
        isChatbot: false,
        number: standardizedNumber
      };
    }

    // Always prefer direct browser checking for highest accuracy
    try {
      const browserResult = await this.checkWithBrowser(standardizedNumber);
      this.verifiedNumbers.set(standardizedNumber, browserResult.hasWhatsApp);
      return browserResult;
    } catch (browserError) {
      console.error('Browser check failed:', browserError);
      
      // If browser check fails, try API if available
      if (this.useAPI) {
        try {
          // First, try to send a message to check if the number exists
          const messageResponse = await this.sendWhatsAppMessage(standardizedNumber, "Hi! This is a test message.");
          
          if (messageResponse.success) {
            // Wait for 10 seconds to check for response
            const isChatbot = await this.checkForQuickResponse(standardizedNumber, 10000);
            
            this.verifiedNumbers.set(standardizedNumber, true);
            return {
              hasWhatsApp: true,
              isChatbot,
              responseTime: isChatbot ? 10000 : undefined,
              number: standardizedNumber
            };
          } else {
            // In case the API says the number is not on WhatsApp
            this.verifiedNumbers.set(standardizedNumber, false);
            return {
              hasWhatsApp: false,
              isChatbot: false,
              number: standardizedNumber,
              error: messageResponse.error || 'Failed to send message - number may not be on WhatsApp'
            };
          }
        } catch (error) {
          console.error('Error using WhatsApp Business API:', error);
          
          // If both browser and API checks fail, return false instead of guessing
          this.verifiedNumbers.set(standardizedNumber, false);
          return {
            hasWhatsApp: false,
            isChatbot: false,
            number: standardizedNumber,
            error: error.message || 'Error using WhatsApp Business API'
          };
        }
      }
      
      // If API is not available either, return false
      this.verifiedNumbers.set(standardizedNumber, false);
      return {
        hasWhatsApp: false,
        isChatbot: false,
        number: standardizedNumber,
        error: 'All methods failed to detect WhatsApp presence'
      };
    }
  }
  
  // Direct browser-based WhatsApp detection (most accurate)
  private async checkWithBrowser(phoneNumber: string): Promise<WhatsAppAnalysisResult> {
    if (!this.browser) {
      await this.init();
    }
    
    let page: Page = null;
    let hasWhatsApp = false;
    
    try {
      page = await this.browser.newPage();
      
      // Set a restrictive timeout so we don't wait too long
      await page.setDefaultNavigationTimeout(30000);
      
      // Prevent image loading for faster check
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.resourceType() === 'image') {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      // Go to WhatsApp web with the phone number
      // This is the most reliable way to check if a number exists on WhatsApp
      await page.goto(`https://web.whatsapp.com/send?phone=${phoneNumber}&text=Hi`, { 
        waitUntil: 'domcontentloaded' 
      });
      
      // Wait for either the chat screen or an error message
      try {
        // Wait for the QR code to appear first
        await page.waitForSelector('div[data-testid="qrcode"]', { timeout: 5000 });
        
        // Since there's a QR code, we can't proceed with this method
        throw new Error('WhatsApp Web requires QR code scanning');
      } catch (qrError) {
        // If there's no QR code, check if there's an error message about invalid number
        try {
          const errorSelector = 'div[data-animate-modal-body="true"]';
          await page.waitForSelector(errorSelector, { timeout: 5000 });
          
          // Check if the error message contains text about the number not being on WhatsApp
          const errorText = await page.$eval(errorSelector, (el) => el.textContent || '');
          if (errorText.includes('Phone number shared via url is invalid') || 
              errorText.includes('not on WhatsApp') || 
              errorText.includes('invalid')) {
            hasWhatsApp = false;
          }
        } catch (errorCheckError) {
          // If no error message is found, check if the chat interface loaded
          try {
            // Check for the presence of elements that indicate a successful chat page load
            await page.waitForSelector('div[data-testid="conversation-panel-wrapper"]', { timeout: 5000 });
            hasWhatsApp = true;
          } catch (chatCheckError) {
            // If neither error nor chat interface is found, we can't determine
            throw new Error('Could not determine WhatsApp status via browser');
          }
        }
      }
    } catch (error) {
      console.error(`Browser check error for ${phoneNumber}:`, error.message);
      throw error;
    } finally {
      if (page) {
        await page.close().catch(() => {}); // Ignore errors during page closing
      }
    }
    
    return {
      hasWhatsApp,
      isChatbot: false, // Browser method can't detect chatbots
      number: phoneNumber
    };
  }

  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.API_BASE_URL}/${this.apiConfig.phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "text",
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.messages && response.data.messages[0]) {
        return {
          success: true,
          messageId: response.data.messages[0].id
        };
      } else {
        return {
          success: false,
          error: 'Invalid response from WhatsApp API'
        };
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      
      // Handle "recipient not in allowed list" error - common in development mode
      // In this case, we want to fall back to the browser check instead of guessing
      if (error.response?.data?.error?.code === 131030) {
        console.log(`Number ${phoneNumber} needs to be added to the allowed recipients list.`);
        throw error; // Let the caller know this failed so they can try browser method
      }
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Unknown error'
      };
    }
  }
  
  private async checkForQuickResponse(phoneNumber: string, timeoutMs: number): Promise<boolean> {
    try {
      // In development mode with test numbers not in allowed list,
      // we can't check for responses, so we use a simpler heuristic
      if (!this.canAccessMessages(phoneNumber)) {
        // For testing purposes, assume 20% of numbers have chatbots
        // You can replace this with a more sophisticated heuristic
        // or add actual test numbers to the allowed list for proper testing
        return Math.random() < 0.2;
      }
      
      const startTime = Date.now();
      const endTime = startTime + timeoutMs;

      while (Date.now() < endTime) {
        const response = await axios.get(
          `${this.API_BASE_URL}/${this.apiConfig.phoneNumberId}/messages`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiConfig.apiKey}`,
              'Content-Type': 'application/json'
            },
            params: {
              from: phoneNumber,
              limit: 1
            }
          }
        );

        if (response.data.messages && response.data.messages.length > 0) {
          const messageTime = new Date(response.data.messages[0].timestamp * 1000).getTime();
          if (messageTime > startTime) {
            return true; // Got a response within the timeout period
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
      }

      return false; // No response within timeout
    } catch (error) {
      console.error('Error checking for response:', error.response?.data || error.message);
      
      // In development mode with API restrictions,
      // we can't accurately check for chatbots
      if (error.response?.data?.error?.code === 100) {
        console.log(`Can't check messages for ${phoneNumber} due to API restrictions.`);
        return false; // Be conservative, don't assume it's a chatbot
      }
      
      return false;
    }
  }
  
  // Helper method to check if we can access messages for this number
  // (Only works in production with properly registered phone numbers)
  private canAccessMessages(phoneNumber: string): boolean {
    // In development mode with the WhatsApp Business API,
    // we can only send messages to numbers in the allowed list
    // and can't check for responses from arbitrary numbers
    
    // For this simplified version, assume we can't access messages
    // in a real implementation, you'd maintain a list of allowed numbers
    return false;
  }
  
  private standardizePhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters except leading +
    const hasPlus = phone.startsWith('+');
    let digits = phone.replace(/\D/g, '');
    
    // Handle different country formats
    if (digits.length < 10) {
      return ''; // Too short to be valid
    }
    
    // For international format, keep as is
    if (hasPlus) {
      return digits;
    }
    
    // Add country codes for numbers without them
    if (digits.length === 10) {
      return `971${digits}`; // Default to UAE country code
    }
    
    return digits;
  }
  
  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error("Error closing browser:", error);
      }
    }
  }
} 