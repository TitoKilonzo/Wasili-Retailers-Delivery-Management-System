# Wasili — Retailers Delivery Management System

Delivery coordination for small retailers, built to the team's Reflex Team
Contract: RetailerStaff create requests, a Dispatcher assigns them to a
Rider who has capacity and the right vehicle, and every status change is
recorded with who did it and when. Built on Appwrite as a full
Backend-as-a-Service - Auth, TablesDB, Realtime, and Functions - no custom
server.

## Roles (contract sec 2)

| Role | Label | Can do |
|---|---|---|
| RetailerStaff | `retailerstaff` | create requests, view their own, cancel while still OPEN |
| Dispatcher | `dispatcher` | view all requests/riders, assign, reassign, cancel any active delivery |
| Rider | `rider` | accept/reject assignments, advance status, confirm delivery, toggle own availability |
| Admin | *(not built in v1)* | see "What's deferred" below - the contract itself says not to build this out unless time permits |
| Customer | *(no account)* | data-only - name, phone, address captured on the delivery, no portal, per contract sec 2 |

## Delivery status flow (contract sec 5)

```
OPEN -> ASSIGNED -> ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
                |
                +-> (rider rejects) -> back to OPEN
Any non-terminal status -> CANCELLED
```

Enforced in `functions/advance-status` and `functions/assign-delivery` -
never in the client. A delivery cannot skip a step, move backwards, or be
touched once it's `DELIVERED` or `CANCELLED`.

## Rider capacity and vehicle compatibility (contract sec 6-7)

Riders are **not** limited to one delivery at a time - each has a
`capacity` and a running `activeDeliveries` count. `assign-delivery` refuses
to assign if:

- the rider is `OFFLINE` or `UNAVAILABLE`,
- `activeDeliveries >= capacity`, or
- the rider's vehicle can't cover the job.

Vehicle compatibility is **tiered**, not exact-match - this was a judgment
call the contract's own example implied (a VAN-required job accepts a VAN
*or* a TRUCK rider) but didn't spell out as a rule:

```
BICYCLE < MOTORCYCLE < CAR < VAN < TRUCK
```

A rider's vehicle covers any job at or below its tier. See
`scripts/test-domain.js` for the compatibility table this implies.

`riderStatus` has two flavors: `AVAILABLE`/`AT_CAPACITY` are computed by the
system on every assign/reject/confirm; `OFFLINE`/`UNAVAILABLE` are set
manually by the rider and always win over the computed state.

## Setup

```
npm install
cp .env.example .env
```

Fill in `.env` (endpoint, project ID, an API key with read+write on
Databases/Tables, Columns/Attributes, Rows/Documents, and Users - Console
may label these with the old or new names depending on your project's
version, tick both sets if you see both). `.env` is gitignored - never
commit it; `.env.example` is the template that's safe to commit. Then:

```
node scripts/setup.js
```

Creates the `wasili` database, its three tables, and five seed accounts -
one RetailerStaff, one Dispatcher, three Riders with **different** vehicles
and capacities on purpose, so the compatibility/capacity rules are actually
demonstrable. Prints username/password pairs to your terminal only - share
those with your team directly, don't paste them into a committed file.
Safe to re-run.

If setup fails with `additional_resource_not_allowed` on the database
step, your Appwrite plan is at its database limit (shared across your
whole organization on the Free plan) - reuse an existing database ID via
`APPWRITE_DATABASE_ID` in `.env`, delete an unused one in Console, or
upgrade to Pro.

Deploy the Functions:

```
appwrite login
appwrite push functions
```

(reads `appwrite.config.json` - set `projectId` there first)

Point the frontend at your project in `public/js/wasili-client.js`
(`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`), then serve `public/` with
anything static (`npx serve public`).

## Functions (every write with a business rule)

| Function | Called by | Contract section |
|---|---|---|
| `create-delivery` | RetailerStaff | sec 2 - create requests |
| `assign-delivery` | Dispatcher | sec 2 - assign *and* reassign; sec 10 - capacity/vehicle edge cases |
| `accept-assignment` | Rider | sec 5 - ACCEPTED as a distinct step from ASSIGNED |
| `reject-assignment` | Rider | sec 10 - "rider rejects/unavailable" returns to dispatcher |
| `advance-status` | Rider | sec 3 - PICKED_UP, OUT_FOR_DELIVERY |
| `confirm-delivery` | Rider | sec 3 - "system records confirmation," DELIVERED |
| `cancel-delivery` | Dispatcher, RetailerStaff | sec 10 - never cancel an already-completed delivery |

Reads (listing deliveries/riders) and Realtime subscriptions go straight
from the browser to Appwrite - no Function needed, since row permissions
already gate who can see what.

## Accountability (contract sec 9)

Every `deliveries` row carries a `history` field (JSON array of
`{ status, at, byUserId, byRole, note? }`). Every Function appends to it
before writing - there is no code path that changes `deliveryStatus`
without also recording who did it and when.

## Why one confirmation-code table stays locked down

`delivery_confirmations` has **zero** client-role permissions - not even the
assigned rider can read it directly. Only `confirm-delivery`'s dynamic API
key can. This is what makes "the rider has to actually ask the customer for
the code" a real guarantee instead of a client-side convention a modified
app could bypass.

## What's deferred (and why - matches the contract's own MVP boundary, sec 11)

- **Admin UI** - contract sec 2 explicitly says not to build this out as a
  "separate large feature unless time permits." The schema doesn't block
  adding an `admin` label later; no UI exists for it yet.
- **Customer portal** - contract sec 2 says the customer doesn't need one
  for the MVP. Their info lives on the delivery row; that's it.
- **Automated route optimization** - contract sec 8 explicitly rules this
  out for the MVP. The dispatcher's judgment is still what finalizes an
  assignment; the system only filters out ineligible riders.
- **Real SMS OTP login** - same reasoning as the previous build: requires a
  paid SMS provider account, not something to assume exists. Username +
  password via a synthetic email stands in for it (Appwrite requires 8+
  character passwords) - phone number is captured as contact data, not
  used to sign in.

## A note on versions

Built against `node-appwrite@28` (server SDK, verified against the actual
installed source for every method used here) and the `appwrite@26` Web SDK.
If the Console doesn't match what's described here, check
[appwrite.io/docs](https://appwrite.io/docs) for what's changed.
