import { WhatsAppVerificationService } from '../services/whatsapp-verification-service';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Test the third-party WhatsApp verification service
 */
async function testWhatsAppVerification() {
  console.log('Starting Third-Party WhatsApp Verification Test...');
  
  // Check if API keys are configured
  const apiKey = process.env.WHATSAPP_VERIFICATION_API_KEY;
  if (!apiKey) {
    console.warn('Warning: WHATSAPP_VERIFICATION_API_KEY not found in environment variables.');
    console.warn('You need to set it up for full testing capabilities.');
    console.warn('Get an API key from: https://apilayer.com/marketplace/number_verification-api');
  }
  
  // Create the verification service
  const verificationService = new WhatsAppVerificationService(apiKey);
  
  // Test with a mix of valid and invalid numbers
  const testNumbers = [
    // Valid UAE numbers (these should have WhatsApp)
    '+971454772728', // Babylon Gents Salon
    '+971458966279', // THT - That Hair Tho
    
    // Invalid numbers (these should NOT have WhatsApp)
    '+9714000000', // Too short UAE number
    '+97111111111111', // Too long UAE number
    
    // Another valid UAE number
    '+971553990010', // Paulista Beauty Salon
  ];
  
  console.log('Testing the following numbers:');
  testNumbers.forEach((num, i) => console.log(`${i+1}. ${num}`));
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const phoneNumber of testNumbers) {
    console.log(`\nTesting ${phoneNumber}...`);
    try {
      // Try the WhatsApp Link method (works without API key)
      const result = await verificationService.checkWithWhatsAppLink(phoneNumber);
      
      if (result.hasWhatsApp) {
        successCount++;
        console.log(`✅ ${phoneNumber} IS on WhatsApp`);
      } else if (result.error) {
        failureCount++;
        console.log(`❓ ${phoneNumber} check failed: ${result.error}`);
      } else {
        failureCount++;
        console.log(`❌ ${phoneNumber} is NOT on WhatsApp`);
      }
    } catch (error) {
      console.error(`Error testing ${phoneNumber}:`, error);
      failureCount++;
    }
  }
  
  console.log('\n----------- TEST SUMMARY -----------');
  console.log(`Total tested: ${testNumbers.length}`);
  console.log(`WhatsApp detected: ${successCount}`);
  console.log(`WhatsApp not detected or errors: ${failureCount}`);
  console.log('----------------------------------');
  console.log('Third-party WhatsApp verification test completed.');
}

// Run the test when this file is executed directly
if (require.main === module) {
  testWhatsAppVerification().catch(console.error);
}

export { testWhatsAppVerification }; 