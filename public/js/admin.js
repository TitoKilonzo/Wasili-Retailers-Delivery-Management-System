"use strict";

const adminSession = Wasili.requireRole("admin");

let riders = [];
let deliveries = [];
let recordSearchTerm = "";
let recordStatusFilterValue = "";

// Background polling and Realtime events firing off-screen shouldn't pop
// a blocking alert() every time they hit the same error - once is a
// notification, repeatedly forever is spam that locks up the tab.
let lastAdminErrorShown = null;

function showAdminError(message) {
    console.error(message);
    if (message === lastAdminErrorShown) return;
    lastAdminErrorShown = message;
    alert(message);
}

const sectionTitles = {
    dashboard: {
        title: "Dashboard",
        subtitle: "Manage riders, records, and operational activity"
    },
    users: {
        title: "Users",
        subtitle: "Operational account overview and access controls"
    },
    riders: {
        title: "Riders",
        subtitle: "Manage rider availability, vehicle type, and capacity"
    },
    records: {
        title: "Operational Records",
        subtitle: "View live delivery records and rider assignments"
    },
    activity: {
        title: "Activity",
        subtitle: "Audit trail and recent operational activity"
    }
};

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".portal-section");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

function showSection(sectionId) {
    sections.forEach((section) => section.classList.remove("active-section"));
    navLinks.forEach((link) => link.classList.remove("active"));

    const target = document.getElementById(sectionId);
    if (target) target.classList.add("active-section");

    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add("active");

    if (sectionTitles[sectionId]) {
        pageTitle.textContent = sectionTitles[sectionId].title;
        pageSubtitle.textContent = sectionTitles[sectionId].subtitle;
    }
}

navLinks.forEach((link) => {
    link.addEventListener("click", () => showSection(link.dataset.section));
});

const menuToggle = document.getElementById("menuToggle");
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.toggle("open");
    });
}

function updateAdminProfile() {
    const nameElement = document.getElementById("adminName");
    const avatarElement = document.getElementById("adminAvatar");

    if (adminSession && nameElement) {
        nameElement.textContent = adminSession.name;
    }

    if (adminSession && avatarElement) {
        const initials = adminSession.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
        avatarElement.textContent = initials || "AD";
    }
}

function formatVehicle(vehicleType) {
    const labels = {
        BICYCLE: "Bicycle",
        MOTORCYCLE: "Motorcycle",
        CAR: "Car",
        VAN: "Van",
        TRUCK: "Truck"
    };
    return labels[vehicleType] || vehicleType || "-";
}

function formatStatus(status) {
    const labels = {
        OPEN: "Open",
        ASSIGNED: "Assigned",
        ACCEPTED: "Accepted",
        PICKED_UP: "Picked Up",
        OUT_FOR_DELIVERY: "Out for Delivery",
        DELIVERED: "Delivered",
        CANCELLED: "Cancelled",
        AVAILABLE: "Available",
        AT_CAPACITY: "At Capacity",
        OFFLINE: "Offline",
        UNAVAILABLE: "Unavailable"
    };
    return labels[status] || status || "-";
}

function getAvailableRiderCount() {
    return riders.filter((rider) => rider.riderStatus === "AVAILABLE" && rider.capacity > rider.activeDeliveries).length;
}

