// Token cache — persists across warm serverless invocations
let _token = null;
let _tokenExpiry = 0;

async function getToken(CFG) {
  // Return cached token if still valid (expires in 50 min)
  if (_token && Date.now() < _tokenExpiry) return _token;

  const r = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?refresh_token=${CFG.refreshToken}&client_id=${CFG.clientId}&client_secret=${CFG.clientSecret}&grant_type=refresh_token`,
    { method: "POST" }
  );
  const d = await r.json();
  if (!d.access_token) throw new Error("Token refresh failed: " + JSON.stringify(d));
  _token = d.access_token;
  _tokenExpiry = Date.now() + 50 * 60 * 1000;
  return _token;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const CFG = {
    clientId:     "1000.YP18H8EL66LTCD8BV180DV0QWWOEED",
    clientSecret: "4607a9cf0e7c96ba7d78823c2e80afa82d8c5da8f1",
    refreshToken: "1000.0426f8f9af39975baaca5b381694e469.c054da30f79cb8c5557f97982897f9e2",
    orgId:        "873562075",
  };

  // Warehouse IDs read directly from your Zoho account
  const WH = {
    pragati: "5861243000000122010",
    amazon:  "5861243000000180119",
    noon:    "5861243000001180091",
    micro:   "5861243000000118147",
  };

  try {
    const token = await getToken(CFG);
    const action = req.query.action || "items";
    const page   = parseInt(req.query.page) || 1;

    const headers = { Authorization: `Zoho-oauthtoken ${token}` };
    const base = `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&per_page=200`;

    // Default: all items
    if (action === "items") {
      const r = await fetch(`${base}&page=${page}`, { headers });
      return res.status(200).json(await r.json());
    }

    // Per-warehouse: returns items with stock_on_hand = that warehouse's qty
    if (action === "wh") {
      const whKey = req.query.wh;
      const whId  = WH[whKey];
      if (!whId) return res.status(400).json({ error: "Unknown warehouse key: " + whKey });
      const r = await fetch(`${base}&page=${page}&warehouse_id=${whId}`, { headers });
      return res.status(200).json(await r.json());
    }

    // Debug: verify one item's warehouse data
    if (action === "debug_item") {
      const r = await fetch(`${base}&page=1&per_page=1`, { headers });
      const d = await r.json();
      const id = d.items?.[0]?.item_id;
      if (!id) return res.status(200).json({ error: "no items" });
      const dr = await fetch(
        `https://www.zohoapis.com/books/v3/items/${id}?organization_id=${CFG.orgId}`,
        { headers }
      );
      return res.status(200).json(await dr.json());
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (e) {
    // Clear cached token on error so next call retries
    _token = null;
    _tokenExpiry = 0;
    return res.status(500).json({ error: e.message });
  }
}
