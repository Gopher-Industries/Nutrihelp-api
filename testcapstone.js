require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

console.log("🔍 Testing Capstone Supabase...");

const supabase = createClient(
  process.env.SUPABASE_URL,             // should be Capstone URL
  process.env.SUPABASE_ANON_KEY         // Capstone Anon Key
);

async function test() {
  console.log("🔹 SUPABASE_URL:", process.env.SUPABASE_URL);
  console.log("🔹 SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from("users")
    .select("user_id, email")
    .limit(1);

  console.log("📌 DATA:", data);
  console.log("❌ ERROR:", error);
}

test();