function getActiveAssignmentsCount() {
    return deliveries.filter((delivery) => ["ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(delivery.deliveryStatus)).length;
}

async function refreshData() {
    try {
        const [riderRows, deliveryRows] = await Promise.all([
            Wasili.listRiders(),
            Wasili.listDeliveries()
        ]);

        riders = riderRows.map((row) => ({
            riderId: row.$id,
            name: row.name,
            phone: row.phone,
            vehicleType: row.vehicleType,
            capacity: Number(row.capacity || 0),
            activeDeliveries: Number(row.activeDeliveries || 0),
            riderStatus: row.riderStatus
        }));

        deliveries = deliveryRows.map((row) => ({
            deliveryId: row.$id,
            customerName: row.customerName,
            customerPhone: row.customerPhone,
            destination: row.address,
            itemDescription: row.itemDescription,
            requiredVehicleType: row.requiredVehicleType,
            riderId: row.riderId || null,
            deliveryStatus: row.deliveryStatus,
            history: row.history || "[]"
        }));

        renderAll();
        lastAdminErrorShown = null;
    } catch (err) {
        console.error("Admin refresh failed:", err);
        showAdminError("Could not load admin data: " + err.message);
    }
}

// =========================================================
// SHARED HELPERS (vehicle compatibility, capacity, operational status)
// Same rules the dispatcher portal enforces client-side as a UX
// convenience - the assign-delivery Function is still the source of
// truth and re-checks all of this server-side.
// =========================================================

const VEHICLE_TIER = ["BICYCLE", "MOTORCYCLE", "CAR", "VAN", "TRUCK"];

function getRemainingCapacity(rider) {
    return Math.max(0, rider.capacity - rider.activeDeliveries);
}

function isRiderOperational(rider) {
    return rider.riderStatus === "AVAILABLE" || rider.riderStatus === "AT_CAPACITY";
}

function isVehicleCompatible(delivery, rider) {
    const r = VEHICLE_TIER.indexOf(rider.vehicleType);
    const req = VEHICLE_TIER.indexOf(delivery.requiredVehicleType);
    return r !== -1 && req !== -1 && r >= req;
}

function renderDashboard() {
    document.getElementById("totalRiders").textContent = riders.length;
    document.getElementById("availableRiders").textContent = getAvailableRiderCount();
    document.getElementById("openDeliveries").textContent = deliveries.filter((d) => d.deliveryStatus === "OPEN").length;
    document.getElementById("activeAssignments").textContent = getActiveAssignmentsCount();

    const summary = document.getElementById("dashboardSummary");
    const summaryItems = [
        `${riders.filter((r) => r.riderStatus === "AVAILABLE").length} riders available`,
        `${deliveries.filter((d) => ["ASSIGNED", "ACCEPTED", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(d.deliveryStatus)).length} deliveries in progress`,
        `${deliveries.filter((d) => d.deliveryStatus === "DELIVERED").length} deliveries completed`,
        `${riders.filter((r) => r.capacity <= r.activeDeliveries).length} riders at capacity`
    ];

    summary.innerHTML = summaryItems.map((item) => `<div class="info-item"><strong>${item}</strong></div>`).join("");

    renderFleetBreakdown();
}

function renderFleetBreakdown() {
    const container = document.getElementById("fleetBreakdown");
    if (!container) return;

    const rows = VEHICLE_TIER.map((vehicleType) => {
        const fleet = riders.filter((r) => r.vehicleType === vehicleType);
        if (fleet.length === 0) return null;
        const freeSlots = fleet.reduce((sum, r) => sum + getRemainingCapacity(r), 0);
        const operational = fleet.filter(isRiderOperational).length;
        return { vehicleType, count: fleet.length, operational, freeSlots };
    }).filter(Boolean);

    if (rows.length === 0) {
        container.innerHTML = '<div class="info-item"><strong>No riders seeded yet.</strong></div>';
        return;
    }

    container.innerHTML = rows.map((row) => `
        <div class="info-item">
            <strong>${formatVehicle(row.vehicleType)}</strong>
            <span>${row.operational}/${row.count} operational &middot; ${row.freeSlots} slot${row.freeSlots === 1 ? "" : "s"} free</span>
        </div>
    `).join("");
}

function renderUsers() {
    const tableBody = document.getElementById("userTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = riders.map((rider) => `
        <tr>
            <td>${rider.name}</td>
            <td>Rider</td>
            <td>${formatVehicle(rider.vehicleType)}</td>
            <td>${rider.capacity}</td>
            <td><span class="status-badge ${getStatusClass(rider.riderStatus)}">${formatStatus(rider.riderStatus)}</span></td>
        </tr>
    `).join("");
}

function getStatusClass(status) {
    const classes = {
        OPEN: "status-open",
        ASSIGNED: "status-assigned",
        ACCEPTED: "status-accepted",
        PICKED_UP: "status-picked-up",
        OUT_FOR_DELIVERY: "status-out-for-delivery",
        DELIVERED: "status-delivered",
        CANCELLED: "status-cancelled",
        AVAILABLE: "status-delivered",
        AT_CAPACITY: "status-assigned",
        OFFLINE: "status-cancelled",
        UNAVAILABLE: "status-assigned"
    };
    return classes[status] || "status-open";
}

async function updateRiderStatus(riderId, nextStatus) {
    await Wasili.updateRider(riderId, { riderStatus: nextStatus });
    await refreshData();
}

async function updateRiderCapacity(riderId, newCapacity) {
    await Wasili.updateRider(riderId, { capacity: Number(newCapacity) });
    await refreshData();
}

function renderRiders() {
    const container = document.getElementById("riderManagementList");
    if (!container) return;

    container.innerHTML = riders.map((rider) => `
        <div class="admin-rider-row">
            <div>
                <strong>${rider.name}</strong>
                <div class="admin-rider-meta">${formatVehicle(rider.vehicleType)} · ${rider.phone || "No phone"} · ${rider.activeDeliveries}/${rider.capacity} active</div>
            </div>

            <div class="admin-rider-actions">
                <select class="admin-inline-select" data-action="status" data-id="${rider.riderId}">
                    <option value="AVAILABLE" ${rider.riderStatus === "AVAILABLE" ? "selected" : ""}>Available</option>
                    <option value="AT_CAPACITY" ${rider.riderStatus === "AT_CAPACITY" ? "selected" : ""}>At Capacity</option>
                    <option value="OFFLINE" ${rider.riderStatus === "OFFLINE" ? "selected" : ""}>Offline</option>
                    <option value="UNAVAILABLE" ${rider.riderStatus === "UNAVAILABLE" ? "selected" : ""}>Unavailable</option>
                </select>

                <input class="admin-inline-input" type="number" min="1" value="${rider.capacity}" data-action="capacity" data-id="${rider.riderId}" />
                <button class="btn btn-primary" data-action="save" data-id="${rider.riderId}">Save</button>
            </div>
        </div>
    `).join("");

    container.querySelectorAll("[data-action='save']").forEach((button) => {
        button.addEventListener("click", async () => {
            const riderId = button.dataset.id;
            const wrapper = button.closest(".admin-rider-row");
            const statusSelect = wrapper.querySelector('[data-action="status"]');
            const capacityInput = wrapper.querySelector('[data-action="capacity"]');
            const rider = riders.find((entry) => entry.riderId === riderId);
            if (!rider) return;

            const nextStatus = statusSelect.value;
            const nextCapacity = Number(capacityInput.value || rider.capacity);

            try {
                await Wasili.updateRider(riderId, {
                    riderStatus: nextStatus,
                    capacity: nextCapacity
                });
                await refreshData();
            } catch (err) {
                alert("Could not update rider: " + err.message);
            }
        });
    });
}

function renderRecords() {
    const tableBody = document.getElementById("recordTableBody");
    if (!tableBody) return;

    const term = recordSearchTerm.trim().toLowerCase();

    const filtered = deliveries.filter((delivery) => {
        if (recordStatusFilterValue && delivery.deliveryStatus !== recordStatusFilterValue) return false;
        if (!term) return true;
        const rider = riders.find((entry) => entry.riderId === delivery.riderId);
        const haystack = [
            delivery.customerName,
            delivery.destination,
            rider ? rider.name : ""
        ].join(" ").toLowerCase();
        return haystack.includes(term);
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No matching deliveries.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filtered.map((delivery) => {
        const rider = riders.find((entry) => entry.riderId === delivery.riderId);
        const isTerminal = delivery.deliveryStatus === "DELIVERED" || delivery.deliveryStatus === "CANCELLED";
        const canAssign = !isTerminal;
        const assignLabel = delivery.deliveryStatus === "OPEN" ? "Assign" : "Reassign";

        const actions = isTerminal
            ? `<span style="color: var(--text-muted); font-size: 0.8rem;">&mdash;</span>`
            : `
                <div class="admin-row-actions">
                    ${canAssign ? `<button class="btn btn-secondary" data-action="assign" data-id="${delivery.deliveryId}">${assignLabel}</button>` : ""}
                    <button class="btn btn-danger" data-action="cancel" data-id="${delivery.deliveryId}">Cancel</button>
                </div>
            `;

        return `
            <tr>
                <td>${delivery.deliveryId}</td>
                <td>${delivery.customerName}</td>
                <td>${delivery.destination}</td>
                <td>${formatVehicle(delivery.requiredVehicleType)}</td>
                <td>${rider ? rider.name : "Unassigned"}</td>
                <td><span class="status-badge ${getStatusClass(delivery.deliveryStatus)}">${formatStatus(delivery.deliveryStatus)}</span></td>
                <td>${actions}</td>
            </tr>
        `;
    }).join("");

    tableBody.querySelectorAll("[data-action='assign']").forEach((button) => {
        button.addEventListener("click", () => openRiderModalForDelivery(button.dataset.id));
    });
    tableBody.querySelectorAll("[data-action='cancel']").forEach((button) => {
        button.addEventListener("click", () => cancelDeliveryAction(button.dataset.id));
    });
}

const recordSearchInput = document.getElementById("recordSearch");
if (recordSearchInput) {
    recordSearchInput.addEventListener("input", (e) => {
        recordSearchTerm = e.target.value;
        renderRecords();
    });
}

const recordStatusFilter = document.getElementById("recordStatusFilter");
if (recordStatusFilter) {
    recordStatusFilter.addEventListener("change", (e) => {
        recordStatusFilterValue = e.target.value;
        renderRecords();
    });
}

// =========================================================
// ASSIGN / REASSIGN RIDER MODAL
// Same pattern as the dispatcher portal: a clickable list of every
// currently compatible rider instead of a raw ID prompt.
// =========================================================

const riderModalOverlay = document.getElementById("riderModalOverlay");
const riderModalList = document.getElementById("riderModalList");
const riderModalSubtitle = document.getElementById("riderModalSubtitle");
const riderModalClose = document.getElementById("riderModalClose");

function openRiderModalForDelivery(deliveryId) {
    const delivery = deliveries.find((item) => item.deliveryId === deliveryId);
    if (!delivery) return;

    const compatibleRiders = riders.filter(
        (rider) =>
            isRiderOperational(rider) &&
            isVehicleCompatible(delivery, rider) &&
            rider.riderId !== delivery.riderId
    );

    openRiderModal(delivery, compatibleRiders);
}

function openRiderModal(delivery, compatibleRiders) {
    if (!riderModalOverlay) return;

    riderModalSubtitle.textContent =
        `${delivery.customerName} - ${formatVehicle(delivery.requiredVehicleType)} required`;

    riderModalList.innerHTML = "";

    if (compatibleRiders.length === 0) {
        riderModalList.innerHTML =
            `<div class="rider-modal-empty">No suitable rider is currently available for this delivery.</div>`;
    } else {
        compatibleRiders
            .slice()
            .sort((a, b) => getRemainingCapacity(b) - getRemainingCapacity(a))
            .forEach((rider) => {
                const option = document.createElement("button");
                option.type = "button";
                option.className = "rider-modal-option";
                option.innerHTML = `
                    <div>
                        <div class="rider-modal-option-name">${rider.name}</div>
                        <div class="rider-modal-option-meta">
                            ${formatVehicle(rider.vehicleType)} &middot; ${rider.phone}
                        </div>
                    </div>
                    <div class="rider-modal-option-slots">
                        ${getRemainingCapacity(rider)} slot${getRemainingCapacity(rider) === 1 ? "" : "s"} free
                    </div>
                `;
                option.addEventListener("click", () => confirmAssignRider(delivery, rider));
                riderModalList.appendChild(option);
            });
    }

    riderModalOverlay.classList.add("open");
}

function closeRiderModal() {
    if (riderModalOverlay) riderModalOverlay.classList.remove("open");
}

async function confirmAssignRider(delivery, rider) {
    closeRiderModal();
    try {
        await Wasili.assignDelivery(delivery.deliveryId, rider.riderId);
        await refreshData();
        alert(`${delivery.deliveryId} has been assigned to ${rider.name}.`);
    } catch (err) {
        showAdminError("Could not assign this delivery: " + err.message);
    }
}

if (riderModalClose) riderModalClose.addEventListener("click", closeRiderModal);
if (riderModalOverlay) {
    riderModalOverlay.addEventListener("click", (e) => {
        if (e.target === riderModalOverlay) closeRiderModal();
    });
}

// =========================================================
// CANCEL DELIVERY
// =========================================================

async function cancelDeliveryAction(deliveryId) {
    if (!confirm("Cancel this delivery? This can't be undone.")) return;

    const reason = prompt("Reason for cancelling (optional):") || "";

    try {
        await Wasili.cancelDelivery(deliveryId, reason.trim() || undefined);
        await refreshData();
    } catch (err) {
        showAdminError("Could not cancel this delivery: " + err.message);
    }
}

function renderActivity() {
    const container = document.getElementById("activityList");
    if (!container) return;

    const latest = [...deliveries]
        .sort((a, b) => (b.deliveryId || "").localeCompare(a.deliveryId || ""))
        .slice(0, 8);

    if (!latest.length) {
        container.innerHTML = '<div class="info-item"><strong>No operational activity yet.</strong></div>';
        return;
    }

    container.innerHTML = latest.map((delivery) => `
        <div class="info-item">
            <strong>${delivery.customerName}</strong>
            <span>${formatStatus(delivery.deliveryStatus)} · ${formatVehicle(delivery.requiredVehicleType)}</span>
        </div>
    `).join("");
}

function renderAll() {
    renderDashboard();
    renderUsers();
    renderRiders();
    renderRecords();
    renderActivity();
}

updateAdminProfile();
renderAll();
refreshData();

// Live sync so the admin dashboard reflects retailer/dispatcher/rider
// activity as it happens, plus a low-cost polling fallback in case a
// Realtime event is ever dropped (network blip, reconnect gap).
if (typeof Wasili.onDeliveryChange === "function") {
    Wasili.onDeliveryChange(() => refreshData());
}
if (typeof Wasili.onRiderChange === "function") {
    Wasili.onRiderChange(() => refreshData());
}
setInterval(() => refreshData(), 30000);

const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", () => Wasili.logout());
}

showSection("dashboard");
