import axios from 'axios';
import { WhatsAppVerificationService } from './whatsapp-verification-service';

interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppMessage {
  id: string;
  body: string;
  fromMe: boolean;
  chatId: string;
  timestamp: number;
  type: string;
}

/**
 * Service for sending WhatsApp messages using third-party APIs
 */
export class WhatsAppSenderService {
  private instanceId: string;
  private token: string;
  private verificationService: WhatsAppVerificationService;
  
  constructor(instanceId?: string, token?: string) {
    // You'll need to sign up for Chat API (https://chat-api.com)
    this.instanceId = instanceId || process.env.CHAT_API_INSTANCE_ID || '';
    this.token = token || process.env.CHAT_API_TOKEN || '';
    this.verificationService = new WhatsAppVerificationService();
  }
  
  /**
   * Send a WhatsApp message to a phone number
   * @param phoneNumber Phone number to send to
   * @param message Message to send
   * @returns Promise resolving to message result
   */
  async sendMessage(phoneNumber: string, message: string): Promise<MessageResult> {
    // Clean the phone number
    const cleanedNumber = this.cleanPhoneNumber(phoneNumber);
    if (!cleanedNumber) {
      return { success: false, error: 'Invalid phone number format' };
    }
    
    // First check if the number has WhatsApp
    const verificationResult = await this.verificationService.verifyNumber(cleanedNumber);
    if (!verificationResult.hasWhatsApp) {
      return { 
        success: false, 
        error: 'Phone number does not have WhatsApp' 
      };
    }
    
    // Then send the message
    try {
      return await this.sendWithChatApi(cleanedNumber, message);
    } catch (error) {
      console.error(`Error sending WhatsApp message to ${cleanedNumber}:`, error);
      return { success: false, error: error.message || 'Failed to send message' };
    }
  }
  
  /**
   * Clean and format a phone number
   */
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    let digits = phone.replace(/\D/g, '');
    
    // Handle different country formats
    if (digits.length < 10) {
      return ''; // Too short to be valid
    }
    
    // If it starts with a 0, remove it
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }
    
    // Add country code for UAE numbers if not present
    if (digits.length === 9 && !digits.startsWith('971')) {
      digits = '971' + digits;
    }
    
    return digits;
  }
  
  /**
   * Send a message using Chat API
   */
  private async sendWithChatApi(phoneNumber: string, message: string): Promise<MessageResult> {
    if (!this.instanceId || !this.token) {
      return { success: false, error: 'Chat API credentials not configured' };
    }
    
    try {
      const response = await axios.post(
        `https://api.chat-api.com/instance${this.instanceId}/sendMessage`,
        {
          phone: phoneNumber,
          body: message
        },
        {
          params: { token: this.token }
        }
      );
      
      if (response.data && response.data.sent) {
        return {
          success: true,
          messageId: response.data.id || undefined
        };
      }
      
      return {
        success: false,
        error: response.data?.message || 'Failed to send message'
      };
    } catch (error) {
      console.error('Chat API send error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  /**
   * Check if a message got a response (to detect chatbots)
   * @param phoneNumber Phone number to check
   * @param messageId Message ID to check for replies
   * @param timeoutMs Maximum time to wait for response in milliseconds
   */
  async checkForResponse(phoneNumber: string, messageId: string, timeoutMs: number = 10000): Promise<boolean> {
    if (!this.instanceId || !this.token) {
      return false;
    }
    
    const cleanedNumber = this.cleanPhoneNumber(phoneNumber);
    if (!cleanedNumber) {
      return false;
    }
    
    const startTime = Date.now();
    const endTime = startTime + timeoutMs;
    
    try {
      // Check for messages every second until timeout
      while (Date.now() < endTime) {
        const response = await axios.get(
          `https://api.chat-api.com/instance${this.instanceId}/messages`,
          {
            params: {
              token: this.token,
              phone: cleanedNumber,
              count: 10,
              min_time: Math.floor(startTime / 1000)
            }
          }
        );
        
        if (response.data && response.data.messages && response.data.messages.length > 0) {
          // Filter messages from the target number
          const receivedMessages = response.data.messages.filter((msg: WhatsAppMessage) => 
            msg.fromMe === false && msg.chatId.includes(cleanedNumber)
          );
          
          if (receivedMessages.length > 0) {
            return true; // Got a response
          }
        }
        
        // Wait for 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return false; // No response within timeout
    } catch (error) {
      console.error('Error checking for response:', error);
      return false;
    }
  }
} 