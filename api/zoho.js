export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const CFG = {
    clientId:     "1000.YP18H8EL66LTCD8BV180DV0QWWOEED",
    clientSecret: "4607a9cf0e7c96ba7d78823c2e80afa82d8c5da8f1",
    refreshToken: "1000.0426f8f9af39975baaca5b381694e469.c054da30f79cb8c5557f97982897f9e2",
    orgId:        "873562075",
  };

  try {
    // Get fresh access token
    const tokenRes = await fetch(
      `https://accounts.zoho.com/oauth/v2/token?refresh_token=${CFG.refreshToken}&client_id=${CFG.clientId}&client_secret=${CFG.clientSecret}&grant_type=refresh_token`,
      { method: "POST" }
    );
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) {
      return res.status(401).json({ error: "Token failed", detail: tokenData });
    }

    const page = parseInt(req.query.page) || 1;

    // Fetch items with warehouse stock included
    const apiRes = await fetch(
      `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200&filter_by=item.All`,
      { headers: { "Authorization": `Zoho-oauthtoken ${token}` } }
    );
    const data = await apiRes.json();
    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: e.message });
  }
}
