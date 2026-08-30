## Wasili system documentation

This documentation is based on the actual project files and the current Appwrite-backed structure in `README.md`, `wasili-client.js`, `setup.js`, and the function handlers under `functions`.

## 1. System overview

Wasili is a delivery coordination system for retailers, dispatchers, riders, and an optional admin layer. The system is built around a static front-end and Appwrite as the backend service layer.

The major pieces are:

- Front-end portals in `public`
- Shared Appwrite client in `wasili-client.js`
- Business-rule enforcement in Appwrite Functions under `functions`
- Database and seed setup in `setup.js`
- Shared domain rules in `DOMAIN_RULES.js`

The app is not a custom Node server with its own database. It relies on:

- Appwrite Auth for login/session
- Appwrite TablesDB for rows such as riders and deliveries
- Appwrite Realtime for live updates
- Appwrite Functions for writes that need business validation

## 2. High-level architecture

### Front-end
The user interfaces are static HTML pages with JavaScript logic:

- `index.html` — sign-in page
- `retailer.html` — retailer staff dashboard
- `dispatcher.html` — dispatcher dashboard
- `rider.html` — rider dashboard
- `admin.html` — admin dashboard (added later)

The shared design system lives in:

- `style.css`
- portal-specific files such as `admin.css`

The main browser logic is split across:

- `index.js`
- `retailer.js`
- `dispatcher.js`
- `rider.js`
- `admin.js`

### Shared client layer
All portal pages use `wasili-client.js` for:

- Appwrite client setup
- auth session creation
- role checks
- database reads
- function calls
- realtime subscriptions

This is the main integration point between browser UI and Appwrite.

### Backend/business layer
Each business-rule-heavy write is enforced by an Appwrite Function:

- `main.js`
- `main.js`
- `main.js`
- `main.js`
- `main.js`
- `main.js`
- `main.js`

These functions validate status transitions, vehicle compatibility, rider capacity, and accountability history before writing.

## 3. Role model

The project uses Appwrite user labels as the source of truth for role identity.

From `wasili-client.js`, the role labels are:

- retailerstaff
- dispatcher
- rider
- admin

The login flow creates a synthetic email using the username plus @wasili.local, then reads the user’s Appwrite labels to determine the role.

### Role responsibilities

- RetailerStaff
  - creates delivery requests
  - views retailer-owned requests
  - can cancel open deliveries
  - not allowed to assign riders

- Dispatcher
  - views all deliveries and riders
  - assigns or reassigns riders
  - cancels active records when needed
  - monitors availability and capacity

- Rider
  - accepts or rejects assignments
  - advances delivery status
  - confirms delivery with code
  - toggles availability

- Admin
  - operational oversight
  - user visibility
  - rider management
  - records and activity review
  - supports operational governance

The project notes in `README.md` that the admin feature is an extension beyond the original MVP, but the role is supported in the app and UI logic.

## 4. Core data model

The system uses Appwrite TablesDB with these main tables:

### riders
Defined in `setup.js`

Fields include:

- name
- phone
- vehicleType
- capacity
- activeDeliveries
- riderStatus

This table stores operational rider state such as capacity, current delivery count, and availability.

### deliveries
Defined in `setup.js`

Fields include:

- retailerStaffId
- customerName
- customerPhone
- address
- itemDescription
- requiredVehicleType
- riderId
- dispatcherId
- assignedAt
- deliveryStatus
- history

This is the operational record for every requested delivery.

### delivery_confirmations
Defined in `setup.js`

This table stores confirmation codes and is intentionally locked down so only functions can access it.


## 5. Delivery lifecycle

The delivery flow is documented in `README.md` and enforced in the functions.

The core lifecycle is:

- OPEN
- ASSIGNED
- ACCEPTED
- PICKED_UP
- OUT_FOR_DELIVERY
- DELIVERED

Rejected or cancelled flows branch out from the active states:

- rider rejects assignment → back to OPEN
- cancelled status - terminal stop

The rules are implemented to prevent skipping steps, moving backwards, or mutating completed records.


## 6. Business rules enforced by the backend

The functions enforce rules the browser cannot be trusted to enforce alone.

### Rider capacity rules
In `main.js`, a rider cannot be assigned if:

- they are OFFLINE or UNAVAILABLE
- activeDeliveries is already at capacity
- their vehicle is incompatible with the required vehicle type

### Vehicle compatibility
The compatibility ladder is:

