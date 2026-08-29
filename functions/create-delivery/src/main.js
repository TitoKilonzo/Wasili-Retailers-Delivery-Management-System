// Trigger: HTTP, called by an authenticated RetailerStaff account.
// Creates the deliveries row (OPEN, no rider yet) plus a separate
// delivery_confirmations row the client never gets read access to - see
// confirm-delivery for why that separation matters.

const { Client, TablesDB, Users, ID, Permission, Role } = require("node-appwrite");

const DATABASE_ID = "reflex";
const VEHICLE_TIER = ["BICYCLE", "MOTORCYCLE", "CAR", "VAN", "TRUCK"];

function generateCode() {
  const crypto = require("crypto");
  return crypto.randomInt(100000, 999999).toString();
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
    if (!caller.labels.includes("retailerstaff")) {
      return res.json({ error: "Only RetailerStaff accounts can create delivery requests" }, 403);
    }

    const body = req.bodyJson || {};
    const { customerName, customerPhone, address, itemDescription, requiredVehicleType } = body;
    if (!customerName || !customerPhone || !address || !itemDescription || !requiredVehicleType) {
      return res.json({ error: "customerName, customerPhone, address, itemDescription, requiredVehicleType are required" }, 400);
    }
    if (!/^0[17]\d{8}$/.test(customerPhone)) {
      return res.json({ error: "customerPhone must be a valid Kenyan number" }, 400);
    }
    if (!VEHICLE_TIER.includes(requiredVehicleType)) {
      return res.json({ error: `requiredVehicleType must be one of ${VEHICLE_TIER.join(", ")}` }, 400);
    }

    const deliveryId = ID.unique();
    const code = generateCode();
    const now = new Date().toISOString();

    const delivery = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: "deliveries",
      rowId: deliveryId,
      data: {
        retailerStaffId: callerId,
        customerName,
        customerPhone,
        address,
        itemDescription,
        requiredVehicleType,
        deliveryStatus: "OPEN",
        riderId: "",
        dispatcherId: "",
        assignedAt: "",
        history: JSON.stringify([{ status: "OPEN", at: now, byUserId: callerId, byRole: "retailerstaff" }]),
      },
      permissions: [
        Permission.read(Role.label("dispatcher")),
        Permission.read(Role.user(callerId)),
        Permission.update(Role.label("dispatcher")),
      ],
    });

    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: "delivery_confirmations",
      rowId: deliveryId,
      data: { code },
      permissions: [],
    });

    return res.json({ ...delivery, confirmationCode: code });
  } catch (err) {
    error(err.message);
    return res.json({ error: "Failed to create delivery" }, 500);
  }
};
