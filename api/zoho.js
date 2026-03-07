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

  // HARDCODED warehouse IDs (read directly from Zoho item detail)
  const WH_IDS = {
    pragati: "5861243000000122010",
    amazon:  "5861243000000180119",
    noon:    "5861243000001180091",
    micro:   "5861243000000118147",
    // damage:   "5861243000000118175"  — excluded
    // supermall:"5861243000015585013"  — excluded
  };

  async function getToken() {
    const r = await fetch(
      `https://accounts.zoho.com/oauth/v2/token?refresh_token=${CFG.refreshToken}&client_id=${CFG.clientId}&client_secret=${CFG.clientSecret}&grant_type=refresh_token`,
      { method: "POST" }
    );
    const d = await r.json();
    return d.access_token || null;
  }

  try {
    const token = await getToken();
    if (!token) return res.status(401).json({ error: "Token failed" });

    const action = req.query.action || "items";
    const page   = parseInt(req.query.page) || 1;

    // ── items filtered by a specific warehouse ────────────────────────────────
    // When warehouse_id is passed, Zoho returns stock_on_hand for THAT warehouse
    if (action === "wh") {
      const whId = WH_IDS[req.query.wh];
      if (!whId) return res.status(400).json({ error: "Unknown warehouse: " + req.query.wh });
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200&warehouse_id=${whId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await r.json());
    }

    // ── debug: return raw first item so we can verify fields ──────────────────
    if (action === "debug_item") {
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=1&per_page=1`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const d = await r.json();
      const id = d.items?.[0]?.item_id;
      if (!id) return res.status(200).json({ error: "no items", raw: d });
      const dr = await fetch(
        `https://www.zohoapis.com/books/v3/items/${id}?organization_id=${CFG.orgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await dr.json());
    }

    // ── debug: first item filtered by PRAGATI warehouse ───────────────────────
    if (action === "debug_wh") {
      const whKey = req.query.wh || "pragati";
      const whId = WH_IDS[whKey];
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=1&per_page=3&warehouse_id=${whId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await r.json());
    }

    // ── default: all items list ───────────────────────────────────────────────
    const r = await fetch(
      `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    return res.status(200).json(await r.json());

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
