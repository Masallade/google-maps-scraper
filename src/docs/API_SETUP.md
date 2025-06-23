# Setting Up WhatsApp Verification API Keys

To use the WhatsApp verification features, you'll need to set up API keys for third-party services.

## Environment Variables

Create a `.env` file in the root of your project with the following variables:

```
# Third-party WhatsApp verification API key
# Get from: https://apilayer.com/marketplace/number_verification-api
WHATSAPP_VERIFICATION_API_KEY=your_api_key_here

# Chat API for WhatsApp sending (https://chat-api.com)
CHAT_API_INSTANCE_ID=your_instance_id_here
CHAT_API_TOKEN=your_token_here
```

## API Service Options

### 1. Number Verification API (APILayer)

This service is used for checking if a phone number is valid and potentially has WhatsApp.

1. Go to [APILayer Number Verification API](https://apilayer.com/marketplace/number_verification-api)
2. Sign up for an account
3. Subscribe to the API (they have a free tier)
4. Copy your API key to `WHATSAPP_VERIFICATION_API_KEY` in your .env file

### 2. Chat API

This service allows you to send and receive WhatsApp messages without a physical device.

1. Go to [Chat API](https://chat-api.com)
2. Sign up for an account and select a plan
3. Set up your instance
4. Get your Instance ID and Token
5. Set them as `CHAT_API_INSTANCE_ID` and `CHAT_API_TOKEN` in your .env file

## Running Tests

After setting up your API keys, you can run the tests:

```bash
npm run test:third-party
```

## Additional Options

If you don't want to use third-party APIs, you can still use the manual check method:

```bash
npm run manual-check
```

This will open WhatsApp Web pages for the numbers you want to check, allowing you to visually verify whether they have WhatsApp accounts. 