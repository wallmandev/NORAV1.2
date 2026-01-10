import { NextResponse } from 'next/server';
import { CrawlerService } from '@/services/crawlerService';
import { RagService } from '@/services/ragService';

export const runtime = 'nodejs'; // Use nodejs runtime for heavier tasks if needed, though edge works for streaming usually. Stick to default or force nodejs for langchain stuff.

export async function POST(req: Request) {
  const body = await req.json();
  const { url, companyId } = body;

  if (!url || !companyId) {
    return new Response(JSON.stringify({ error: "URL and companyId are required" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const crawlerService = new CrawlerService();
        const ragService = new RagService();

        // 1. Crawla
        console.log(`Starting crawl for ${url}`);
        const crawledData = await crawlerService.crawlWebsite(url, 5);
        
        // Skicka "scraped"-event
        const count = crawledData ? crawledData.length : 0;
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'scraped', count, pages: crawledData }) + '\n'));

        // 2. Bearbeta och spara
        if (count > 0) {
          await ragService.processAndStoreDocuments(crawledData, companyId);
        }

        // Skicka "complete"-event
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'complete' }) + '\n'));
        controller.close();

      } catch (error: any) {
        console.error("Ingestion error:", error);
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error: error.message }) + '\n'));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json', // Or 'text/event-stream' technically, but doing json stream is fine here
      'Transfer-Encoding': 'chunked',
    },
  });
}
