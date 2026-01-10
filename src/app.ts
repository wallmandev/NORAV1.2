import express from 'express';
import dotenv from 'dotenv';
import { CrawlerService } from './services/crawlerService';
import { RagService } from './services/ragService';
import { chatController } from './controllers/chatController'; // Ny import

dotenv.config();

const app = express();
app.use(express.json());

// Initiera tjänster
const crawlerService = new CrawlerService();
const ragService = new RagService();

const PORT = process.env.PORT || 3000;

/**
 * Endpoint: /api/ingest
 * Beskrivning: Tar emot en URL, crawlar sajten och indexerar innehållet.
 * Body: { "url": "https://example.com", "companyId": "unique-session-id" }
 */
app.post('/api/ingest', async (req, res) => {
  try {
    const { url, companyId } = req.body;

    if (!url || !companyId) {
       res.status(400).json({ error: "URL and companyId are required" });
       return;
    }

    console.log(`Received ingest request for ${url} (Company: ${companyId})`);

    // 1. Crawla sajten
    // För MVP begränsar vi till 5 sidor för snabbhet
    const crawledData = await crawlerService.crawlWebsite(url, 5);

    // 2. Bearbeta och spara i vektordatabas
    if (crawledData && crawledData.length > 0) {
      await ragService.processAndStoreDocuments(crawledData, companyId);
      res.json({ success: true, message: "Ingestion complete", pagesProcessed: crawledData.length });
    } else {
      res.status(500).json({ error: "No data found during crawl" });
    }

  } catch (error: any) {
    console.error("Ingestion error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

/**
 * Endpoint: /api/chat
 * Beskrivning: Tar emot en fråga, hämtar kontext och genererar svar.
 * Body: { "message": "Vad gör ni?", "companyId": "unique-session-id" }
 */
app.post('/api/chat', chatController);

app.listen(PORT, () => {
  console.log(`NORA Server is running on port ${PORT}`);
});
