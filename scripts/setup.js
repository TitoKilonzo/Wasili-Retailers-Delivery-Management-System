// One-shot setup for the contract-aligned schema: creates the "reflex"
// database, its tables, and seeds one account per role (RetailerStaff,
// Dispatcher, three Riders with varied vehicle/capacity so assignment rules
// are actually exercisable). Sign-in is username + password; phone is kept
// only as contact data on the riders/deliveries rows.
//
// Run with: node scripts/setup.js
// Requires .env with APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY.
// Safe to re-run - every create call skips if it already exists.

require("dotenv").config();
const { Client, Databases, TablesDB, Users, ID, Permission, Role } = require("node-appwrite");

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  APPWRITE_RIDERS_COLLECTION_ID,
  APPWRITE_DELIVERIES_COLLECTION_ID,
  APPWRITE_CONFIRMATIONS_COLLECTION_ID,
} = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY in .env");
  process.exit(1);
}

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
const databases = new Databases(client);
const tablesDB = new TablesDB(client);
const users = new Users(client);

// Turns an Appwrite error into one clear line instead of a generic
// "Setup failed: <message>" - the actual cause (wrong scope, wrong
// project, wrong region, expired key) is always in code/type, and
// err.message alone often hides it.
function explain(err) {
  const bits = [`message: ${err.message}`];
  if (err.code) bits.push(`http: ${err.code}`);
  if (err.type) bits.push(`type: ${err.type}`);
  return bits.join("  |  ");
}

// Fails fast with a specific reason instead of dying partway through
// table creation with a confusing 401. A missing scope is the single
// most common cause of "seeding is failing" here: Appwrite's Console
// now shows both the old category names (Databases, Collections,
// Documents, Attributes) and the new ones (Tables, Rows, Columns) for
// the same underlying permissions depending on your project's version -
// tick every read/write box under whichever set of names you see for
// Databases/Tables/Collections, Columns/Attributes, and Rows/Documents,
// plus Users.
async function verifyConnection() {
  try {
    await users.list({ queries: [] });
  } catch (err) {
    console.error("\nCould not reach Appwrite with this API key.\n");
    console.error(explain(err));
    console.error(`\nCheck, in order:
  1. APPWRITE_ENDPOINT in .env matches your project's actual region
     (Console > Project Settings > API Endpoint) - e.g. a project
     created in Frankfurt will 404/reject calls made to a US endpoint.
  2. APPWRITE_PROJECT_ID in .env matches Console > Project Settings > Project ID.
  3. The API key (Console > Overview > Integrate > API Keys) has NOT expired,
     and has read+write ticked for: Databases/Tables, Columns/Attributes,
     Rows/Documents, and Users. If in doubt, regenerate the key with every
     read/write box under those checked and paste the new value into .env.
`);
    process.exit(1);
  }
}

// Falls back to the contract's own names if .env doesn't set these -
// functions/*/src/main.js hardcode these same defaults (Appwrite Functions
// run in their own managed environment and can't read this local .env), so
// if you override them here, update every function to match. See
// DOMAIN_RULES.js for why these constants live in more than one place.
const DATABASE_ID = APPWRITE_DATABASE_ID || "reflex";
const RIDERS_TABLE = APPWRITE_RIDERS_COLLECTION_ID || "riders";
const DELIVERIES_TABLE = APPWRITE_DELIVERIES_COLLECTION_ID || "deliveries";
const CONFIRMATIONS_TABLE = APPWRITE_CONFIRMATIONS_COLLECTION_ID || "delivery_confirmations";
const DELIVERY_STATUS = ["OPEN", "ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const RIDER_STATUS = ["AVAILABLE", "AT_CAPACITY", "OFFLINE", "UNAVAILABLE"];
const VEHICLE_TYPES = ["BICYCLE", "MOTORCYCLE", "CAR", "VAN", "TRUCK"];

async function ignoreExists(promise, label) {
  try {
    await promise;
    console.log(`created  ${label}`);
  } catch (err) {
    if (err.code === 409) console.log(`exists   ${label}`);
    else {
      console.error(`\nFailed on: ${label}`);
      console.error(explain(err));
      throw err;
    }
  }
}

async function setupDatabase() {
  await ignoreExists(databases.create({ databaseId: DATABASE_ID, name: "Wasili" }), "database reflex");

  // --- riders: capacity + vehicle + operational status, per contract sec 6-7 ---
  await ignoreExists(
    tablesDB.createTable({
      databaseId: DATABASE_ID,
      tableId: RIDERS_TABLE,
      name: "riders",
      rowSecurity: true,
      permissions: [Permission.read(Role.label("dispatcher")), Permission.read(Role.label("retailerstaff"))],
    }),
    "table riders"
  );
  await ignoreExists(tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RIDERS_TABLE, key: "name", size: 128, required: true }), "riders.name");
  await ignoreExists(tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: RIDERS_TABLE, key: "phone", size: 20, required: true }), "riders.phone");
  await ignoreExists(tablesDB.createEnumColumn({ databaseId: DATABASE_ID, tableId: RIDERS_TABLE, key: "vehicleType", elements: VEHICLE_TYPES, required: true }), "riders.vehicleType");
  await ignoreExists(tablesDB.createIntegerColumn({ databaseId: DATABASE_ID, tableId: RIDERS_TABLE, key: "capacity", required: true, min: 1, max: 50 }), "riders.capacity");
  await ignoreExists(tablesDB.createIntegerColumn({ databaseId: DATABASE_ID, tableId: RIDERS_TABLE, key: "activeDeliveries", required: true, min: 0, max: 50, xdefault: 0 }), "riders.activeDeliveries");
  await ignoreExists(
    tablesDB.createEnumColumn({ databaseId: DATABASE_ID, tableId: RIDERS_TABLE, key: "riderStatus", elements: RIDER_STATUS, required: true, xdefault: "AVAILABLE" }),
    "riders.riderStatus"
  );

  // --- deliveries: the core record. deliveryId = Appwrite's own $id, so we
  // don't duplicate it as a column - every row already carries it. ---
  await ignoreExists(
    tablesDB.createTable({
      databaseId: DATABASE_ID,
      tableId: DELIVERIES_TABLE,
      name: "deliveries",
      rowSecurity: true,
      permissions: [Permission.read(Role.label("dispatcher"))],
    }),
    "table deliveries"
  );
  const stringColumns = [
    ["retailerStaffId", 64, true],
    ["customerName", 128, true],
    ["customerPhone", 20, true],
    ["address", 256, true],
    ["itemDescription", 256, true],
    ["riderId", 64, false],
    ["dispatcherId", 64, false],
    ["assignedAt", 40, false],
    ["history", 6000, false], // JSON string: [{ status, at, byUserId, byRole }]
  ];
  for (const [key, size, required] of stringColumns) {
    await ignoreExists(tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: DELIVERIES_TABLE, key, size, required }), `deliveries.${key}`);
  }
  await ignoreExists(
    tablesDB.createEnumColumn({ databaseId: DATABASE_ID, tableId: DELIVERIES_TABLE, key: "requiredVehicleType", elements: VEHICLE_TYPES, required: true }),
    "deliveries.requiredVehicleType"
  );
  await ignoreExists(
    tablesDB.createEnumColumn({ databaseId: DATABASE_ID, tableId: DELIVERIES_TABLE, key: "deliveryStatus", elements: DELIVERY_STATUS, required: true, xdefault: "OPEN" }),
    "deliveries.deliveryStatus"
  );

  // --- delivery_confirmations: confirmation codes, fulfils contract sec 3's "system
  // records confirmation" step. Locked to Functions only, same reasoning as
  // the original build - see confirm-delivery. ---
  await ignoreExists(
    tablesDB.createTable({ databaseId: DATABASE_ID, tableId: CONFIRMATIONS_TABLE, name: "delivery_confirmations", rowSecurity: true, permissions: [] }),
    "table delivery_confirmations"
  );
  await ignoreExists(tablesDB.createStringColumn({ databaseId: DATABASE_ID, tableId: CONFIRMATIONS_TABLE, key: "code", size: 6, required: true }), "delivery_confirmations.code");
}

