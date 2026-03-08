module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: "domain is required" });

  const apiKey = process.env.VITE_RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Resend API key not configured" });

  try {
    // Check if domain already exists in Resend
    const listRes = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const listData = await listRes.json();
    const foundDomain = listData.data?.find((d) => d.name === domain);

    if (foundDomain) {
      res.json({
        verified: foundDomain.status === "verified",
        status: foundDomain.status,
        records: foundDomain.records || [],
      });
    } else {
      // Domain not in Resend yet — create it
      const createRes = await fetch("https://api.resend.com/domains", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      });
      const createData = await createRes.json();

      if (!createRes.ok) {
        return res.status(createRes.status).json({
          error: createData.message || "Failed to create domain",
        });
      }

      res.json({
        verified: false,
        status: "pending",
        records: createData.records || [],
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
