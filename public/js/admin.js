"use strict";

const adminSession = Wasili.requireRole("admin");

let riders = [];
let deliveries = [];

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
    } catch (err) {
        console.error("Admin refresh failed:", err);
        alert("Could not load admin data: " + err.message);
    }
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

    tableBody.innerHTML = deliveries.map((delivery) => {
        const rider = riders.find((entry) => entry.riderId === delivery.riderId);
        return `
            <tr>
                <td>${delivery.deliveryId}</td>
                <td>${delivery.customerName}</td>
                <td>${delivery.destination}</td>
                <td>${formatVehicle(delivery.requiredVehicleType)}</td>
                <td>${rider ? rider.name : "Unassigned"}</td>
                <td><span class="status-badge ${getStatusClass(delivery.deliveryStatus)}">${formatStatus(delivery.deliveryStatus)}</span></td>
            </tr>
        `;
    }).join("");
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

const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
    logoutButton.addEventListener("click", () => Wasili.logout());
}

showSection("dashboard");
