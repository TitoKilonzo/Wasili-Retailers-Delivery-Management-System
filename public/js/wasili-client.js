// Central Appwrite client for every page. Uses the global `Appwrite` object
// loaded via CDN in each HTML file (see the <script> tag before this file).
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6a8f0a2f002f98babb3a";

const DATABASE_ID = "6a8f0d44001c63c5f21b";

const { Client, Account, TablesDB, Realtime, Channel, Functions, Query, ID } = Appwrite;

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
const account = new Account(client);
const tablesDB = new TablesDB(client);
const realtime = new Realtime(client);
const functions = new Functions(client);

function syntheticEmail(username) {
  return `${username.toLowerCase()}@wasili.local`;
}

// Appwrite labels are lowercase; contract's own terms (RetailerStaff,
// Dispatcher, Rider) are what the UI displays.
const ROLE_LABELS = ["retailerstaff", "dispatcher", "rider"];
const ROLE_DISPLAY = { retailerstaff: "RetailerStaff", dispatcher: "Dispatcher", rider: "Rider" };

const Wasili = {
  ROLE_DISPLAY,
  VEHICLE_TYPES: ["BICYCLE", "MOTORCYCLE", "CAR", "VAN", "TRUCK"],

  // ---------- Auth ----------

  async login(username, password) {
    await account.createEmailPasswordSession({ email: syntheticEmail(username), password });
    const me = await account.get();
    const role = (me.labels || []).find((l) => ROLE_LABELS.includes(l));
    if (!role) {
      await account.deleteSession({ sessionId: "current" });
      throw new Error("This account has no role assigned. Contact your administrator.");
    }
    const session = { id: me.$id, name: me.name, role };
    localStorage.setItem("wasili_session", JSON.stringify(session));
    return session;
  },

  getSession() {
    const raw = localStorage.getItem("wasili_session");
    return raw ? JSON.parse(raw) : null;
  },

  requireRole(role) {
    const session = this.getSession();
    if (!session || session.role !== role) {
      window.location.href = "/index.html";
      return null;
    }
    return session;
  },

  async logout({ redirect = true } = {}) {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch (err) {
      // session may already be gone - fine, we're logging out either way
    }
    localStorage.removeItem("wasili_session");
    if (redirect) window.location.href = "/index.html";
  },

  // ---------- Functions (writes with business-rule enforcement) ----------

  async _callFunction(functionId, payload) {
    const execution = await functions.createExecution({ functionId, body: JSON.stringify(payload), method: "POST" });
    let result;
    try {
      result = JSON.parse(execution.responseBody);
    } catch (err) {
      throw new Error("Unexpected response from the server");
    }
    if (execution.responseStatusCode >= 400 || result.error) {
      throw new Error(result.error || "Request failed");
    }
    return result;
  },

  createDelivery(data) {
    return this._callFunction("create-delivery", data);
  },
  assignDelivery(deliveryId, riderId) {
    return this._callFunction("assign-delivery", { deliveryId, riderId });
  },
  acceptAssignment(deliveryId) {
    return this._callFunction("accept-assignment", { deliveryId });
  },
  rejectAssignment(deliveryId, reason) {
    return this._callFunction("reject-assignment", { deliveryId, reason });
  },
  advanceStatus(deliveryId, status) {
    return this._callFunction("advance-status", { deliveryId, status });
  },
  confirmDelivery(deliveryId, code) {
    return this._callFunction("confirm-delivery", { deliveryId, code });
  },
  cancelDelivery(deliveryId, reason) {
    return this._callFunction("cancel-delivery", { deliveryId, reason });
  },

  // ---------- Reads (permission-gated, direct to TablesDB) ----------

  async listDeliveries(queries = []) {
    const res = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: "deliveries", queries });
    return res.rows;
  },

  async listRiders() {
    const res = await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: "riders", queries: [] });
    return res.rows;
  },

  // A rider updates their own operational status directly - this is a
  // straight ownership check Appwrite's row permissions already handle
  // (see scripts/setup.js), not a business rule, so no Function needed.
  async updateOwnRiderStatus(riderId, riderStatus) {
    return tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: "riders", rowId: riderId, data: { riderStatus } });
  },

  // ---------- Realtime ----------

  onDeliveryChange(callback) {
    return realtime.subscribe(Channel.tablesdb(DATABASE_ID).table("deliveries").row(), (response) => {
      callback(response.payload, response.events);
    });
  },
  onRiderChange(callback) {
    return realtime.subscribe(Channel.tablesdb(DATABASE_ID).table("riders").row(), (response) => {
      callback(response.payload, response.events);
    });
  },

  Query,
  ID,
};
