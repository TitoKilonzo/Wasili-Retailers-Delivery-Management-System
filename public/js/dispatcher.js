"use strict";

// =========================================================
// WASILI DISPATCHER PORTAL
// Backed live by Appwrite (see js/wasili-client.js) - deliveries and
// riders are loaded from TablesDB and kept in sync over Realtime.
// =========================================================

const dispatcherSession = Wasili.requireRole("dispatcher");

// Populated from the backend by refreshData(). Never mutated locally on
// a guess - every write goes through a Function and the arrays are only
// ever replaced wholesale by the next successful fetch, so the UI can't
// drift from what Appwrite actually has stored.
let deliveries = [];
let riders = [];

// Row field names from TablesDB don't all match this file's original
// mock shape (deliveryId/vehicleType/destination) - these two mappers
// bridge that gap so the render functions below didn't need a rewrite.
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
        riderId: row.riderId || null
    };
}

function mapRiderRow(row) {
    return {
        riderId: row.$id,
        name: row.name,
        phone: row.phone,
        vehicleType: row.vehicleType,
        capacity: row.capacity,
        activeDeliveries: row.activeDeliveries,
        riderStatus: row.riderStatus
    };
}

// Background polling (the 30s safety-net interval, and Realtime events
// firing off-screen) shouldn't pop a blocking alert() every time it hits
// the same error - once is a notification, every 30s forever is spam
// that locks up the tab. Only re-alert if the message actually changed.
let lastDispatcherErrorShown = null;

function showDispatcherError(message) {
    console.error(message);
    if (message === lastDispatcherErrorShown) return;
    lastDispatcherErrorShown = message;
    alert(message);
}

async function refreshData() {
    try {
        const [deliveryRows, riderRows] = await Promise.all([
            Wasili.listDeliveries(),
            Wasili.listRiders()
        ]);

        deliveries = deliveryRows.map(mapDeliveryRow);
        riders = riderRows.map(mapRiderRow);

        renderAll();
        lastDispatcherErrorShown = null;
    } catch (err) {
        console.error("Failed to load dispatcher data:", err);
        showDispatcherError(
            "Could not load deliveries/riders from the server: " + err.message
        );
    }
}

