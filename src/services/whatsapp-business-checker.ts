import { WhatsAppVerificationService } from './whatsapp-verification-service';
import { WhatsAppSenderService } from './whatsapp-sender';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WhatsAppBusinessResult {
  id: string | number;
  phone: string;
  hasWhatsApp: boolean;
  isChatbot: boolean;
  error?: string;
}

/**
 * Unified WhatsApp checking service for business data
 * Combines various methods to provide the most accurate results
 */
export class WhatsAppBusinessChecker {
  private verificationService: WhatsAppVerificationService;
  private senderService?: WhatsAppSenderService;
  private isApiConfigured: boolean;
  
  constructor(apiKey?: string, chatApiInstanceId?: string, chatApiToken?: string) {
    this.verificationService = new WhatsAppVerificationService(apiKey);
    this.isApiConfigured = !!apiKey || !!process.env.WHATSAPP_VERIFICATION_API_KEY;
    
    // Only create sender service if Chat API credentials are provided
    if (chatApiInstanceId && chatApiToken) {
      this.senderService = new WhatsAppSenderService(chatApiInstanceId, chatApiToken);
    }
  }
  
  /**
   * Check if a UAE business number is likely to have WhatsApp based on patterns
   * This is more aggressive in detecting WhatsApp for UAE numbers
   */
  public isLikelyUAEWhatsApp(phone: string): boolean {
    // Clean the phone number
    const cleanedPhone = this.cleanPhoneNumber(phone);
    if (!cleanedPhone) {
      return false;
    }
    
    // For UAE numbers
    if (cleanedPhone.startsWith('971')) {
      // UAE mobile prefixes that typically have WhatsApp
      const uaeMobilePrefixes = [
        '97150', '97152', '97154', '97155', '97156', '97158',
        '97151', '97153', '97157', '97159', '9714'
      ];
      
      // Check if the number starts with any of these prefixes
      for (const prefix of uaeMobilePrefixes) {
        if (cleanedPhone.startsWith(prefix)) {
          return true;
        }
      }
      
      // For UAE business numbers, most have WhatsApp regardless of prefix
      // Based on manual testing, most UAE business numbers can be opened in WhatsApp
      return true;
    }
    
    return false;
  }
  
  /**
   * Check WhatsApp status for a business
   */
  async checkBusiness(id: string | number, phone: string): Promise<WhatsAppBusinessResult> {
    try {
      // Start with a basic result
      const result: WhatsAppBusinessResult = {
        id,
        phone,
        hasWhatsApp: false,
        isChatbot: false
      };
      
      // Clean the phone number
      const cleanedPhone = this.cleanPhoneNumber(phone);
      if (!cleanedPhone) {
        result.error = 'Invalid phone number format';
        return result;
      }
      
      // For UAE numbers, use our more aggressive detection
      if (cleanedPhone.startsWith('971')) {
        result.hasWhatsApp = this.isLikelyUAEWhatsApp(cleanedPhone);
        if (result.hasWhatsApp) {
          return result;
        }
      }
      
      // First try API verification if configured
      if (this.isApiConfigured) {
        const apiResult = await this.verificationService.verifyNumber(cleanedPhone);
        result.hasWhatsApp = apiResult.hasWhatsApp;
        result.error = apiResult.error;
        
        // If API verification confirms WhatsApp and we have sender service,
        // check for chatbot behavior
        if (result.hasWhatsApp && this.senderService) {
          result.isChatbot = await this.checkForChatbot(cleanedPhone);
        }
        
        return result;
      }
      
      // Use the WhatsApp link method as a fallback
      const linkResult = await this.verificationService.checkWithWhatsAppLink(cleanedPhone);
      result.hasWhatsApp = linkResult.hasWhatsApp;
      result.error = linkResult.error;
      
      return result;
    } catch (error) {
      return {
        id,
        phone,
        hasWhatsApp: false,
        isChatbot: false,
        error: error.message || 'Unknown error checking WhatsApp status'
      };
    }
  }
  
  /**
   * Check multiple businesses at once
   */
  async checkBusinesses(businesses: Array<{ id: string | number, phone: string }>): Promise<WhatsAppBusinessResult[]> {
    const results: WhatsAppBusinessResult[] = [];
    
    // Process in batches to avoid overwhelming APIs
    const batchSize = 5;
    for (let i = 0; i < businesses.length; i += batchSize) {
      const batch = businesses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(business => 
        this.checkBusiness(business.id, business.phone)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < businesses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
  
  /**
   * Open the manual checker for a phone number
   */
  async openManualCheck(phone: string): Promise<void> {
    const cleanedPhone = this.cleanPhoneNumber(phone);
    if (!cleanedPhone) {
      throw new Error('Invalid phone number format');
    }
    
    // Open WhatsApp Web in the browser
    const url = `https://web.whatsapp.com/send?phone=${cleanedPhone}`;
    
    const command = process.platform === 'win32'
      ? `start ${url}`
      : (process.platform === 'darwin'
        ? `open ${url}`
        : `xdg-open ${url}`);
    
    await execAsync(command);
  }
  
  /**
   * Check if a number has chatbot behavior
   */
  private async checkForChatbot(phone: string): Promise<boolean> {
    if (!this.senderService) {
      return false;
    }
    
    try {
      // Send a test message
      const messageResult = await this.senderService.sendMessage(
        phone, 
        "Hi! This is an automated test message. Please ignore. Testing response time."
      );
      
      if (!messageResult.success || !messageResult.messageId) {
        return false;
      }
      
      // Check for quick response (within 10 seconds)
      return await this.senderService.checkForResponse(phone, messageResult.messageId, 10000);
    } catch (error) {
      console.error(`Error checking for chatbot behavior for ${phone}:`, error);
      return false;
    }
  }
  
  /**
   * Clean phone number format
   */
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters except leading +
    const hasPlus = phone.startsWith('+');
    let digits = phone.replace(/\D/g, '');
    
    if (digits.length < 10) {
      return ''; // Too short to be valid
    }
    
    // If it starts with a 0, remove it (common for local formats)
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    
    // Add country code for UAE numbers if not present
    if (digits.length === 9 && !/^\d{1,3}/.test(digits)) {
      digits = '971' + digits;
    }
    
    return digits;
  }
} 