
import { NextResponse } from 'next/server';
import { getSupabaseClient_client } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseClient_client();
    const { data, error } = await supabase
      .from('site_status')
      .select('is_setup_complete')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine.
        console.error("Error checking setup status from Supabase:", error);
        // Default to not set up to be safe
        return NextResponse.json({ isSetupComplete: false });
    }

    if (data && data.is_setup_complete) {
      return NextResponse.json({ isSetupComplete: true });
    } else {
      return NextResponse.json({ isSetupComplete: false });
    }
  } catch (error: any) {
    console.error("Catastrophic error checking setup status:", error);
    // In case of DB error (e.g., permissions), assume not set up to be safe.
    return NextResponse.json({ isSetupComplete: false });
  }
}
