import { batchCheckWhatsApp, closeWhatsAppAnalyzer } from '../utils/business-whatsapp-checker';

// Interface for business search results
export interface BusinessSearchResult {
  id: string | number;
  name: string;
  phone: string;
  address: string;
  category: string;
  rating: number;
  reviews: number;
  website?: string;
  hasWhatsApp?: boolean;
  isChatbot?: boolean;
}

// Interface for search options
export interface SearchOptions {
  keyword?: string;
  location?: string;
  country?: string;
  city?: string;
  minRating?: number;
  maxRating?: number;
  maxReviews?: number;
  excludeVerified?: boolean;
  checkWhatsApp?: boolean;
  strictWhatsAppDetection?: boolean;
  detectChatbots?: boolean;
}

// A class to handle business searches
export class SearchService {
  private isSearching: boolean = false;
  private shouldStop: boolean = false;
  private results: BusinessSearchResult[] = [];
  private listeners: ((results: BusinessSearchResult[]) => void)[] = [];

  // Add a listener for search result updates
  public addListener(listener: (results: BusinessSearchResult[]) => void): void {
    this.listeners.push(listener);
  }

  // Remove a listener
  public removeListener(listener: (results: BusinessSearchResult[]) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Notify all listeners with updated results
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener([...this.results]);
    }
  }

  // Start a search with given options
  public async startSearch(options: SearchOptions): Promise<void> {
    if (this.isSearching) {
      return;
    }

    this.isSearching = true;
    this.shouldStop = false;
    this.results = [];
    this.notifyListeners();

    try {
      // Fetch initial results (implementation depends on your Google Maps scraping logic)
      await this.fetchResults(options);

      // Check WhatsApp if requested
      if (options.checkWhatsApp && this.results.length > 0) {
        await this.checkWhatsAppPresence(options.strictWhatsAppDetection, options.detectChatbots);
      }
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      this.isSearching = false;
    }
  }

  // Stop an ongoing search
  public stopSearch(): void {
    this.shouldStop = true;
  }

  // Fetch results from Google Maps (implementation depends on your scraping logic)
  private async fetchResults(options: SearchOptions): Promise<void> {
    // This is a placeholder for your actual implementation
    // You'll need to replace this with your Google Maps scraping code
    console.log('Searching with options:', options);

    // Mock results for demonstration
    // Replace this with your actual data fetching logic
    const mockResults: BusinessSearchResult[] = [
      // Sample data will be replaced with actual implementation
    ];

    this.results = mockResults;
    this.notifyListeners();
  }

  // Check WhatsApp presence for all businesses in the results
  private async checkWhatsAppPresence(strictMode: boolean = true, checkChatbots: boolean = false): Promise<void> {
    if (this.results.length === 0) {
      return;
    }

    // Prepare business data for batch checking
    const businesses = this.results.map(business => ({
      id: business.id,
      phone: business.phone
    }));

    // Check WhatsApp in batches
    const whatsappResults = await batchCheckWhatsApp(businesses, strictMode, checkChatbots);

    // Update results with WhatsApp information
    this.results = this.results.map(business => {
      const whatsappInfo = whatsappResults.get(business.id);
      if (whatsappInfo) {
        return {
          ...business,
          hasWhatsApp: whatsappInfo.hasWhatsApp,
          isChatbot: whatsappInfo.isChatbot
        };
      }
      return business;
    });

    // Notify listeners of updated results
    this.notifyListeners();
  }

  // Clean up resources when done
  public async cleanup(): Promise<void> {
    await closeWhatsAppAnalyzer();
  }
} 