module.exports = async function handler(req, res) {
  const stripped = req.url.replace(/^\/api\/influencers/, "");
  const url = "https://api-dashboard.influencers.club" + (stripped || "/");

  const resp = await fetch(url, {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    },
    body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
  });

  const data = await resp.text();
  res.status(resp.status).setHeader("Content-Type", "application/json").send(data);
}
