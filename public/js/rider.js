"use strict";

// =========================================================
// WASILI RIDER PORTAL
// Backed live by Appwrite (see js/wasili-client.js). currentRider and
// assignments are loaded from TablesDB - assignments is only ever
// replaced wholesale by refreshData(), never mutated on a guess, so the
// UI can't drift from what the server actually has recorded.
// =========================================================

const riderSession = Wasili.requireRole("rider");

let currentRider = {
    riderId: riderSession ? riderSession.id : null,
    name: riderSession ? riderSession.name : "",
    phone: "",
    vehicleType: "",
    capacity: 0,
    activeDeliveries: 0,
    riderStatus: "AVAILABLE"
};

let assignments = [];

// Row field names from TablesDB (address/requiredVehicleType/etc.) don't
// match this file's original mock shape (destination/vehicleType) - this
// mapper bridges that gap so the render functions below didn't need a
// rewrite.
function mapDeliveryRow(row) {
    return {
        deliveryId: row.$id,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        destination: row.address,
        landmark: row.landmark || "",
        itemDescription: row.itemDescription,
        vehicleType: row.requiredVehicleType,
        deliveryStatus: row.deliveryStatus,
        riderId: row.riderId || null,
        confirmation: null
    };
}

// Background polling (the 30s safety-net interval, and Realtime events
// firing off-screen) shouldn't pop a blocking alert() every time it hits
// the same error - once is a notification, every 30s forever is spam
// that locks up the tab. Only re-alert if the message actually changed.
let lastRiderErrorShown = null;

function showRiderError(message) {
    console.error(message);
    if (message === lastRiderErrorShown) return;
    lastRiderErrorShown = message;
    alert(message);
}

function clearRiderError() {
    lastRiderErrorShown = null;
}

async function refreshData() {
    if (!riderSession) return;

    let riderRow = null;
    try {
        riderRow = await Wasili.getRider(riderSession.id);
    } catch (err) {
        console.warn("Rider profile missing; continuing with assignment-only view:", err);
    }

    try {
        const deliveryRows = await Wasili.listDeliveries([Wasili.Query.equal("riderId", riderSession.id)]);

        currentRider = riderRow
            ? {
                riderId: riderRow.$id,
                name: riderRow.name,
                phone: riderRow.phone,
                vehicleType: riderRow.vehicleType,
                capacity: riderRow.capacity,
                activeDeliveries: riderRow.activeDeliveries,
                riderStatus: riderRow.riderStatus
            }
            : {
                riderId: riderSession.id,
                name: riderSession.name,
                phone: "",
                vehicleType: "",
                capacity: 0,
                activeDeliveries: 0,
                riderStatus: "AVAILABLE"
            };

        assignments = deliveryRows.map(mapDeliveryRow);

        renderAll();
        if (riderRow) clearRiderError();
    } catch (err) {
        console.error("Failed to load rider assignments:", err);
        showRiderError("Could not load your assignments. Please try again.");
    }
}

// =========================================================
// STATUS FORMATTING
// =========================================================

function formatDeliveryStatus(status) {
    const statusNames = {
        OPEN: "Open",
        ASSIGNED: "Assigned",
        ACCEPTED: "Accepted",
        PICKED_UP: "Picked Up",
        OUT_FOR_DELIVERY: "Out for Delivery",
        DELIVERED: "Delivered",
        CANCELLED: "Cancelled"
    };

    return statusNames[status] || status;
}

function getDeliveryStatusClass(status) {
    const statusClasses = {
        OPEN: "status-open",
        ASSIGNED: "status-assigned",
        ACCEPTED: "status-accepted",
        PICKED_UP: "status-picked-up",
        OUT_FOR_DELIVERY: "status-out-for-delivery",
        DELIVERED: "status-delivered",
        CANCELLED: "status-cancelled"
    };

    return statusClasses[status] || "status-open";
}

// =========================================================
// NAVIGATION
// =========================================================

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".portal-section");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const sectionTitles = {
    dashboard: {
        title: "Dashboard",
        subtitle: "View your assigned deliveries and delivery progress"
    },
    assignments: {
        title: "My Assignments",
        subtitle: "View and manage your assigned deliveries"
    },
    history: {
        title: "Delivery History",
        subtitle: "Review completed delivery activity"
    }
};

