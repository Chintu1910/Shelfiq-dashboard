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
    // 1. Get access token
    const tokenRes = await fetch(
      `https://accounts.zoho.com/oauth/v2/token?refresh_token=${CFG.refreshToken}&client_id=${CFG.clientId}&client_secret=${CFG.clientSecret}&grant_type=refresh_token`,
      { method: "POST" }
    );
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return res.status(401).json({ error: "Token failed", detail: tokenData });

    const action = req.query.action || "items";
    const page   = parseInt(req.query.page) || 1;

    // ── Action: get list of all warehouses ────────────────────────────────────
    if (action === "warehouses") {
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/settings/warehouses?organization_id=${CFG.orgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const d = await r.json();
      return res.status(200).json(d);
    }

    // ── Action: get items filtered by a specific warehouse_id ─────────────────
    if (action === "warehouse_items") {
      const warehouseId = req.query.warehouse_id;
      if (!warehouseId) return res.status(400).json({ error: "warehouse_id required" });
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200&warehouse_id=${warehouseId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const d = await r.json();
      return res.status(200).json(d);
    }

    // ── Action: debug — returns first raw item so we can inspect fields ────────
    if (action === "debug") {
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=1&per_page=1`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const d = await r.json();
      return res.status(200).json({ raw_first_item: d.items?.[0] || null, page_context: d.page_context });
    }

    // ── Default: paginated items list ─────────────────────────────────────────
    const r = await fetch(
      `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    const d = await r.json();
    return res.status(200).json(d);

  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: e.message });
  }
}