- BICYCLE
- MOTORCYCLE
- CAR
- VAN
- TRUCK

A rider can handle a job at the same tier or lower, meaning a VAN rider can cover a CAR or MOTORCYCLE assignment, but not a TRUCK-only job unless they are a TRUCK.

### Status transition enforcement
The functions ensure a safe sequence and record history.

### Accountability history
Each delivery includes a history field storing status changes with:

- status
- timestamp
- byUserId
- byRole
- optional note

This supports operational traceability and audit review.


## 7. Authentication and session flow

Authentication is handled through Appwrite Auth in `wasili-client.js`.

The flow is:

1. User signs in with username and password.
2. System converts username to synthetic email using [username@wasili.local](mailto:username@wasili.local).
3. Appwrite creates an email/password session.
4. The system reads the account labels.
5. The matching role is stored in localStorage as wasili_session.
6. Each page calls requireRole to guard access.

This means the role is not inferred from UI alone; it is read from the actual Appwrite account.


## 8. Front-end structure and portal responsibilities

### Sign-in portal
`index.html` and `index.js`

This page:

- lets the user pick a portal role
- attempts login with the selected account
- validates the actual Appwrite role
- redirects the user to the correct dashboard

### Retailer portal
`retailer.html` and `retailer.js`

Responsibilities:

- create delivery requests
- list own delivery history
- view open and active requests
- cancel open retailer-owned deliveries

### Dispatcher portal
`dispatcher.html` and `dispatcher.js`

Responsibilities:

- monitor all deliveries
- display rider availability and vehicle capacity
- assign riders
- reassign deliveries
- review delivery status and operational flow

### Rider portal
`rider.html` and `rider.js`

Responsibilities:

- view assigned deliveries
- accept or reject assignment
- update status as delivery progresses
- confirm delivery with customer code
- toggle availability state

### Admin portal
`admin.html` and `admin.js`

Responsibilities:

- operational summary dashboard
- riders overview
- user and rider management
- activity and record viewing
- dispatcher/admin oversight


## 9. UI and design architecture

The design system is centralized in `style.css`.

This file provides:

- color tokens
- spacing variables
- button styles
- card/grid layout
- typography rules
- shared stat-card behavior
- dashboard layout patterns

The portal CSS files extend or override these rules for local differences:

- `retailer.css`
- `dispatcher.css`
- `rider.css`
- `admin.css`

This means the product is intentionally built with a shared dashboard language rather than full separate app styling.


## 10. Realtime and live update pattern

The browser watches Appwrite tables for changes using Realtime in `wasili-client.js`.

The app subscribes to:

- deliveries table
- riders table

This is used to refresh dashboard data without a manual reload, reducing friction for dispatchers and riders.


## 11. Setup and deployment model

The setup process is documented in `README.md` and implemented in `setup.js`.

Key steps:

1. configure Appwrite project endpoint and API key
2. run setup script
3. create database and required tables
4. seed demo users and rider rows
5. deploy Appwrite Functions using Appwrite CLI
6. serve the front-end locally

The project is designed so the front-end is static and the real rules are enforced in Appwrite Functions and row permissions.


## 12. Important implementation notes

### Contract-first design
The README shows the design was built around a contract and business rules, especially around:

- rider capacity
- status progression
- no backend bypass
- accountability history
- confirmation-code flow

### No custom backend server
The entire platform is intentionally Appwrite-based rather than a custom Express or Node API. This means:

- business logic lives in Functions
- reads use TablesDB directly
- auth is managed by Appwrite
- little or no server-side code sits in this repo beyond the appwrite functions

### Admin is a role, not a separate custom service
The app treats admin as an Appwrite label and portal gate rather than a totally separate system architecture.


## 13. Overall architectural summary

The system is structured like this:

- Browser UI
  - selects role
  - invokes Appwrite Auth and TablesDB
  - renders data and local state

- Shared client layer
  - centralizes Appwrite access
  - wraps function calls and data reads

- Appwrite backend
  - Auth for identity
  - TablesDB for operational records
  - Realtime for live syncing
  - Functions for business validation

- Business rules
  - assignment constraints
  - rider capacity logic
  - vehicle compatibility
  - status progression
  - audit trail

This gives a clean separation between:

- UI and presentation
- identity and access control
- data and business rules
- operational accountability


If you want, I can turn this into a more formal architecture document with:
1. a component diagram,
2. a database schema table,
3. a sequence flow for assigning a delivery,
4. and a portal-by-portal responsibility matrix.