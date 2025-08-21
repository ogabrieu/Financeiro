import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas credenciais
const supabaseUrl = 'https://xabxxnsumyzafslyiqjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYnh4bnN1bXl6YWZzbHlpcWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTU3NzQsImV4cCI6MjA3MTM5MTc3NH0.wvEfB2htSvLEGlKRTYbiNN6e8CUv86acMUPdJni-Szw';

export const supabase = createClient(supabaseUrl, supabaseKey);