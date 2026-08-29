// Trigger: HTTP, called by an authenticated Dispatcher account.
// Handles two cases the contract both calls out (section 2 "Assigning
// deliveries" and "Reassigning a delivery when appropriate"):
//   - fresh assignment: delivery is OPEN -> ASSIGNED
//   - reassignment: delivery is ASSIGNED or ACCEPTED (not yet picked up) and
//     the dispatcher wants a different rider -> releases the old rider's
//     capacity, re-checks the new rider, delivery goes back to ASSIGNED
//     (the new rider must accept again - contract sec 5 defines ACCEPTED as
//     a distinct rider acknowledgment, so reassignment can't skip it).
//
// Enforces the edge cases from contract section 10: rider at capacity,
// incompatible vehicle, and never assigns a delivery that's already
// DELIVERED/CANCELLED.

const { Client, TablesDB, Users, Permission, Role } = require("node-appwrite");

const DATABASE_ID = "reflex";
const VEHICLE_TIER = ["BICYCLE", "MOTORCYCLE", "CAR", "VAN", "TRUCK"];

function vehicleCompatible(riderVehicle, requiredVehicle) {
  const r = VEHICLE_TIER.indexOf(riderVehicle);
  const req = VEHICLE_TIER.indexOf(requiredVehicle);
  return r !== -1 && req !== -1 && r >= req;
}

async function releaseRider(tablesDB, riderId) {
  const rider = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "riders", rowId: riderId });
  const activeDeliveries = Math.max(0, rider.activeDeliveries - 1);
  const riderStatus = rider.riderStatus === "AT_CAPACITY" || rider.riderStatus === "AVAILABLE"
    ? (activeDeliveries < rider.capacity ? "AVAILABLE" : "AT_CAPACITY")
    : rider.riderStatus; // preserve manual OFFLINE/UNAVAILABLE
  await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: "riders", rowId: riderId, data: { activeDeliveries, riderStatus } });
}

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
    if (!caller.labels.includes("dispatcher") && !caller.labels.includes("admin")) {
      return res.json({ error: "Only Dispatcher or Admin accounts can assign riders" }, 403);
    }

    const { deliveryId, riderId } = req.bodyJson || {};
    if (!deliveryId || !riderId) return res.json({ error: "deliveryId and riderId are required" }, 400);

    const delivery = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "deliveries", rowId: deliveryId });
    const isReassign = delivery.deliveryStatus === "ASSIGNED" || delivery.deliveryStatus === "ACCEPTED";
    if (delivery.deliveryStatus !== "OPEN" && !isReassign) {
      return res.json({ error: `Cannot assign a delivery in status ${delivery.deliveryStatus}` }, 409);
    }
    if (isReassign && delivery.riderId === riderId) {
      return res.json({ error: "Delivery is already assigned to this rider" }, 409);
    }

    const rider = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "riders", rowId: riderId }).catch(() => null);
    if (!rider) return res.json({ error: "Unknown rider" }, 400);
    if (rider.riderStatus === "OFFLINE" || rider.riderStatus === "UNAVAILABLE") {
      return res.json({ error: `${rider.name} is not currently operational (${rider.riderStatus})` }, 409);
    }
    if (rider.activeDeliveries >= rider.capacity) {
      return res.json({ error: `${rider.name} is at capacity (${rider.activeDeliveries}/${rider.capacity})` }, 409);
    }
    if (!vehicleCompatible(rider.vehicleType, delivery.requiredVehicleType)) {
      return res.json({ error: `${rider.name}'s vehicle (${rider.vehicleType}) can't cover a ${delivery.requiredVehicleType} delivery` }, 409);
    }

    if (isReassign && delivery.riderId) {
      await releaseRider(tablesDB, delivery.riderId);
    }

    const now = new Date().toISOString();
    const callerIsAdmin = caller.labels.includes("admin");
    const history = JSON.parse(delivery.history || "[]");
    history.push({ status: "ASSIGNED", at: now, byUserId: callerId, byRole: callerIsAdmin ? "admin" : "dispatcher", note: isReassign ? `reassigned to ${rider.name}` : `assigned to ${rider.name}` });

    const updated = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "deliveries",
      rowId: deliveryId,
      data: { deliveryStatus: "ASSIGNED", riderId, dispatcherId: callerId, assignedAt: now, history: JSON.stringify(history) },
      permissions: [
        Permission.read(Role.label("dispatcher")),
        Permission.read(Role.user(delivery.retailerStaffId)),
        Permission.update(Role.label("dispatcher")),
        Permission.read(Role.user(riderId)),
        Permission.update(Role.user(riderId)),
      ],
    });

    const newActiveDeliveries = rider.activeDeliveries + 1;
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: "riders",
      rowId: riderId,
      data: { activeDeliveries: newActiveDeliveries, riderStatus: newActiveDeliveries >= rider.capacity ? "AT_CAPACITY" : "AVAILABLE" },
    });

    return res.json(updated);
  } catch (err) {
    error(err.message);
    return res.json({ error: "Failed to assign rider" }, 500);
  }
};
