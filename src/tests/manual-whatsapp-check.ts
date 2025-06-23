/**
 * Manual WhatsApp Check Utility
 * 
 * This script provides manual instructions for checking WhatsApp numbers
 * when automated methods don't work consistently.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Function to open WhatsApp Web with a phone number
function openWhatsappWeb(phoneNumber: string): Promise<void> {
  const url = `https://web.whatsapp.com/send?phone=${phoneNumber}`;
  
  // Command to open URL in default browser
  const command = process.platform === 'win32'
    ? `start ${url}`
    : (process.platform === 'darwin'
      ? `open ${url}`
      : `xdg-open ${url}`);
  
  return execAsync(command)
    .then(() => console.log(`Opening WhatsApp Web for ${phoneNumber}...`))
    .catch(err => console.error(`Error opening browser: ${err.message}`));
}

// Function to display checking instructions
function displayInstructions() {
  console.log(`
============= MANUAL WHATSAPP CHECK =============

INSTRUCTIONS:
1. Enter the phone number when prompted
2. A browser will open to WhatsApp Web with that number
3. Observe the WhatsApp Web interface:
   - If you see a chat window: NUMBER HAS WHATSAPP
   - If you see an error: NUMBER DOES NOT HAVE WHATSAPP

NOTE: You may need to log in to WhatsApp Web first

=================================================
  `);
}

// Function to prompt for a phone number
function promptForPhoneNumber(): Promise<string> {
  process.stdout.write('Enter phone number (with country code, no spaces): ');
  return new Promise(resolve => {
    process.stdin.once('data', data => {
      const input = data.toString().trim();
      resolve(input.replace(/\+/g, ''));
    });
  });
}

// Main function
async function manualWhatsAppCheck() {
  displayInstructions();
  
  // List of test numbers to check
  const testNumbers = [
    '971454772728', // Babylon Gents Salon
    '971458966279', // THT - That Hair Tho
    '971553990010', // Paulista Beauty Salon
  ];

  console.log('\nReady to check these numbers:');
  testNumbers.forEach((num, i) => console.log(`${i+1}. ${num}`));
  
  let checkMore = true;
  while (checkMore) {
    const input = await promptForPhoneNumber();
    
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      checkMore = false;
      continue;
    }
    
    if (!input) {
      console.log('Please enter a valid phone number');
      continue;
    }
    
    await openWhatsappWeb(input);
    console.log('\nCheck if the number is on WhatsApp in the browser window');
    console.log('Enter another number or type "exit" to quit\n');
  }
  
  console.log('Manual check completed!');
}

// Run the manual check if this script is called directly
if (require.main === module) {
  manualWhatsAppCheck().catch(console.error);
}

export { manualWhatsAppCheck }; 