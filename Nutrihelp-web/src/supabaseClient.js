// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error('Missing Supabase configuration. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.');
}

if (!supabaseUrl.startsWith('https://')) {
	throw new Error('REACT_APP_SUPABASE_URL must use HTTPS.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
