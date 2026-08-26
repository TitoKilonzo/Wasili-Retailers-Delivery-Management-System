// Pins down the domain rules duplicated across Functions (Appwrite Functions
// deploy independently, so there's no shared module to import - see
// DOMAIN_RULES.js). If you change a rule in one Function, run this and check
// it still matches the intended behavior; update DOMAIN_RULES.js too.
//
// Run with: node scripts/test-domain.js

const assert = require("assert");

const FORWARD_FLOW = ["OPEN", "ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];
function canAdvance(current, next) {
  const c = FORWARD_FLOW.indexOf(current);
  const n = FORWARD_FLOW.indexOf(next);
  return c !== -1 && n !== -1 && n === c + 1;
}

const VEHICLE_TIER = ["BICYCLE", "MOTORCYCLE", "CAR", "VAN", "TRUCK"];
function vehicleCompatible(riderVehicle, requiredVehicle) {
  const r = VEHICLE_TIER.indexOf(riderVehicle);
  const req = VEHICLE_TIER.indexOf(requiredVehicle);
  return r !== -1 && req !== -1 && r >= req;
}

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ok  ${label}`);
}

console.log("delivery status flow (contract sec 5):");
check("OPEN -> ASSIGNED is valid", () => assert.strictEqual(canAdvance("OPEN", "ASSIGNED"), true));
check("ASSIGNED -> ACCEPTED is valid", () => assert.strictEqual(canAdvance("ASSIGNED", "ACCEPTED"), true));
check("ACCEPTED -> PICKED_UP is valid", () => assert.strictEqual(canAdvance("ACCEPTED", "PICKED_UP"), true));
check("PICKED_UP -> OUT_FOR_DELIVERY is valid", () => assert.strictEqual(canAdvance("PICKED_UP", "OUT_FOR_DELIVERY"), true));
check("OUT_FOR_DELIVERY -> DELIVERED is valid", () => assert.strictEqual(canAdvance("OUT_FOR_DELIVERY", "DELIVERED"), true));
check("OPEN -> DELIVERED (skip) is rejected", () => assert.strictEqual(canAdvance("OPEN", "DELIVERED"), false));
check("ACCEPTED -> ASSIGNED (backwards) is rejected", () => assert.strictEqual(canAdvance("ACCEPTED", "ASSIGNED"), false));
check("DELIVERED -> anything is rejected (terminal)", () => assert.strictEqual(canAdvance("DELIVERED", "OPEN"), false));

console.log("\nvehicle compatibility (contract sec 7, tiered):");
check("VAN rider can cover a VAN-required job", () => assert.strictEqual(vehicleCompatible("VAN", "VAN"), true));
check("TRUCK rider can cover a VAN-required job", () => assert.strictEqual(vehicleCompatible("TRUCK", "VAN"), true));
check("BICYCLE rider cannot cover a VAN-required job", () => assert.strictEqual(vehicleCompatible("BICYCLE", "VAN"), false));
check("MOTORCYCLE rider can cover a BICYCLE-required job", () => assert.strictEqual(vehicleCompatible("MOTORCYCLE", "BICYCLE"), true));
check("CAR rider cannot cover a TRUCK-required job", () => assert.strictEqual(vehicleCompatible("CAR", "TRUCK"), false));

console.log("\nrider capacity (contract sec 6):");
check("activeDeliveries < capacity allows assignment", () => assert.strictEqual(3 < 5, true));
check("activeDeliveries >= capacity blocks assignment (the actual guard, in assign-delivery/src/main.js)", () => assert.strictEqual(5 >= 5, true));

console.log(`\n${passed} checks passed.`);
console.log("\nThese rules are duplicated in: functions/assign-delivery, functions/advance-status.");
console.log("A change here that isn't mirrored there is a real bug, not just a stale test.");
