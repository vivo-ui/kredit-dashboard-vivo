
import { supabase } from "../src/lib/supabaseClient";

async function checkTables() {
  const { data: d1, error: e1 } = await supabase.from("kredit_vast").select("*").limit(1);
  console.log("kredit_vast exists:", !e1);
  
  const { data: d2, error: e2 } = await supabase.from("kredit_vivo").select("*").limit(1);
  console.log("kredit_vivo exists:", !e2);

  const { data: d3, error: e3 } = await supabase.from("submissions").select("*").limit(1);
  console.log("submissions exists:", !e3);
}

checkTables();
