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
    const tokenRes = await fetch(
      `https://accounts.zoho.com/oauth/v2/token?refresh_token=${CFG.refreshToken}&client_id=${CFG.clientId}&client_secret=${CFG.clientSecret}&grant_type=refresh_token`,
      { method: "POST" }
    );
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return res.status(401).json({ error: "Token failed", detail: tokenData });

    const action = req.query.action || "items";
    const page   = parseInt(req.query.page) || 1;

    // Get warehouse list
    if (action === "warehouses") {
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/settings/warehouses?organization_id=${CFG.orgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await r.json());
    }

    // Get single item full detail (includes warehouses array)
    if (action === "item_detail") {
      const itemId = req.query.item_id;
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/items/${itemId}?organization_id=${CFG.orgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await r.json());
    }

    // Get items filtered by warehouse
    if (action === "warehouse_items") {
      const warehouseId = req.query.warehouse_id;
      const r = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200&warehouse_id=${warehouseId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      return res.status(200).json(await r.json());
    }

    // DEBUG: returns warehouses + first item raw + first item full detail
    if (action === "debug") {
      // Get warehouses
      const wr = await fetch(
        `https://www.zohoapis.com/books/v3/settings/warehouses?organization_id=${CFG.orgId}`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const wData = await wr.json();

      // Get first item from list
      const ir = await fetch(
        `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=1&per_page=1`,
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      const iData = await ir.json();
      const firstItem = iData.items?.[0];

      // Get that item's full detail
      let itemDetail = null;
      if (firstItem?.item_id) {
        const dr = await fetch(
          `https://www.zohoapis.com/books/v3/items/${firstItem.item_id}?organization_id=${CFG.orgId}`,
          { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
        );
        const dd = await dr.json();
        itemDetail = dd.item;
      }

      return res.status(200).json({
        warehouses: wData.warehouses || [],
        first_item_list: firstItem,
        first_item_detail: itemDetail,
        item_detail_keys: itemDetail ? Object.keys(itemDetail) : [],
        warehouses_in_detail: itemDetail?.warehouses || "NOT FOUND"
      });
    }

    // Default: paginated items
    const r = await fetch(
      `https://www.zohoapis.com/books/v3/items?organization_id=${CFG.orgId}&page=${page}&per_page=200`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    return res.status(200).json(await r.json());

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
