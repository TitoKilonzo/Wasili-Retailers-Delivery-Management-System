// Trigger: HTTP, called by the rider a delivery is assigned to.
// The confirmation code lives in a table no client role can read (see
// scripts/setup.js) - this Function is the only thing that can compare the
// entered code against the real one, using its dynamic API key.

const { Client, TablesDB, Permission, Role } = require("node-appwrite");

const DATABASE_ID = "reflex";

module.exports = async ({ req, res, error }) => {
  const callerId = req.headers["x-appwrite-user-id"];
  if (!callerId) return res.json({ error: "Sign in required" }, 401);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);

  const tablesDB = new TablesDB(client);

  try {
    const { deliveryId, code } = req.bodyJson || {};
    if (!deliveryId || !code) return res.json({ error: "deliveryId and code are required" }, 400);

    const delivery = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "deliveries", rowId: deliveryId });
    if (delivery.riderId !== callerId) return res.json({ error: "This delivery is not assigned to you" }, 403);
    if (delivery.deliveryStatus !== "OUT_FOR_DELIVERY") {
      return res.json({ error: "Delivery must be OUT_FOR_DELIVERY before it can be confirmed" }, 409);
    }

    const codeRow = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "delivery_confirmations", rowId: deliveryId });
    if (code !== codeRow.code) return res.json({ error: "Confirmation code does not match" }, 400);

    const history = JSON.parse(delivery.history || "[]");
    history.push({ status: "DELIVERED", at: new Date().toISOString(), byUserId: callerId, byRole: "rider", confirmed: true });

    // Set permissions explicitly on every write rather than relying on
    // whatever was already on the row - keeps dispatcher/retailer/rider
    // visibility (including Realtime, which is permission-gated) correct
    // at every stage instead of silently drifting. Everyone who touched
    // the delivery keeps read access to the completed record.
    const updated = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "deliveries",
      rowId: deliveryId,
      data: { deliveryStatus: "DELIVERED", history: JSON.stringify(history) },
      permissions: [
        Permission.read(Role.label("dispatcher")),
        Permission.update(Role.label("dispatcher")),
        Permission.read(Role.user(delivery.retailerStaffId)),
        Permission.read(Role.user(callerId)),
      ],
    });

    const rider = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "riders", rowId: callerId });
    const activeDeliveries = Math.max(0, rider.activeDeliveries - 1);
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "riders",
      rowId: callerId,
      data: { activeDeliveries, riderStatus: activeDeliveries < rider.capacity ? "AVAILABLE" : "AT_CAPACITY" },
    });

    return res.json(updated);
  } catch (err) {
    error(err.message);
    return res.json({ error: "Failed to confirm delivery" }, 500);
  }
};
