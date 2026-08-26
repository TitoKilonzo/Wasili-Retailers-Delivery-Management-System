// Trigger: HTTP, called by the rider a delivery is assigned to.
// Forward flow only, one step at a time: ACCEPTED -> PICKED_UP ->
// OUT_FOR_DELIVERY. DELIVERED is handled by confirm-delivery, since it
// needs the confirmation-code check that lives outside this function's
// data access (see confirm-delivery for why).

const { Client, TablesDB } = require("node-appwrite");

const DATABASE_ID = "6a8f0d44001c63c5f21b";
const FORWARD_FLOW = ["OPEN", "ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

function canAdvance(current, next) {
  const c = FORWARD_FLOW.indexOf(current);
  const n = FORWARD_FLOW.indexOf(next);
  return c !== -1 && n !== -1 && n === c + 1;
}

module.exports = async ({ req, res, error }) => {
  const callerId = req.headers["x-appwrite-user-id"];
  if (!callerId) return res.json({ error: "Sign in required" }, 401);

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);

  const tablesDB = new TablesDB(client);

  try {
    const { deliveryId, status } = req.bodyJson || {};
    if (!deliveryId || !status) return res.json({ error: "deliveryId and status are required" }, 400);
    if (status === "DELIVERED") {
      return res.json({ error: "Use confirm-delivery with the customer's code to mark DELIVERED" }, 409);
    }

    const delivery = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "deliveries", rowId: deliveryId });
    if (delivery.riderId !== callerId) return res.json({ error: "This delivery is not assigned to you" }, 403);
    if (!canAdvance(delivery.deliveryStatus, status)) {
      return res.json({ error: `Cannot move from ${delivery.deliveryStatus} to ${status}` }, 409);
    }

    const history = JSON.parse(delivery.history || "[]");
    history.push({ status, at: new Date().toISOString(), byUserId: callerId, byRole: "rider" });

    const updated = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "deliveries",
      rowId: deliveryId,
      data: { deliveryStatus: status, history: JSON.stringify(history) },
    });

    return res.json(updated);
  } catch (err) {
    error(err.message);
    return res.json({ error: "Failed to update status" }, 500);
  }
};
