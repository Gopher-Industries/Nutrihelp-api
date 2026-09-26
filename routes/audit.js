const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

router.post("/", async (req, res) => {
  try {
    const { error } = await supabase
      .from("audit_logs") // make sure table exists
      .insert([req.body]);

    if (error) throw error;

    res.status(200).json({ message: "Audit saved" });

  } catch (err) {
    console.error("Audit error:", err);
    res.status(500).json({ error: "Failed to save audit" });
  }
});

module.exports = router;