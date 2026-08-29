// Trigger: HTTP, called by the rider a delivery is currently assigned to.
// Implements contract section 10's "Rider rejects/unavailable" edge case:
// the assignment returns to the dispatcher for reassignment - it does not
// just vanish or block the rider from further work.

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
    const { deliveryId, reason } = req.bodyJson || {};
    if (!deliveryId) return res.json({ error: "deliveryId is required" }, 400);

    const delivery = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "deliveries", rowId: deliveryId });
    if (delivery.riderId !== callerId) return res.json({ error: "This delivery is not assigned to you" }, 403);
    if (delivery.deliveryStatus !== "ASSIGNED" && delivery.deliveryStatus !== "ACCEPTED") {
      return res.json({ error: `Cannot reject a delivery in status ${delivery.deliveryStatus}` }, 409);
    }

    const rider = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "riders", rowId: callerId });
    const activeDeliveries = Math.max(0, rider.activeDeliveries - 1);
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "riders",
      rowId: callerId,
      data: { activeDeliveries, riderStatus: activeDeliveries < rider.capacity ? "AVAILABLE" : "AT_CAPACITY" },
    });

    const history = JSON.parse(delivery.history || "[]");
    history.push({ status: "OPEN", at: new Date().toISOString(), byUserId: callerId, byRole: "rider", note: reason ? `rejected: ${reason}` : "rejected" });

    const updated = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "deliveries",
      rowId: deliveryId,
      data: { deliveryStatus: "OPEN", riderId: "", dispatcherId: "", assignedAt: "", history: JSON.stringify(history) },
      permissions: [
        Permission.read(Role.label("dispatcher")),
        Permission.read(Role.user(delivery.retailerStaffId)),
        Permission.update(Role.label("dispatcher")),
        // deliberately no read(user(riderId)) here - the rider who just
        // rejected loses visibility once it's back in the open pool.
      ],
    });

    return res.json(updated);
  } catch (err) {
    error(err.message);
    return res.json({ error: "Failed to reject assignment" }, 500);
  }
};
