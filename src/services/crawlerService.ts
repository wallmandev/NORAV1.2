import FirecrawlApp from '@mendable/firecrawl-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service to handle crawling of websites using Firecrawl API.
 */
export class CrawlerService {
  private app: FirecrawlApp;

  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not defined in environment variables.");
    }
    this.app = new FirecrawlApp({ apiKey });
  }

  /**
   * Crawls a URL and returns the content in Markdown format.
   * Can be configured to crawl subpages or just a single page.
   * 
   * @param url The URL to crawl
   * @param limit Max number of pages to crawl (default 10)
   */
  async crawlWebsite(url: string, limit: number = 10): Promise<any> {
    try {
      console.log(`Starting crawl for: ${url} with limit: ${limit}`);
      
      const crawlResponse = await this.app.crawl(url, {
        limit: limit,
        scrapeOptions: {
          formats: ['markdown'],
        },
      });

      if (crawlResponse.status !== 'completed') {
        throw new Error(`Failed to crawl URL. Status: ${crawlResponse.status}`);
      }

      console.log(`Successfully crawled ${crawlResponse.data.length} pages.`);
      return crawlResponse.data;
    } catch (error) {
      console.error("Error in crawlWebsite:", error);
      throw error;
    }
  }

  /**
   * Scrapes a single URL to get markdown content specifically.
   * Useful for quick lookups or precise page reading.
   */
  async scrapePage(url: string): Promise<string> {
    try {
      const scrapeResponse = await this.app.scrape(url, {
        formats: ['markdown'],
      });

      // I V2 kastar scrape ofta fel direkt eller returnerar ett objekt.
      // Kontrollera om markdown finns.
      if (!scrapeResponse.markdown) {
        throw new Error(`Failed to scrape URL or no markdown found.`);
      }

      return scrapeResponse.markdown || "";
    } catch (error) {
      console.error("Error in scrapePage:", error);
      throw error;
    }
  }
}