function updateDispatcherProfile() {
    const nameElement = document.getElementById("dispatcherName");
    const avatarElement = document.getElementById("dispatcherAvatar");

    if (dispatcherSession && nameElement) {
        nameElement.textContent = dispatcherSession.name;
    }

    if (dispatcherSession && avatarElement) {
        avatarElement.textContent = dispatcherSession.name
            .split(" ")
            .map((name) => name[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
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


function formatRiderStatus(status) {
    const statusNames = {
        AVAILABLE: "Available",
        AT_CAPACITY: "At Capacity",
        OFFLINE: "Offline",
        UNAVAILABLE: "Unavailable"
    };

    return statusNames[status] || status;
}


function getVehicleLabel(vehicleType) {
    const vehicles = {
        BICYCLE: "Bicycle",
        MOTORCYCLE: "Motorcycle",
        CAR: "Car",
        VAN: "Van",
        TRUCK: "Truck"
    };

    return vehicles[vehicleType] || vehicleType;
}


// =========================================================
// RIDER HELPERS
// =========================================================

function getRemainingCapacity(rider) {
    return Math.max(
        rider.capacity - rider.activeDeliveries,
        0
    );
}


function isRiderOperational(rider) {
    return (
        rider.riderStatus === "AVAILABLE" &&
        getRemainingCapacity(rider) > 0
    );
}


function isVehicleCompatible(delivery, rider) {
    return delivery.vehicleType === rider.vehicleType;
}


function getRiderById(riderId) {
    return riders.find(
        rider => rider.riderId === riderId
    );
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
        subtitle: "Manage delivery requests and rider assignments"
    },

    "delivery-requests": {
        title: "Delivery Requests",
        subtitle: "Review open deliveries and assign suitable riders"
    },

    riders: {
        title: "Riders",
        subtitle: "Review rider availability, capacity, and vehicle compatibility"
    },

    assignments: {
        title: "Assignments",
        subtitle: "Monitor active delivery assignments and reassign when necessary"
    }
};


function showSection(sectionId) {

    sections.forEach(section => {
        section.classList.remove("active-section");
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
    });


    const targetSection =
        document.getElementById(sectionId);

    if (targetSection) {
        targetSection.classList.add("active-section");
    }


    const activeLink =
        document.querySelector(
            `[data-section="${sectionId}"]`
        );

    if (activeLink) {
        activeLink.classList.add("active");
    }


    if (sectionTitles[sectionId]) {
        pageTitle.textContent =
            sectionTitles[sectionId].title;

        pageSubtitle.textContent =
            sectionTitles[sectionId].subtitle;
    }


    const sidebar =
        document.getElementById("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


navLinks.forEach(link => {

    link.addEventListener("click", () => {

        const section =
            link.dataset.section;

        showSection(section);

    });

});


// =========================================================
// MOBILE SIDEBAR
// =========================================================

const menuToggle =
    document.getElementById("menuToggle");


if (menuToggle) {

    menuToggle.addEventListener("click", () => {

        const sidebar =
            document.getElementById("sidebar");

        if (sidebar) {
            sidebar.classList.toggle("open");
        }

    });

}


// =========================================================
// DASHBOARD STATISTICS
// =========================================================

function renderStatistics() {

    const openCount =
        deliveries.filter(
            delivery =>
                delivery.deliveryStatus === "OPEN"
        ).length;


    const assignedCount =
        deliveries.filter(
            delivery =>
                [
                    "ASSIGNED",
                    "ACCEPTED",
                    "PICKED_UP",
                    "OUT_FOR_DELIVERY"
                ].includes(delivery.deliveryStatus)
        ).length;


    const availableRiderCount =
        riders.filter(
            rider =>
                isRiderOperational(rider)
        ).length;


    const atCapacityCount =
        riders.filter(
            rider =>
                rider.riderStatus === "AT_CAPACITY" ||
                getRemainingCapacity(rider) === 0
        ).length;


    const openElement =
        document.getElementById(
            "openDeliveries"
        );

    const assignedElement =
        document.getElementById(
            "assignedDeliveries"
        );

    const availableElement =
        document.getElementById(
            "availableRiders"
        );

    const capacityElement =
        document.getElementById(
            "ridersAtCapacity"
        );


    if (openElement) {
        openElement.textContent =
            openCount;
    }

    if (assignedElement) {
        assignedElement.textContent =
            assignedCount;
    }

    if (availableElement) {
        availableElement.textContent =
            availableRiderCount;
    }

    if (capacityElement) {
        capacityElement.textContent =
            atCapacityCount;
    }

}


// =========================================================
// RENDER OPEN DELIVERY REQUESTS
// =========================================================

function renderOpenDeliveries() {

    const tableBody =
        document.getElementById(
            "openDeliveriesBody"
        );


    if (!tableBody) return;


    tableBody.innerHTML = "";


    const openDeliveries =
        deliveries.filter(
            delivery =>
                delivery.deliveryStatus === "OPEN"
        );


    if (openDeliveries.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-muted">
                    No open delivery requests.
                </td>
            </tr>
        `;

        return;
    }


    openDeliveries.forEach(delivery => {

        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>
                <strong>
                    ${delivery.deliveryId}
                </strong>
            </td>

            <td>
                ${delivery.customerName}
            </td>

            <td>
                ${delivery.destination}
            </td>

            <td>
                ${getVehicleLabel(delivery.vehicleType)}
            </td>

            <td>
                <span class="status-badge ${getDeliveryStatusClass(delivery.deliveryStatus)}">
                    ${formatDeliveryStatus(delivery.deliveryStatus)}
                </span>
            </td>

            <td>
                <button
                    class="btn btn-primary table-action assign-request-btn"
                    data-id="${delivery.deliveryId}"
                >
                    Assign Rider
                </button>
            </td>
        `;


        tableBody.appendChild(row);

    });


    addAssignmentListeners();
}


// =========================================================
// RENDER RIDER AVAILABILITY
// =========================================================

function renderRiderAvailability() {

    const tableBody =
        document.getElementById(
            "riderAvailabilityBody"
        );


    if (!tableBody) return;


    tableBody.innerHTML = "";


    riders.forEach(rider => {

        const remaining =
            getRemainingCapacity(rider);


        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>
                <strong>
                    ${rider.name}
                </strong>
            </td>

            <td>
                <span class="rider-status ${rider.riderStatus.toLowerCase().replace("_", "-")}">
                    ${formatRiderStatus(rider.riderStatus)}
                </span>
            </td>

            <td>
                ${getVehicleLabel(rider.vehicleType)}
            </td>

            <td>
                ${rider.capacity}
            </td>

            <td>
                ${rider.activeDeliveries}
            </td>

            <td>
                <strong>
                    ${remaining}
                </strong>
            </td>
        `;


        tableBody.appendChild(row);

    });

}


// =========================================================
// RENDER DELIVERY REQUEST CARDS
// =========================================================

function renderDeliveryRequests() {

    const container =
        document.getElementById(
            "deliveryRequestList"
        );


    if (!container) return;


    container.innerHTML = "";


    const openDeliveries =
        deliveries.filter(
            delivery =>
                delivery.deliveryStatus === "OPEN"
        );


    if (openDeliveries.length === 0) {

        container.innerHTML = `
            <div class="dispatcher-empty">
                No open delivery requests.
            </div>
        `;

        return;
    }


    openDeliveries.forEach(delivery => {

        const card =
            document.createElement("div");

        card.className =
            "delivery-request-card";


        card.innerHTML = `
            <div class="delivery-request-header">

                <div>
                    <h3>
                        ${delivery.deliveryId}
                    </h3>

                    <p class="delivery-request-meta">
                        ${delivery.customerName}
                        •
                        ${delivery.customerPhone}
                    </p>
                </div>

                <span class="status-badge ${getDeliveryStatusClass(delivery.deliveryStatus)}">
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
                        Required Vehicle
                    </span>

                    <span class="detail-value">
                        ${getVehicleLabel(delivery.vehicleType)}
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

                <button
                    class="btn btn-primary btn-assign assign-request-btn"
                    data-id="${delivery.deliveryId}"
                >
                    Assign Rider
                </button>

            </div>
        `;


        container.appendChild(card);

    });


    addAssignmentListeners();
}


// =========================================================
// RENDER RIDER CARDS
// =========================================================

function renderRiders() {

    const container =
        document.getElementById(
            "riderList"
        );


    if (!container) return;


    container.innerHTML = "";


    riders.forEach(rider => {

        const remaining =
            getRemainingCapacity(rider);


        const percentage =
            rider.capacity > 0
                ? (rider.activeDeliveries / rider.capacity) * 100
                : 100;


        const card =
            document.createElement("div");

        card.className =
            "rider-card";


        if (remaining === 0) {
            card.classList.add("capacity-full");
        }


        card.innerHTML = `
            <div class="rider-card-header">

                <div>
                    <h3>
                        ${rider.name}
                    </h3>

                    <p class="rider-meta">
                        ${rider.phone}
                    </p>
                </div>

                <span class="rider-status ${rider.riderStatus.toLowerCase().replace("_", "-")}">
                    ${formatRiderStatus(rider.riderStatus)}
                </span>

            </div>


            <div class="detail-grid">

                <div class="detail-item">
                    <span class="detail-label">
                        Vehicle
                    </span>

                    <span class="detail-value">
                        ${getVehicleLabel(rider.vehicleType)}
                    </span>
                </div>


                <div class="detail-item">
                    <span class="detail-label">
                        Capacity
                    </span>

                    <span class="detail-value">
                        ${rider.capacity}
                    </span>
                </div>


                <div class="detail-item">
                    <span class="detail-label">
                        Remaining
                    </span>

                    <span class="detail-value">
                        ${remaining}
                    </span>
                </div>

            </div>


            <div class="capacity-text">
                <span>
                    Active deliveries
                </span>

                <span>
                    ${rider.activeDeliveries} / ${rider.capacity}
                </span>
            </div>


            <div class="capacity-bar">

                <div
                    class="capacity-fill"
                    style="width: ${Math.min(percentage, 100)}%"
                ></div>

            </div>
        `;


        container.appendChild(card);

    });

}


// =========================================================
// RENDER ASSIGNMENTS
// =========================================================

function renderAssignments() {

    const container =
        document.getElementById(
            "assignmentList"
        );


    if (!container) return;


    container.innerHTML = "";


    const assignments =
        deliveries.filter(
            delivery =>
                delivery.riderId &&
                [
                    "ASSIGNED",
                    "ACCEPTED",
                    "PICKED_UP",
                    "OUT_FOR_DELIVERY"
                ].includes(delivery.deliveryStatus)
        );


    if (assignments.length === 0) {

        container.innerHTML = `
            <div class="dispatcher-empty">
                No active assignments.
            </div>
        `;

        return;
    }


    assignments.forEach(delivery => {

        const rider =
            getRiderById(
                delivery.riderId
            );


        const card =
            document.createElement("div");

        card.className =
            "assignment-card";


        card.innerHTML = `
            <div class="assignment-card-header">

                <div>
                    <h3>
                        ${delivery.deliveryId}
                    </h3>

                    <p class="assignment-meta">
                        ${delivery.customerName}
                        •
                        ${delivery.destination}
                    </p>
                </div>

                <span class="status-badge ${getDeliveryStatusClass(delivery.deliveryStatus)}">
                    ${formatDeliveryStatus(delivery.deliveryStatus)}
                </span>

            </div>


            <div class="detail-grid">

                <div class="detail-item">
                    <span class="detail-label">
                        Rider
                    </span>

                    <span class="detail-value">
                        ${rider ? rider.name : "Unknown"}
                    </span>
                </div>


                <div class="detail-item">
                    <span class="detail-label">
                        Vehicle
                    </span>

                    <span class="detail-value">
                        ${rider ? getVehicleLabel(rider.vehicleType) : "-"}
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

            </div>


            <div class="card-actions">

                <button
                    class="btn btn-reassign reassign-btn"
                    data-id="${delivery.deliveryId}"
                >
                    Reassign
                </button>

            </div>
        `;


        container.appendChild(card);

    });


    addReassignListeners();
}


// =========================================================
// ASSIGN / REASSIGN DELIVERY
// =========================================================
// Both flows call the same assign-delivery Function - it already
// distinguishes a fresh OPEN->ASSIGNED assignment from a reassignment of
// an ASSIGNED/ACCEPTED delivery (see functions/assign-delivery). This
// file only picks the rider and lets the server enforce capacity,
// vehicle compatibility, and status rules - those checks below are a
// convenience filter for the prompt, not the source of truth.

async function assignDelivery(deliveryId) {

    const delivery =
        deliveries.find(
            item =>
                item.deliveryId === deliveryId
        );


    if (!delivery) return;


    const compatibleRiders =
        riders.filter(
            rider =>
                isRiderOperational(rider) &&
                isVehicleCompatible(
                    delivery,
                    rider
                ) &&
                rider.riderId !== delivery.riderId
        );

    openRiderModal(delivery, compatibleRiders);
}

// =========================================================
// ASSIGN RIDER MODAL
// Replaces the old prompt()-based picker with an actual clickable
// list of every currently compatible rider - the dispatcher sees
// real names, vehicles and remaining capacity instead of typing a
// raw rider ID copied out of a browser prompt.
// =========================================================

const riderModalOverlay = document.getElementById("riderModalOverlay");
const riderModalList = document.getElementById("riderModalList");
const riderModalSubtitle = document.getElementById("riderModalSubtitle");
const riderModalClose = document.getElementById("riderModalClose");

function openRiderModal(delivery, compatibleRiders) {
    if (!riderModalOverlay) return;

    riderModalSubtitle.textContent =
        `${delivery.customerName} - ${getVehicleLabel(delivery.vehicleType)} required`;

    riderModalList.innerHTML = "";

    if (compatibleRiders.length === 0) {
        riderModalList.innerHTML =
            `<div class="rider-modal-empty">No suitable rider is currently available for this delivery.</div>`;
    } else {
        compatibleRiders
            .slice()
            .sort((a, b) => getRemainingCapacity(b) - getRemainingCapacity(a))
            .forEach(rider => {
                const option = document.createElement("button");
                option.type = "button";
                option.className = "rider-modal-option";
                option.innerHTML = `
                    <div>
                        <div class="rider-modal-option-name">${rider.name}</div>
                        <div class="rider-modal-option-meta">
                            ${getVehicleLabel(rider.vehicleType)} &middot; ${rider.phone}
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
        showDispatcherError("Could not assign this delivery: " + err.message);
    }
}

if (riderModalClose) riderModalClose.addEventListener("click", closeRiderModal);
if (riderModalOverlay) {
    riderModalOverlay.addEventListener("click", (e) => {
        if (e.target === riderModalOverlay) closeRiderModal();
    });
}


// =========================================================
// REASSIGN DELIVERY
// =========================================================

function reassignDelivery(deliveryId) {
    // Reassigning just re-runs the assignment flow: the server already
    // treats an ASSIGNED/ACCEPTED delivery as a reassignment target and
    // releases the previous rider's capacity itself.
    assignDelivery(deliveryId);
}


// =========================================================
// BUTTON LISTENERS
// =========================================================

function addAssignmentListeners() {

    const buttons =
        document.querySelectorAll(
            ".assign-request-btn"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const deliveryId =
                    button.dataset.id;

                assignDelivery(
                    deliveryId
                );

            }
        );

    });
}


function addReassignListeners() {

    const buttons =
        document.querySelectorAll(
            ".reassign-btn"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const deliveryId =
                    button.dataset.id;

                reassignDelivery(
                    deliveryId
                );

            }
        );

    });
}


