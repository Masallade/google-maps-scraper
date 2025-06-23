import { WhatsAppBusinessChecker } from '../services/whatsapp-business-checker';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Test the WhatsApp business checker with Google Maps data
 */
async function testWhatsAppBusinessChecker() {
  console.log('Starting WhatsApp Business Checker Test...');
  
  // Load API keys from environment variables
  const apiKey = process.env.WHATSAPP_VERIFICATION_API_KEY;
  const chatApiInstanceId = process.env.CHAT_API_INSTANCE_ID;
  const chatApiToken = process.env.CHAT_API_TOKEN;
  
  // Initialize checker with available credentials
  const checker = new WhatsAppBusinessChecker(apiKey, chatApiInstanceId, chatApiToken);
  
  // Test with sample business data from Google Maps
  const businesses = [
    { id: '1', name: 'MK Barber Shop', phone: '+97143339005' },
    { id: '2', name: 'Hair Artist Men\'s Salon', phone: '+971' }, // Missing in screenshot
    { id: '3', name: 'THT - That Hair Tho', phone: '+971' }, // Missing in screenshot
    { id: '4', name: 'Paulista Beauty Salon', phone: '+971553990010' },
    { id: '5', name: 'Nicolas Salon', phone: '+971477070768' },
    { id: '6', name: 'Boho Salon', phone: '+971433135680' },
    { id: '7', name: 'Freya Ladies Beauty', phone: '+971521956629' },
    { id: '8', name: 'Ashwina Hair & Beauty Salon', phone: '+971435170005' }
  ];
  
  console.log(`Testing ${businesses.length} businesses for WhatsApp presence...`);
  
  // First test individual business checking
  console.log('\n--- Testing individual business check ---');
  const testBusiness = businesses[2]; // Paulista Beauty Salon
  console.log(`Checking ${testBusiness.name} (${testBusiness.phone})...`);
  const singleResult = await checker.checkBusiness(testBusiness.id, testBusiness.phone);
  console.log('Result:', singleResult);
  
  // Now test batch checking
  console.log('\n--- Testing batch business check ---');
  const results = await checker.checkBusinesses(businesses.map(b => ({ id: b.id, phone: b.phone })));
  
  // Display results
  console.log('\nResults:');
  for (let i = 0; i < results.length; i++) {
    const business = businesses.find(b => b.id === results[i].id);
    console.log(`${business?.name} (${results[i].phone}): `, 
      results[i].hasWhatsApp ? '✅ Has WhatsApp' : '❌ No WhatsApp',
      results[i].isChatbot ? ' (Chatbot)' : '',
      results[i].error ? ` - Error: ${results[i].error}` : ''
    );
  }
  
  console.log('\nStatistics:');
  const whatsappCount = results.filter(r => r.hasWhatsApp).length;
  const chatbotCount = results.filter(r => r.isChatbot).length;
  const errorCount = results.filter(r => r.error).length;
  
  console.log(`Total businesses: ${results.length}`);
  console.log(`With WhatsApp: ${whatsappCount} (${Math.round(whatsappCount/results.length*100)}%)`);
  console.log(`Chatbots: ${chatbotCount} (${Math.round(chatbotCount/whatsappCount*100 || 0)}% of WhatsApp users)`);
  console.log(`Errors: ${errorCount}`);
  
  console.log('\nWhatsApp Business Checker Test Completed');
}

// Run the test when this file is executed directly
if (require.main === module) {
  testWhatsAppBusinessChecker().catch(console.error);
}

export { testWhatsAppBusinessChecker }; 