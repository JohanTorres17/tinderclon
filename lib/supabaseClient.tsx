import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qfycshvjvkuivcdvfcfz.supabase.co";
const supabaseAnonKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmeWNzaHZqdmt1aXZjZHZmY2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3Mjc5MDIsImV4cCI6MjA3ODMwMzkwMn0.YxcD6v7h9iUfJcXNIKOM-bu6fit-99suUtXbJKkbl68";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);