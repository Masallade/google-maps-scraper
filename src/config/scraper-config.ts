import { ScraperSettings } from '../helpers/enhanced-google-map-scraper';

// Default configuration for the scraper
export const defaultScraperConfig: ScraperSettings = {
  useProxies: false,           // Whether to use proxy rotation
  headlessBrowser: false,      // Whether to run in headless mode (no UI)
  maxConcurrentBrowsers: 1,    // How many browser instances to run at once
  requestDelay: 2000,          // Delay between requests in milliseconds
  maxRestarts: 5,              // Maximum number of browser restarts before giving up
  userAgentRotation: true      // Whether to rotate user agents
};

// Common user agents for rotation to avoid detection
export const userAgents = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
  
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
  
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  
  // Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
  
  // Safari on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  
  // Mobile User Agents
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36'
];

// Sample proxy list - you would replace these with your actual proxies
export const sampleProxies = [
  {
    host: '123.456.789.0',
    port: 8080,
    username: 'user1',
    password: 'pass1'
  },
  {
    host: '234.567.890.1',
    port: 3128,
    username: 'user2',
    password: 'pass2'
  }
];

// Configuration for search result caching
export const cacheConfig = {
  enabled: true,
  expirationDays: 7,  // Cache results for 7 days
  maxEntries: 1000    // Maximum number of entries in the cache
};

// Retry settings
export const retryConfig = {
  maxAttempts: 3,
  delays: [1000, 3000, 5000]  // Increasing delays between retries
};

// User detection avoidance settings
export const stealthConfig = {
  randomizeViewport: true,
  emulateTouchEvents: true,
  simulateHumanBehavior: true,
  randomizeHeaders: true
}; 