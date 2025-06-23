import { WhatsAppBusinessChecker } from '../services/whatsapp-business-checker';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create singleton instance
let businessCheckerInstance: WhatsAppBusinessChecker | null = null;

/**
 * Get the WhatsApp business checker instance
 */
export function getWhatsAppChecker(): WhatsAppBusinessChecker {
  if (!businessCheckerInstance) {
    // Try to load API keys from environment
    const apiKey = process.env.WHATSAPP_VERIFICATION_API_KEY;
    const chatApiInstanceId = process.env.CHAT_API_INSTANCE_ID;
    const chatApiToken = process.env.CHAT_API_TOKEN;
    
    businessCheckerInstance = new WhatsAppBusinessChecker(apiKey, chatApiInstanceId, chatApiToken);
  }
  return businessCheckerInstance;
}

/**
 * Check if a business phone has WhatsApp
 * This is the main method to use in the UI
 */
export async function checkBusinessWhatsApp(id: string | number, phone: string): Promise<boolean> {
  try {
    if (!phone || phone === '+971') {
      return false;
    }
    
    const checker = getWhatsAppChecker();
    const result = await checker.checkBusiness(id, phone);
    
    return result.hasWhatsApp;
  } catch (error) {
    console.error(`Error checking WhatsApp for ${phone}:`, error);
    return false;
  }
}

/**
 * Perform manual WhatsApp check by opening WhatsApp Web
 */
export async function openWhatsAppManualCheck(phone: string): Promise<void> {
  try {
    const checker = getWhatsAppChecker();
    await checker.openManualCheck(phone);
  } catch (error) {
    console.error(`Error opening WhatsApp for ${phone}:`, error);
  }
}

/**
 * Batch check WhatsApp status for multiple businesses
 */
export async function batchCheckWhatsApp(
  businesses: Array<{ id: string | number, phone: string }>
): Promise<Map<string | number, boolean>> {
  const results = new Map<string | number, boolean>();
  
  try {
    const checker = getWhatsAppChecker();
    const checkerResults = await checker.checkBusinesses(
      businesses.filter(b => b.phone && b.phone !== '+971')
    );
    
    for (const result of checkerResults) {
      results.set(result.id, result.hasWhatsApp);
    }
  } catch (error) {
    console.error('Error in batch WhatsApp check:', error);
  }
  
  return results;
}

/**
 * Check if a UAE number is likely to have WhatsApp
 * Quick synchronous check without API calls
 */
export function isLikelyUAEWhatsApp(phone: string): boolean {
  const checker = getWhatsAppChecker();
  return checker.isLikelyUAEWhatsApp(phone);
} 