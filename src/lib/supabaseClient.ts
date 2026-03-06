import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kcocrvpivdonxqugqqjt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjb2NydnBpdmRvbnhxdWdxcWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzI3MjEsImV4cCI6MjA4ODM0ODcyMX0.dl1x-10YFuoPPiUGzl58c8PTsBIG9P-9yeBmXd5PlGk";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);