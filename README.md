# Google Maps Business Scraper with WhatsApp Analyzer

This application scrapes business information from Google Maps and analyzes their WhatsApp presence.

## WhatsApp Business API Setup

The application uses the WhatsApp Business API to detect if phone numbers are on WhatsApp and if they use chatbots.

### Setup Instructions

1. **Create a Meta Developer Account**
   - Go to [Meta for Developers](https://developers.facebook.com/)
   - Sign up or log in

2. **Create a WhatsApp Business App**
   - Go to My Apps
   - Create a new app with the WhatsApp API product

3. **Set up Phone Number**
   - Add a phone number for your business
   - Complete verification

4. **Create Permanent Access Token**
   - Go to System User
   - Create a permanent token with whatsapp_business_messaging permission

5. **Add Test Phone Numbers (Development Mode)**
   - During development, WhatsApp Business API has restrictions
   - Only verified test phone numbers can receive messages
   - To add test numbers:
     1. Go to WhatsApp > Configuration > Phone numbers
     2. Click on your registered phone number
     3. Go to the "API Setup" tab
     4. Find "Test Numbers" section
     5. Add up to 5 phone numbers for testing
   - Format numbers as: +[country code][number] (e.g., +971501234567)

6. **Update Configuration**
   - Update `src/config/whatsapp-config.ts` with your:
     - API Key (permanent access token)
     - Phone Number ID
     - Business Account ID
     - App ID

### Test Your Setup

Run the WhatsApp test to ensure everything is working:

```bash
npm run test:whatsapp
```

## Running the Application

To start the application:

```bash
npm start
```

## Features

- Search businesses by keyword and location
- Filter by rating and other criteria
- Detect WhatsApp presence
- Identify WhatsApp chatbots
- Export results 