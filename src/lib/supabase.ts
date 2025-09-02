import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and anon key are required.');
}

// Client for client-side operations (uses anon key)
const supabase_client = createClient(supabaseUrl, supabaseAnonKey);

export function getSupabaseClient_client() {
    return supabase_client;
}


// Client for server-side operations (uses service_role key)
// This client can bypass Row Level Security policies.
let supabase_server: ReturnType<typeof createClient>;

export function getSupabaseClient_server() {
    if (!supabaseServiceRoleKey) {
        throw new Error('Supabase service role key is required for server-side operations.');
    }
    if (!supabase_server) {
         supabase_server = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    return supabase_server;
}