function showSection(sectionId) {
    sections.forEach((section) => {
        section.classList.remove("active-section");
    });

    navLinks.forEach((link) => {
        link.classList.remove("active");
    });

    const targetSection = document.getElementById(sectionId);

    if (targetSection) {
        targetSection.classList.add("active-section");
    }

    const activeLink = document.querySelector(
        `[data-section="${sectionId}"]`
    );

    if (activeLink) {
        activeLink.classList.add("active");
    }

    if (sectionTitles[sectionId]) {
        pageTitle.textContent = sectionTitles[sectionId].title;
        pageSubtitle.textContent = sectionTitles[sectionId].subtitle;
    }

    const sidebar = document.getElementById("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        const section = link.dataset.section;
        showSection(section);
    });
});

// =========================================================
// MOBILE SIDEBAR
// =========================================================

const menuToggle = document.getElementById("menuToggle");

if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");

        if (sidebar) {
            sidebar.classList.toggle("open");
        }
    });
}

// =========================================================
// RIDER PROFILE
// =========================================================

function renderRiderProfile() {
    const nameElement = document.getElementById("riderName");
    const avatarElement = document.getElementById("riderAvatar");
    const statusLabelElement = document.getElementById("riderStatusLabel");

    if (nameElement && currentRider.name) {
        nameElement.textContent = currentRider.name;
    }

    if (avatarElement && currentRider.name) {
        avatarElement.textContent = currentRider.name
            .split(" ")
            .map((name) => name[0])
            .join("");
    }

    if (statusLabelElement) {
        statusLabelElement.textContent = currentRider.riderStatus
            ? currentRider.riderStatus.replace("_", " ")
            : "Rider";
    }
}

// =========================================================
// AVAILABILITY TOGGLE
// =========================================================
// Contract sec 6: OFFLINE/UNAVAILABLE are set manually by the rider and
// always win over the system-computed AVAILABLE/AT_CAPACITY - this is a
// straight ownership write, no Function needed (see wasili-client.js).

async function toggleAvailability() {
    if (!currentRider.riderId) return;

    const goingOffline = currentRider.riderStatus !== "OFFLINE";
    const nextStatus = goingOffline ? "OFFLINE" : "AVAILABLE";

    try {
        await Wasili.updateOwnRiderStatus(currentRider.riderId, nextStatus);
        await refreshData();
    } catch (err) {
        showRiderError("Could not update your availability: " + err.message);
    }
}

// =========================================================
// DASHBOARD STATISTICS
// =========================================================

function renderStatistics() {
    const activeAssignments = assignments.filter((delivery) => {
        return [
            "ASSIGNED",
            "ACCEPTED",
            "PICKED_UP",
            "OUT_FOR_DELIVERY"
        ].includes(delivery.deliveryStatus);
    });

    const completedDeliveries = assignments.filter((delivery) => {
        return delivery.deliveryStatus === "DELIVERED";
    });

    const assignedElement = document.getElementById("assignedCount");
    const activeElement = document.getElementById("inProgressCount");
    const completedElement = document.getElementById("completedCount");
    const capacityElement = document.getElementById("capacityValue");

    if (assignedElement) {
        assignedElement.textContent = activeAssignments.length;
    }

    if (activeElement) {
        activeElement.textContent = activeAssignments.filter(
            (delivery) => delivery.deliveryStatus !== "ASSIGNED"
        ).length;
    }

    if (completedElement) {
        completedElement.textContent = completedDeliveries.length;
    }

    if (capacityElement) {
        capacityElement.textContent = `${currentRider.activeDeliveries || 0} / ${currentRider.capacity || 0}`;
    }
}

// =========================================================
// GET NEXT VALID ACTION
// =========================================================

function getNextAction(status) {
    const actions = {
        ASSIGNED: {
            label: "Accept Assignment",
            nextStatus: "ACCEPTED"
        },
        ACCEPTED: {
            label: "Mark Picked Up",
            nextStatus: "PICKED_UP"
        },
        PICKED_UP: {
            label: "Mark Out for Delivery",
            nextStatus: "OUT_FOR_DELIVERY"
        },
        OUT_FOR_DELIVERY: {
            label: "Mark Delivered",
            nextStatus: "DELIVERED"
        }
    };

    return actions[status] || null;
}

