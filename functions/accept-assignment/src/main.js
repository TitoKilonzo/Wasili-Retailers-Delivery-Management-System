// Trigger: HTTP, called by the rider a delivery is currently assigned to.
// Contract section 5 treats ASSIGNED and ACCEPTED as distinct: a dispatcher
// choosing a rider isn't the same as that rider acknowledging the job.

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
    const { deliveryId } = req.bodyJson || {};
    if (!deliveryId) return res.json({ error: "deliveryId is required" }, 400);

    const delivery = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "deliveries", rowId: deliveryId });
    if (delivery.riderId !== callerId) return res.json({ error: "This delivery is not assigned to you" }, 403);
    if (delivery.deliveryStatus !== "ASSIGNED") {
      return res.json({ error: `Cannot accept a delivery in status ${delivery.deliveryStatus}` }, 409);
    }

    const history = JSON.parse(delivery.history || "[]");
    history.push({ status: "ACCEPTED", at: new Date().toISOString(), byUserId: callerId, byRole: "rider" });

    // Set permissions explicitly on every write rather than relying on
    // whatever was already on the row - keeps dispatcher/retailer/rider
    // visibility (including Realtime, which is permission-gated) correct
    // at every stage instead of silently drifting.
    const updated = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "deliveries",
      rowId: deliveryId,
      data: { deliveryStatus: "ACCEPTED", history: JSON.stringify(history) },
      permissions: [
        Permission.read(Role.label("dispatcher")),
        Permission.update(Role.label("dispatcher")),
        Permission.read(Role.user(delivery.retailerStaffId)),
        Permission.read(Role.user(callerId)),
        Permission.update(Role.user(callerId)),
      ],
    });

    return res.json(updated);
  } catch (err) {
    error(err.message);
    return res.json({ error: "Failed to accept assignment" }, 500);
  }
};
