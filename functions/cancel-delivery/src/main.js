// Trigger: HTTP, called by a Dispatcher (any non-terminal status) or the
// RetailerStaff who created the delivery (only while it's still OPEN, since
// once a rider is involved that's a dispatcher call). Implements contract
// section 10's "delivery already completed should not accidentally be
// assigned again" by refusing to cancel a DELIVERED/CANCELLED row.

const { Client, TablesDB, Users } = require("node-appwrite");

const DATABASE_ID = "6a8f0d44001c63c5f21b";

module.exports = async ({ req, res, error }) => {
  const callerId = req.headers["x-appwrite-user-id"];
  if (!callerId) return res.json({ error: "Sign in required" }, 401);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);

  const users = new Users(client);
  const tablesDB = new TablesDB(client);

  try {
    const caller = await users.get({ userId: callerId });
    const isDispatcher = caller.labels.includes("dispatcher");
    const isRetailerStaff = caller.labels.includes("retailerstaff");
    if (!isDispatcher && !isRetailerStaff) {
      return res.json({ error: "Only Dispatcher or RetailerStaff accounts can cancel a delivery" }, 403);
    }

    const { deliveryId, reason } = req.bodyJson || {};
    if (!deliveryId) return res.json({ error: "deliveryId is required" }, 400);

    const delivery = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "deliveries", rowId: deliveryId });
    if (delivery.deliveryStatus === "DELIVERED" || delivery.deliveryStatus === "CANCELLED") {
      return res.json({ error: `Cannot cancel a delivery that is already ${delivery.deliveryStatus}` }, 409);
    }
    if (isRetailerStaff && !isDispatcher) {
      if (delivery.retailerStaffId !== callerId) return res.json({ error: "You can only cancel your own requests" }, 403);
      if (delivery.deliveryStatus !== "OPEN") {
        return res.json({ error: "Once a rider is assigned, ask a dispatcher to cancel" }, 409);
      }
    }

    if (delivery.riderId) {
      const rider = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "riders", rowId: delivery.riderId }).catch(() => null);
      if (rider) {
        const activeDeliveries = Math.max(0, rider.activeDeliveries - 1);
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: "riders",
          rowId: delivery.riderId,
          data: { activeDeliveries, riderStatus: activeDeliveries < rider.capacity ? "AVAILABLE" : "AT_CAPACITY" },
        });
      }
    }

    const history = JSON.parse(delivery.history || "[]");
    history.push({ status: "CANCELLED", at: new Date().toISOString(), byUserId: callerId, byRole: isDispatcher ? "dispatcher" : "retailerstaff", note: reason || undefined });

    const updated = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "deliveries",
      rowId: deliveryId,
      data: { deliveryStatus: "CANCELLED", history: JSON.stringify(history) },
    });

    return res.json(updated);
  } catch (err) {
    error(err.message);
    return res.json({ error: "Failed to cancel delivery" }, 500);
  }
};
