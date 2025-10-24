
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';


// Client for client-side operations (uses anon key)
let supabase_client: ReturnType<typeof createClient> | null;

export function getSupabaseClient_client() {
    if (supabase_client === undefined) {
        if (supabaseUrl && supabaseAnonKey) {
            supabase_client = createClient(supabaseUrl, supabaseAnonKey);
        } else {
            supabase_client = null;
        }
    }
    return supabase_client;
}


// Client for server-side operations (uses service_role key)
// This client can bypass Row Level Security policies.
let supabase_server: ReturnType<typeof createClient> | null;

export function getSupabaseClient_server() {
    if (supabase_server === undefined) {
        if (supabaseUrl && supabaseServiceRoleKey) {
             supabase_server = createClient(supabaseUrl, supabaseServiceRoleKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
        } else {
            supabase_server = null;
        }
    }
    return supabase_server;
}