// =========================================================
// QUICK NAVIGATION
// =========================================================

const viewAllRequests =
    document.getElementById(
        "viewAllRequests"
    );


if (viewAllRequests) {

    viewAllRequests.addEventListener(
        "click",
        () => {
            showSection(
                "delivery-requests"
            );
        }
    );

}


const viewAllRiders =
    document.getElementById(
        "viewAllRiders"
    );


if (viewAllRiders) {

    viewAllRiders.addEventListener(
        "click",
        () => {
            showSection(
                "riders"
            );
        }
    );

}


// =========================================================
// RENDER EVERYTHING
// =========================================================

function renderAll() {

    renderStatistics();

    renderOpenDeliveries();

    renderRiderAvailability();

    renderDeliveryRequests();

    renderRiders();

    renderAssignments();

}


// =========================================================
// INITIAL RENDER & BACKEND INITIALIZATION
// =========================================================

updateDispatcherProfile();
renderAll();
refreshData();

if (typeof Wasili.onDeliveryChange === "function") {
    Wasili.onDeliveryChange(() => refreshData());
}

if (typeof Wasili.onRiderChange === "function") {
    Wasili.onRiderChange(() => refreshData());
}

// Realtime should catch every rider/retailer action instantly, but if a
// WebSocket event is ever dropped (network blip, reconnect gap) the
// dispatcher view could go stale silently. This periodic poll is a
// low-cost safety net - it just re-runs the same refreshData() Realtime
// already triggers, so it's a no-op if nothing changed.
setInterval(() => refreshData(), 30000);

const dispatcherLogoutButton = document.getElementById("logoutButton");
if (dispatcherLogoutButton) {
    dispatcherLogoutButton.addEventListener("click", () => Wasili.logout());
}