// =========================================================
// UPDATE DELIVERY STATUS
// =========================================================

async function updateDeliveryStatus(deliveryId, nextStatus) {
    const delivery = assignments.find(
        (item) => item.deliveryId === deliveryId
    );

    if (!delivery) {
        return;
    }

    try {
        if (nextStatus === "ACCEPTED") {
            await Wasili.acceptAssignment(deliveryId);
        } else if (nextStatus === "DELIVERED") {
            // DELIVERED needs the customer's confirmation code, checked
            // server-side against a table no client role can read (see
            // functions/confirm-delivery) - this is what makes "the rider
            // has to actually ask the customer" a real guarantee.
            const code = prompt("Enter the customer's confirmation code:");

            if (!code || !code.trim()) {
                alert("A confirmation code is required to mark this delivery as delivered.");
                return;
            }

            await Wasili.confirmDelivery(deliveryId, code.trim());
        } else {
            await Wasili.advanceStatus(deliveryId, nextStatus);
        }

        await refreshData();

        alert(`${deliveryId} is now ${formatDeliveryStatus(nextStatus)}.`);
    } catch (err) {
        showRiderError(`Could not update ${deliveryId}: ${err.message}`);
    }
}

// =========================================================
// REJECT ASSIGNMENT
// =========================================================
// Contract sec 10: a rider rejecting/unavailable sends the delivery back
// to the dispatcher for reassignment, rather than blocking the rider.

async function rejectDelivery(deliveryId) {
    const reason = prompt("Reason for rejecting this assignment (optional):") || "";

    try {
        await Wasili.rejectAssignment(deliveryId, reason.trim() || undefined);
        await refreshData();
        alert(`${deliveryId} has been returned to the dispatcher.`);
    } catch (err) {
        showRiderError(`Could not reject ${deliveryId}: ${err.message}`);
    }
}

// =========================================================
// RENDER CURRENT ASSIGNMENTS
// =========================================================

function renderAssignments() {
    const container = document.getElementById("assignmentList");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const activeAssignments = assignments.filter((delivery) => {
        return [
            "ASSIGNED",
            "ACCEPTED",
            "PICKED_UP",
            "OUT_FOR_DELIVERY"
        ].includes(delivery.deliveryStatus);
    });

    if (activeAssignments.length === 0) {
        container.innerHTML = `
            <div class="rider-empty">
                No active assignments.
            </div>
        `;

        return;
    }

    activeAssignments.forEach((delivery) => {
        const action = getNextAction(delivery.deliveryStatus);

        const card = document.createElement("div");

        card.className = "assignment-card";

        card.innerHTML = `
            <div class="assignment-card-header">
                <div>
                    <h3>${delivery.deliveryId}</h3>

                    <p class="assignment-meta">
                        ${delivery.customerName}
                        •
                        ${delivery.customerPhone}
                    </p>
                </div>

                <span class="status-badge ${getDeliveryStatusClass(
            delivery.deliveryStatus
        )}">
                    ${formatDeliveryStatus(delivery.deliveryStatus)}
                </span>
            </div>

            <div class="detail-grid">

                <div class="detail-item">
                    <span class="detail-label">
                        Destination
                    </span>

                    <span class="detail-value">
                        ${delivery.destination}
                    </span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">
                        Landmark
                    </span>

                    <span class="detail-value">
                        ${delivery.landmark}
                    </span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">
                        Package
                    </span>

                    <span class="detail-value">
                        ${delivery.itemDescription}
                    </span>
                </div>

            </div>

            <div class="card-actions">
                ${action
                ? `
                    <button
                        class="btn btn-primary rider-action-btn"
                        data-id="${delivery.deliveryId}"
                        data-status="${action.nextStatus}"
                    >
                        ${action.label}
                    </button>
                `
                : ""
            }
                ${delivery.deliveryStatus === "ASSIGNED"
                ? `
                    <button
                        class="btn btn-secondary rider-reject-btn"
                        data-id="${delivery.deliveryId}"
                    >
                        Reject
                    </button>
                `
                : ""
            }
            </div>
        `;

        container.appendChild(card);
    });

    addActionListeners();
}

