import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export class LeadService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    // Vi använder Service Role Key på server-sidan för att ha fulla rättigheter
    // Fallback till Anon key om service key saknas (men helst service key)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL and Key must be defined in environment variables.");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async saveLead(companyId: string, message: string, email: string = "", phone: string = "") {
    console.log(`Saving lead for company ${companyId}. Email: ${email}, Phone: ${phone}`);
    
    // Bygger contact_info objekt
    const contactInfoObj = {
      raw_email: email,
      raw_phone: phone,
      source: 'chat_auto_capture',
      original_message: message // Backup if message column fails
    };

    // Använder den nya tabellstrukturen
    // Notera: 'status' kolumnen fanns inte i det angivna SQL-schemat, så jag tar bort den.
    const { data, error } = await this.supabase
      .from('leads')
      .insert([
        { 
          company_id: companyId, 
          message: message,
          email: email || null,
          phone: phone || null,
          contact_info: contactInfoObj
        }
      ]);

    if (error) {
      // Fallback: Hantera schema-fel (PGRST204 = Column not found)
      if (error.code === 'PGRST204') {
        console.warn(`Schema mismatch detected: ${error.message}. Retrying with minimal fields.`);
        
        // Skapa en payload som fungerar med ett begränsat schema (som användarens nuvarande)
        // Vi lägger all viktig data i contact_info istället
        const safePayload: any = { 
          company_id: companyId,
          // Om email är obligatoriskt (NOT NULL) men vi saknar det, måste vi tyvärr skicka något eller låta det fela.
          // Vi skickar email om det finns.
          email: email || null,
          contact_info: contactInfoObj
        };

        // Försök spara igen
        const { error: retryError } = await this.supabase
          .from('leads')
          .insert([ safePayload ]);
        
        if (retryError) {
             console.error('Error saving lead (retry):', retryError);
             throw retryError;
        }
        return true;
      }

      console.error('Error saving lead:', error);
      throw error; // Låt api-routen hantera felet (eller logga det tyst)
    }
    
    return true;
  }
}
