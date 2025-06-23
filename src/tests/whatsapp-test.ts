import { checkBusinessWhatsApp, closeWhatsAppAnalyzer } from '../utils/business-whatsapp-checker';

/**
 * Simple test function to verify WhatsApp detection
 */
async function testWhatsAppDetection() {
  try {
    console.log('Starting WhatsApp detection test...');
    
    // Test with a few UAE numbers - update these with real numbers you want to test
    // Format: '+971XXXXXXXXX'
    // Example: Hair salons in Dubai from your previous search results
    const testNumbers = [
      '+971454772728', // Babylon Gents Salon
      '+971458966279', // THT - That Hair Tho
      '+971553990010', // Paulista Beauty Salon
      '+971477070768', // Nicolas Salon
      '+971433313568', // Boho Salon
    ];
    
    console.log('Testing the following numbers:', testNumbers);
    console.log('This may take a few minutes for accurate results...');
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const phone of testNumbers) {
      console.log(`\nTesting ${phone}...`);
      try {
        const result = await checkBusinessWhatsApp(phone, true, false);
        console.log(`Result for ${phone}:`, result);
        
        if (result.hasWhatsApp) {
          successCount++;
          console.log(`✅ ${phone} IS on WhatsApp`);
        } else {
          failureCount++;
          console.log(`❌ ${phone} is NOT on WhatsApp`);
        }
      } catch (error) {
        console.error(`Error testing ${phone}:`, error);
        failureCount++;
      }
    }
    
    console.log('\n----------- TEST SUMMARY -----------');
    console.log(`Total tested: ${testNumbers.length}`);
    console.log(`WhatsApp detected: ${successCount}`);
    console.log(`WhatsApp not detected: ${failureCount}`);
    console.log('----------------------------------');
    console.log('\nWhatsApp detection test completed.');
  } catch (error) {
    console.error('Error during WhatsApp detection test:', error);
  } finally {
    await closeWhatsAppAnalyzer();
  }
}

// Run the test when this file is executed directly
if (require.main === module) {
  testWhatsAppDetection().catch(console.error);
}

export { testWhatsAppDetection }; 