// Deliberately varied capacity/vehicle so the compatibility and capacity
// rules in assign-delivery are actually exercisable during a demo.
const seedAccounts = [
  { name: "Jane Wambui", username: "jane", phone: "0711000001", password: "17284093", role: "retailerstaff" },
  { name: "Peter Kamau", username: "peter", phone: "0711000002", password: "17284093", role: "dispatcher" },
  { name: "Brian Otieno", username: "brian", phone: "0711000003", password: "17284093", role: "rider", vehicleType: "BICYCLE", capacity: 2 },
  { name: "Faith Wanjiru", username: "faith", phone: "0711000004", password: "17284093", role: "rider", vehicleType: "MOTORCYCLE", capacity: 4 },
  { name: "Kevin Mutiso", username: "kevin", phone: "0711000005", password: "17284093", role: "rider", vehicleType: "VAN", capacity: 6 },
];

// Login runs on username + password now (see public/index.html /
// wasili-client.js) - phone stays on the account/riders row as contact
// data only (dispatcher calling a rider, etc.), it's no longer read at
// sign-in time.
function syntheticEmail(username) {
  return `${username.toLowerCase()}@wasili.local`;
}

async function seedUsers() {
  console.log("\nSeeding accounts...\n");
  for (const acc of seedAccounts) {
    let userId;
    try {
      const user = await users.create({ userId: ID.unique(), email: syntheticEmail(acc.username), password: acc.password, name: acc.name });
      userId = user.$id;
      await users.updateLabels({ userId, labels: [acc.role] });
      console.log(`created  ${acc.role.padEnd(12)} ${acc.username.padEnd(8)} pw ${acc.password}${acc.vehicleType ? `  ${acc.vehicleType} x${acc.capacity}` : ""}`);
    } catch (err) {
      if (err.code === 409) {
        console.log(`exists   ${acc.role.padEnd(12)} ${acc.username}`);
        continue;
      }
      console.error(`\nFailed creating account: ${acc.username}`);
      console.error(explain(err));
      throw err;
    }

    if (acc.role === "rider") {
      await ignoreExists(
        tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: RIDERS_TABLE,
          rowId: userId,
          data: { name: acc.name, phone: acc.phone, vehicleType: acc.vehicleType, capacity: acc.capacity, activeDeliveries: 0, riderStatus: "AVAILABLE" },
          permissions: [
            Permission.read(Role.label("dispatcher")),
            Permission.read(Role.label("retailerstaff")),
            Permission.update(Role.user(userId)), // rider can toggle their own AVAILABLE/OFFLINE/UNAVAILABLE
            Permission.update(Role.label("dispatcher")), // Functions update activeDeliveries/riderStatus during assign/complete
          ],
        }),
        `riders row for ${acc.name}`
      );
    }
  }
  console.log("\nDone. Sign in at your deployed frontend with any username/password pair above.");
}

(async () => {
  await verifyConnection();
  await setupDatabase();
  await seedUsers();
})().catch((err) => {
  // verifyConnection/ignoreExists/seedUsers already printed the specific
  // reason above via explain(err) - this is just the final non-zero exit.
  process.exit(1);
});
