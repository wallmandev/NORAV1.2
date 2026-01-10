import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'; // Uppdaterad import
import dotenv from 'dotenv';

dotenv.config();

export interface SearchResult {
  content: string;
  metadata: any;
  similarity: number;
}

export class RagService {
  private supabase: SupabaseClient;
  private embeddings: OpenAIEmbeddings;
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // OBS: Använd Service Role Key för att skriva till DB på backend

    if (!sbUrl || !sbKey) {
      throw new Error("Supabase URL or Service Role Key missing in environment variables.");
    }

    this.supabase = createClient(sbUrl, sbKey);
    
    // Initiera OpenAI Embeddings (text-embedding-3-small)
    this.embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
      // API key hämtas automatiskt från process.env.OPENAI_API_KEY
    });

    // Konfigurera text splitter
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n## ", "\n# ", "\n\n", "\n", " ", ""], // Prioritera rubriker vid split
    });
  }

  /**
   * Bearbetar, splittar och lagrar crawlad data.
   * @param documents Lista med objekt från Firecrawl (måste innehålla markdown och metadata)
   * @param companyId Unikt ID för företaget/sessionen
   */
  async processAndStoreDocuments(documents: any[], companyId: string): Promise<void> {
    console.log(`Processing ${documents.length} documents for company: ${companyId}`);

    for (const doc of documents) {
      if (!doc.markdown) continue;

      // 1. Splitta texten i chunks
      // Vi skickar med metadata så den följer med varje chunk
      const splitDocs = await this.splitter.createDocuments(
        [doc.markdown], 
        [{ source: doc.metadata?.sourceURL || 'unknown', ...doc.metadata }]
      );

      console.log(`Split document into ${splitDocs.length} chunks.`);

      // 2. Skapa embeddings för alla chunks
      const texts = splitDocs.map((d: { pageContent: string }) => d.pageContent);
      const vectors = await this.embeddings.embedDocuments(texts);

      // 3. Förbered data för Supabase
      const rowsToInsert = splitDocs.map((splitDoc: any, index: number) => ({
        content: splitDoc.pageContent,
        metadata: splitDoc.metadata,
        embedding: vectors[index],
        company_id: companyId
      }));

      // 4. Spara i Supabase
      const { error } = await this.supabase
        .from('knowledge_base') // Updated table name
        .insert(rowsToInsert);

      if (error) {
        console.error("Error inserting into Supabase:", error);
        throw new Error(`Failed to store credentials: ${error.message}`);
      }
    }
    console.log("All documents processed and stored successfully.");
  }

  /**
   * Söker efter relevant kontext i Supabase.
   * Matchar mot SQL-funktionen 'match_documents'.
   */
  async performSearch(query: string, companyId: string): Promise<SearchResult[]> {
    try {
      // 1. Skapa embedding för användarens fråga
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Bestäm tröskelvärde baserat på frågans innehåll
      const lowerQuery = query.toLowerCase();
      const isPriceQuery = lowerQuery.includes('pris') || 
                           lowerQuery.includes('kostar') || 
                           lowerQuery.includes('kosta') ||
                           lowerQuery.includes('price') || 
                           lowerQuery.includes('cost');
      
      // Sänk tröskeln rejält för prisfrågor eftersom dessa rader ofta är korta och har låg semantisk likhet
      // Även generella frågor kan ha lägre matchning, så vi sätter en snällare grundnivå (0.35 istället för 0.5)
      const threshold = isPriceQuery ? 0.3 : 0.4;

      // 2. Anropa RPC-funktionen i Supabase
      // Vi ökar match_count till 10 för att fånga upp fler detaljer
      const { data: result, error } = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 10,
        filter_company_id: companyId
      });

      if (error) {
        console.error("Error searching Supabase:", error);
        throw new Error(`Search failed: ${error.message}`);
      }

      return result as SearchResult[];
    } catch (error) {
      console.error("Error in performSearch:", error);
      throw error;
    }
  }
}
