// src/config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Fungsi pengambil variabel lingkungan dinamis tanpa hardcode
export function GET_ENV(key, fallback = "") {
  if (typeof window !== "undefined") {
    if (window.__ENV__ && window.__ENV__[key]) return window.__ENV__[key];
    const stored = localStorage.getItem(`ENV_${key}`);
    if (stored) return stored;
  }
  return fallback;
}

export const CONFIG = Object.freeze({
  SUPABASE_URL: GET_ENV("SUPABASE_URL", "https://pdhprdiruhflpzzquwhm.supabase.co"),
  SUPABASE_ANON_KEY: GET_ENV("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkaHByZGlydWhmbHB6enF1d2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTM5MzksImV4cCI6MjEwODA4OTkzOX0.gaV9lOcNvSYsiqh52Q5_cvmAnrFSb4ftTc-4jneBXXQ"),
  STARTER_CASH_IDR: 500000.0,
  STARTER_CASH_USD: 35.0,
  TICKET_PRICE_USD: 45.0,
  TAX_PPH_RATE: 0.10
});

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