// =========================================================
// RENDER DELIVERY HISTORY
// =========================================================

function renderHistory() {
    const container = document.getElementById("completedList");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const completedDeliveries = assignments.filter(
        (delivery) => delivery.deliveryStatus === "DELIVERED"
    );

    if (completedDeliveries.length === 0) {
        container.innerHTML = `
            <div class="rider-empty">
                No completed deliveries yet.
            </div>
        `;

        return;
    }

    completedDeliveries.forEach((delivery) => {
        const card = document.createElement("div");

        card.className = "assignment-card";

        card.innerHTML = `
            <div class="assignment-card-header">

                <div>
                    <h3>${delivery.deliveryId}</h3>

                    <p class="assignment-meta">
                        ${delivery.customerName}
                        •
                        ${delivery.destination}
                    </p>
                </div>

                <span class="status-badge status-delivered">
                    Delivered
                </span>

            </div>

            <div class="detail-grid">

                <div class="detail-item">
                    <span class="detail-label">
                        Customer
                    </span>

                    <span class="detail-value">
                        ${delivery.customerName}
                    </span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">
                        Destination
                    </span>

                    <span class="detail-value">
                        ${delivery.destination}
                    </span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">
                        Confirmation
                    </span>

                    <span class="detail-value">
                        ${delivery.confirmation || "Recorded"}
                    </span>
                </div>

            </div>
        `;

        container.appendChild(card);
    });
}

// =========================================================
// ACTION BUTTON LISTENERS
// =========================================================

function addActionListeners() {
    const buttons = document.querySelectorAll(
        ".rider-action-btn"
    );

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const deliveryId = button.dataset.id;
            const nextStatus = button.dataset.status;

            updateDeliveryStatus(
                deliveryId,
                nextStatus
            );
        });
    });

    const rejectButtons = document.querySelectorAll(".rider-reject-btn");

    rejectButtons.forEach((button) => {
        button.addEventListener("click", () => {
            rejectDelivery(button.dataset.id);
        });
    });
}

// =========================================================
// DASHBOARD ASSIGNMENT PREVIEW
// =========================================================

function renderDashboardPreview() {
    const container = document.getElementById("dashboardAssignments");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const activeAssignments = assignments
        .filter((delivery) => [
            "ASSIGNED",
            "ACCEPTED",
            "PICKED_UP",
            "OUT_FOR_DELIVERY"
        ].includes(delivery.deliveryStatus))
        .slice(0, 3);

    if (activeAssignments.length === 0) {
        container.innerHTML = `
            <div class="rider-empty">
                No active assignments.
            </div>
        `;
        return;
    }

    activeAssignments.forEach((delivery) => {
        const card = document.createElement("div");
        card.className = "assignment-card";
        card.innerHTML = `
            <div class="assignment-card-header">
                <div>
                    <h3>${delivery.deliveryId}</h3>
                    <p class="assignment-meta">
                        ${delivery.customerName} • ${delivery.destination}
                    </p>
                </div>
                <span class="status-badge ${getDeliveryStatusClass(delivery.deliveryStatus)}">
                    ${formatDeliveryStatus(delivery.deliveryStatus)}
                </span>
            </div>
        `;
        container.appendChild(card);
    });
}

// =========================================================
// RENDER EVERYTHING
// =========================================================

function renderAll() {
    renderRiderProfile();
    renderStatistics();
    renderDashboardPreview();
    renderAssignments();
    renderHistory();
}

// =========================================================
// AVAILABILITY / LOGOUT CONTROLS
// =========================================================

const availabilityButton = document.getElementById("availabilityToggle");

if (availabilityButton) {
    availabilityButton.addEventListener("click", toggleAvailability);
}

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", () => Wasili.logout());
}

// =========================================================
// INITIAL RENDER & BACKEND INITIALIZATION
// =========================================================

renderAll();
refreshData();

if (typeof Wasili.onDeliveryChange === "function") {
    Wasili.onDeliveryChange(() => refreshData());
}

// Safety net in case a Realtime event is ever dropped - a no-op re-fetch
// if nothing actually changed.
setInterval(() => refreshData(), 30000);