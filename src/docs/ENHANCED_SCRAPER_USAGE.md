# Enhanced Google Maps Scraper - Usage Guide

This document explains how to use the enhanced Google Maps scraper with its robust features for continuous operation.

## Features

- **Proxy Rotation**: Use multiple IP addresses to avoid rate limiting and blocking
- **Session Management**: Resume scraping from where you left off
- **Browser Recovery**: Automatically recover from browser crashes
- **Request Queuing**: Properly manage concurrent requests with rate limiting
- **Robust Error Handling**: Gracefully recover from various error conditions
- **WhatsApp Detection**: Improved reliability in detecting WhatsApp presence

## Configuration

You can configure the scraper using the settings in `src/config/scraper-config.ts`:

```typescript
// Example configuration
import { ScraperSettings } from '../helpers/enhanced-google-map-scraper';
import { defaultScraperConfig } from '../config/scraper-config';

// Create with all default settings
const scraper = new EnhancedGoogleMapScraper();

// Or customize the settings
const customScraper = new EnhancedGoogleMapScraper({
  useProxies: true,               // Enable proxy rotation
  headlessBrowser: true,          // Run in headless mode
  maxConcurrentBrowsers: 2,       // Run 2 browser instances
  requestDelay: 3000,             // Wait 3 seconds between requests
  maxRestarts: 10,                // Allow up to 10 browser restarts
  userAgentRotation: true         // Enable user agent rotation
});
```

## Using Proxies

To add proxies for rotation:

```typescript
import { ProxyConfig } from '../helpers/proxy-manager';

// Add proxies programmatically
const proxies: ProxyConfig[] = [
  {
    host: "123.45.67.89",
    port: 8080,
    username: "user", // Optional
    password: "pass"  // Optional
  },
  // Add more proxies as needed
];

// Add each proxy to the manager
proxies.forEach(proxy => scraper.proxyManager.addProxy(proxy));
```

## Continuous Operation

For continuous operation, you should implement:

1. **Scheduled Scraping**: Set up a scheduler to run scraping tasks at specific intervals
2. **Error Monitoring**: Monitor and handle errors that may occur during scraping
3. **Resource Management**: Ensure proper cleanup of resources after each run

Example:

```typescript
async function runContinuousScraping() {
  const scraper = new EnhancedGoogleMapScraper({
    headlessBrowser: true,
    useProxies: true
  });
  
  try {
    // Start scraping
    await scraper.startScrapping(event, {
      query: "restaurants",
      city: "New York"
    }, {
      minRating: 4.0,
      requiresWhatsApp: true
    });
    
    // Schedule next run (e.g., after 1 hour)
    setTimeout(runContinuousScraping, 60 * 60 * 1000);
    
  } catch (error) {
    console.error("Scraping error:", error);
    
    // Wait before retrying (e.g., after 15 minutes)
    setTimeout(runContinuousScraping, 15 * 60 * 1000);
  }
}

// Start the continuous scraping
runContinuousScraping();
```

## Session Management

The enhanced scraper automatically manages sessions, allowing you to resume scraping from where you left off:

```typescript
// Get active sessions
const activeSessions = scraper.sessionManager.getActiveSessions();

// Resume a specific session
if (activeSessions.length > 0) {
  const sessionId = activeSessions[0].id;
  scraper.resumeSession(sessionId, event);
}
```

## Best Practices for Continuous Operation

1. **Rotate User Agents**: Enable user agent rotation to avoid detection
2. **Use Multiple Proxies**: Have at least 5-10 proxies for effective rotation
3. **Implement Cooling Periods**: Add delays between scraping runs
4. **Monitor Proxy Health**: Regularly test and remove non-working proxies
5. **Handle Rate Limiting**: Detect when you're being rate-limited and pause operations
6. **Implement Graceful Shutdown**: Properly shut down all resources on application exit

## Troubleshooting

Common issues and their solutions:

1. **Browser crashes frequently**: 
   - Increase memory allocation for the Node.js process
   - Use headless mode to reduce resource usage

2. **Getting blocked by Google**:
   - Add more proxies
   - Increase delays between requests
   - Use premium residential proxies

3. **WhatsApp detection failing**:
   - Ensure the WhatsApp Business API is properly configured
   - Try using browser-based detection as a fallback

4. **High CPU/memory usage**:
   - Reduce concurrent browser instances
   - Enable headless mode
   - Implement regular browser restarts

## Maintenance Requirements

To keep the scraper working properly over time:

1. Update selectors as Google Maps changes its UI
2. Refresh proxies regularly
3. Update Puppeteer and its stealth plugins
4. Monitor WhatsApp API for changes in their detection methods

## Legal Considerations

Remember that scraping may violate terms of service. Use this tool responsibly and at your own risk. Consider using official APIs where available. 