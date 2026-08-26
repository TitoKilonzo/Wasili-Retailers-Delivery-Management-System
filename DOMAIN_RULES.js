// Source of truth for the delivery/rider domain rules, per the team contract
// (Reflex Team Contract, sections 4-10). Appwrite Functions deploy
// independently and can't share a module, so this file is not imported by
// anything - it's copied by hand into scripts/setup.js and every function
// that needs it. If you change a rule here, grep for STATUS_FLOW and
// VEHICLE_TIER across functions/ and scripts/ and update every copy.
// scripts/test-domain.js pins these down with tests so a drifted copy is
// easy to catch.

const DELIVERY_STATUS = ["OPEN", "ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

// Index-based forward flow. CANCELLED is reachable from any non-terminal
// status (handled separately, not part of this sequence). ASSIGNED can also
// fall back to OPEN via reject-assignment (also handled separately, not a
// forward transition).
const FORWARD_FLOW = ["OPEN", "ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];

function canAdvance(current, next) {
  const c = FORWARD_FLOW.indexOf(current);
  const n = FORWARD_FLOW.indexOf(next);
  return c !== -1 && n !== -1 && n === c + 1;
}

function isTerminal(status) {
  return status === "DELIVERED" || status === "CANCELLED";
}

const RIDER_STATUS = ["AVAILABLE", "AT_CAPACITY", "OFFLINE", "UNAVAILABLE"];

// Larger vehicles can cover smaller jobs (contract section 7's own example:
// a VAN-required job accepts a VAN or TRUCK rider). Ordered smallest-first.
const VEHICLE_TIER = ["BICYCLE", "MOTORCYCLE", "CAR", "VAN", "TRUCK"];

function vehicleCompatible(riderVehicle, requiredVehicle) {
  const r = VEHICLE_TIER.indexOf(riderVehicle);
  const req = VEHICLE_TIER.indexOf(requiredVehicle);
  return r !== -1 && req !== -1 && r >= req;
}

module.exports = { DELIVERY_STATUS, FORWARD_FLOW, canAdvance, isTerminal, RIDER_STATUS, VEHICLE_TIER, vehicleCompatible };
