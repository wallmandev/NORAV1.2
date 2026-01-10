import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
       console.error("Missing Supabase credentials in widget-config");
       // Fallback för att inte krascha widgeten om configs saknas
       return NextResponse.json({
        branding_color: '#7c3aed',
        bot_name: 'NORA',
        welcome_message: 'Hej! Vad kan jag hjälpa dig med idag?'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('companies')
      .select('branding_color, bot_name, welcome_message')
      .eq('id', companyId)
      .single();

    if (error) {
      console.error('Database error:', error);
      // Return default values if company not found or error
      return NextResponse.json({
        branding_color: '#7c3aed',
        bot_name: 'NORA',
        welcome_message: 'Hej! Vad kan jag hjälpa dig med idag?'
      });
    }

    return NextResponse.json({
      branding_color: data.branding_color || '#7c3aed',
      bot_name: data.bot_name || 'NORA',
      welcome_message: data.welcome_message || 'Hej! Vad kan jag hjälpa dig med idag?'
    });

  } catch (error) {
    console.error('Config fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
