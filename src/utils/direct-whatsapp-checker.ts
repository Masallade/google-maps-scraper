import https from 'https';
import axios from 'axios';

/**
 * Check if a phone number has WhatsApp using WhatsApp's API
 * This approach is simpler but more reliable
 * 
 * @param phoneNumber The phone number to check (with country code, no + symbol)
 * @returns Promise resolving to true if the number is on WhatsApp, false otherwise
 */
export async function checkWhatsAppDirectly(phoneNumber: string): Promise<boolean> {
  // Validate and clean the phone number
  const cleanedNumber = cleanPhoneNumber(phoneNumber);
  if (!cleanedNumber) {
    console.error('Invalid phone number format');
    return false;
  }
  
  // Validate the phone number format
  if (!isValidPhoneNumber(cleanedNumber)) {
    console.error('Invalid phone number format or length');
    return false;
  }
  
  try {
    // For real UAE business numbers with proper country code
    if (cleanedNumber.startsWith('971') && cleanedNumber.length >= 11 && cleanedNumber.length <= 14) {
      // Use the direct API method which is most reliable
      return await checkUsingWhatsAppApi(cleanedNumber);
    }
    
    // For all other numbers, return false to be safe
    return false;
  } catch (error) {
    console.error(`Error checking WhatsApp status for ${cleanedNumber}:`, error);
    return false;
  }
}

/**
 * Clean and format phone number for WhatsApp checking
 */
function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let digits = phone.replace(/\D/g, '');
  
  // Handle different country formats
  if (digits.length < 10) {
    return ''; // Too short to be valid
  }
  
  return digits;
}

/**
 * Validate phone number format and length
 * Phone numbers should be between 10 and 15 digits according to international standards
 */
function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Numbers should be 10-15 digits
  if (phone.length < 10 || phone.length > 15) {
    return false;
  }
  
  // Should contain only digits
  if (!/^\d+$/.test(phone)) {
    return false;
  }
  
  // For UAE numbers (our target market)
  if (phone.startsWith('971')) {
    return phone.length >= 11 && phone.length <= 14;
  }
  
  // For other countries, be more conservative
  return false;
}

/**
 * Check WhatsApp status using WhatsApp's API
 * This is the most reliable method
 */
async function checkUsingWhatsAppApi(phoneNumber: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Use a direct API call to WhatsApp's own service
    const options = {
      method: 'HEAD',
      hostname: 'api.whatsapp.com',
      path: `/send?phone=${phoneNumber}`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000, // 10 second timeout
    };
    
    const req = https.request(options, (res) => {
      // If we're redirected to the chat screen, the number exists
      // Status code 302 is a redirect, which WhatsApp uses when the number exists
      const hasWhatsApp = res.statusCode === 302 && 
                         res.headers.location && 
                         res.headers.location.includes('web.whatsapp.com/send');
      
      resolve(hasWhatsApp);
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy(new Error('Request timed out'));
    });
    
    req.end();
  });
} 