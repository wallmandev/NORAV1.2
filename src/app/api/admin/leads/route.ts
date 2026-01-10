import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    // Om companyId skickas med, filtrera på det (bra om man har flera kunder)
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: leads, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
