"use strict";

// =========================================================
// WASILI RIDER PORTAL
// Rider-specific frontend prototype using temporary mock data
// =========================================================

// =========================================================
// TEMPORARY MOCK RIDER
// =========================================================

const currentRider = {
    riderId: "RDR-001",
    name: "Kevin Mwangi",
    phone: "0711 222 333",
    vehicleType: "MOTORCYCLE",
    riderStatus: "AVAILABLE"
};

// =========================================================
// TEMPORARY MOCK DELIVERY ASSIGNMENTS
// =========================================================

let assignments = [
    {
        deliveryId: "DL-101",
        customerName: "Jane Wanjiku",
        customerPhone: "0712 345 678",
        destination: "Westlands, Nairobi",
        landmark: "Near Sarit Centre",
        itemDescription: "Small electronics package",
        vehicleType: "MOTORCYCLE",
        deliveryStatus: "ASSIGNED",
        riderId: "RDR-001",
        confirmation: null
    },
    {
        deliveryId: "DL-102",
        customerName: "Peter Kamau",
        customerPhone: "0798 456 123",
        destination: "Kilimani, Nairobi",
        landmark: "Yaya Centre",
        itemDescription: "Documents and small package",
        vehicleType: "MOTORCYCLE",
        deliveryStatus: "ACCEPTED",
        riderId: "RDR-001",
        confirmation: null
    }
];

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

    if (nameElement) {
        nameElement.textContent = currentRider.name;
    }

    if (avatarElement) {
        avatarElement.textContent = currentRider.name
            .split(" ")
            .map((name) => name[0])
            .join("");
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

    const assignedElement = document.getElementById("assignedDeliveries");
    const activeElement = document.getElementById("activeDeliveries");
    const completedElement = document.getElementById("completedDeliveries");

    if (assignedElement) {
        assignedElement.textContent = assignments.length;
    }

    if (activeElement) {
        activeElement.textContent = activeAssignments.length;
    }

    if (completedElement) {
        completedElement.textContent = completedDeliveries.length;
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

function updateDeliveryStatus(deliveryId, nextStatus) {
    const delivery = assignments.find(
        (item) => item.deliveryId === deliveryId
    );

    if (!delivery) {
        return;
    }

    const validNextAction = getNextAction(delivery.deliveryStatus);

    if (!validNextAction) {
        alert("No further action is available for this delivery.");
        return;
    }

    if (validNextAction.nextStatus !== nextStatus) {
        alert("Invalid delivery status transition.");
        return;
    }

    if (nextStatus === "DELIVERED") {
        const confirmation = prompt(
            "Enter delivery confirmation:"
        );

        if (!confirmation || !confirmation.trim()) {
            alert(
                "Delivery confirmation is required before marking the delivery as delivered."
            );
            return;
        }

        delivery.confirmation = confirmation.trim();
    }

    delivery.deliveryStatus = nextStatus;

    renderAll();

    alert(
        `${delivery.deliveryId} is now ${formatDeliveryStatus(nextStatus)}.`
    );
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

            ${action
                ? `
                <div class="card-actions">
                    <button
                        class="btn btn-primary rider-action-btn"
                        data-id="${delivery.deliveryId}"
                        data-status="${action.nextStatus}"
                    >
                        ${action.label}
                    </button>
                </div>
            `
                : ""
            }
        `;

        container.appendChild(card);
    });

    addActionListeners();
}

// =========================================================
// RENDER DELIVERY HISTORY
// =========================================================

function renderHistory() {
    const container = document.getElementById("historyList");

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
}

// =========================================================
// RENDER EVERYTHING
// =========================================================

function renderAll() {
    renderRiderProfile();
    renderStatistics();
    renderAssignments();
    renderHistory();
}

// =========================================================
// INITIAL RENDER
// =========================================================

renderAll();