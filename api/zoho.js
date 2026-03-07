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

  // Helper: get token (with retry once)
  async function getToken() {
    const r = await fetch(
      `https://accounts.zoho.com/oauth/v2/token?refresh_token=${CFG.refreshToken}&client_id=${CFG.clientId}&client_secret=${CFG.clientSecret}&grant_type=refresh_token`,
      { method: "POST" }
    );
    const d = await r.json();
    return d.access_token || null;
  }

  try {
    const action = req.query.action || "items";
    const page   = parseInt(req.query.page) || 1;

    const token = await getToken();
    if (!token) return res.status(401).json({ error: "Token failed" });

    // ── debug_warehouses: just list warehouses ────────────────────────────────
    if (action === "debug_warehouses") {
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/settings/warehouses?organization_id=${CFG.orgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await r.json());
    }

    // ── debug_item: get ONE item's full detail ────────────────────────────────
    if (action === "debug_item") {
      // First get one item id from list
      const lr = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=1&per_page=1`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const ld = await lr.json();
      const firstId = ld.items?.[0]?.item_id;
      if (!firstId) return res.status(200).json({ error: "No items found", raw: ld });

      // Now get that item's full record
      const dr = await fetch(
        `https://www.zohoapis.com/books/v3/items/${firstId}?organization_id=${CFG.orgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const dd = await dr.json();
      return res.status(200).json({
        item_id: firstId,
        all_keys: dd.item ? Object.keys(dd.item) : [],
        warehouses_field: dd.item?.warehouses ?? "NOT PRESENT",
        stock_on_hand: dd.item?.stock_on_hand,
        full_item: dd.item
      });
    }

    // ── warehouses: get warehouse list ────────────────────────────────────────
    if (action === "warehouses") {
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/settings/warehouses?organization_id=${CFG.orgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await r.json());
    }

    // ── warehouse_items: items filtered by warehouse ───────────────────────────
    if (action === "warehouse_items") {
      const whId = req.query.warehouse_id;
      if (!whId) return res.status(400).json({ error: "warehouse_id required" });
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200&warehouse_id=${whId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await r.json());
    }

    // ── default: paginated items list ─────────────────────────────────────────
    const r = await fetch(
      `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    return res.status(200).json(await r.json());

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
