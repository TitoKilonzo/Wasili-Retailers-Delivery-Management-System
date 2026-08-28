"use strict";

// =========================================================
// WASILI DISPATCHER PORTAL
// Frontend prototype using temporary mock data
// Backend integration will be added after the UI workflow
// has been tested successfully.
// =========================================================


// =========================================================
// TEMPORARY MOCK DELIVERY DATA
// =========================================================

let deliveries = [
    {
        deliveryId: "DL-001",
        customerName: "Jane Wanjiku",
        customerPhone: "0712 345 678",
        destination: "Westlands, Nairobi",
        landmark: "Near Sarit Centre",
        itemDescription: "Small electronics package",
        vehicleType: "MOTORCYCLE",
        deliveryStatus: "OPEN",
        riderId: null
    },

    {
        deliveryId: "DL-002",
        customerName: "Peter Kamau",
        customerPhone: "0798 456 123",
        destination: "Kilimani, Nairobi",
        landmark: "Yaya Centre",
        itemDescription: "Documents and small package",
        vehicleType: "BICYCLE",
        deliveryStatus: "OPEN",
        riderId: null
    },

    {
        deliveryId: "DL-003",
        customerName: "Mary Njeri",
        customerPhone: "0722 987 654",
        destination: "CBD, Nairobi",
        landmark: "Near Kencom",
        itemDescription: "Clothing package",
        vehicleType: "CAR",
        deliveryStatus: "ASSIGNED",
        riderId: "RDR-003"
    },

    {
        deliveryId: "DL-004",
        customerName: "John Maina",
        customerPhone: "0701 333 999",
        destination: "Ruiru",
        landmark: "Near Ruiru Stadium",
        itemDescription: "Hardware equipment",
        vehicleType: "VAN",
        deliveryStatus: "OPEN",
        riderId: null
    }
];


// =========================================================
// TEMPORARY MOCK RIDER DATA
// =========================================================

let riders = [
    {
        riderId: "RDR-001",
        name: "Kevin Mwangi",
        phone: "0711 222 333",
        vehicleType: "MOTORCYCLE",
        capacity: 5,
        activeDeliveries: 2,
        riderStatus: "AVAILABLE"
    },

    {
        riderId: "RDR-002",
        name: "Brian Otieno",
        phone: "0700 555 888",
        vehicleType: "BICYCLE",
        capacity: 4,
        activeDeliveries: 1,
        riderStatus: "AVAILABLE"
    },

    {
        riderId: "RDR-003",
        name: "James Kariuki",
        phone: "0715 111 222",
        vehicleType: "CAR",
        capacity: 3,
        activeDeliveries: 3,
        riderStatus: "AT_CAPACITY"
    },

    {
        riderId: "RDR-004",
        name: "Samuel Kamau",
        phone: "0723 444 555",
        vehicleType: "VAN",
        capacity: 4,
        activeDeliveries: 0,
        riderStatus: "AVAILABLE"
    },

    {
        riderId: "RDR-005",
        name: "David Ochieng",
        phone: "0790 666 777",
        vehicleType: "TRUCK",
        capacity: 3,
        activeDeliveries: 3,
        riderStatus: "AT_CAPACITY"
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
// ASSIGN DELIVERY
// =========================================================

function assignDelivery(deliveryId) {

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
                )
        );


    if (compatibleRiders.length === 0) {

        alert(
            "No suitable rider is currently available for this delivery."
        );

        return;
    }


    const riderOptions =
        compatibleRiders
            .map(
                rider =>
                    `${rider.riderId} - ${rider.name} (${getVehicleLabel(rider.vehicleType)}, ${getRemainingCapacity(rider)} slots remaining)`
            )
            .join("\n");


    const selectedRiderId =
        prompt(
            `Select a suitable rider:\n\n${riderOptions}\n\nEnter Rider ID:`
        );


    if (!selectedRiderId) return;


    const selectedRider =
        riders.find(
            rider =>
                rider.riderId.toUpperCase() ===
                selectedRiderId.trim().toUpperCase()
        );


    if (!selectedRider) {

        alert(
            "Rider not found."
        );

        return;
    }


    if (!isVehicleCompatible(
        delivery,
        selectedRider
    )) {

        alert(
            "This rider's vehicle is not compatible with the delivery requirement."
        );

        return;
    }


    if (!isRiderOperational(
        selectedRider
    )) {

        alert(
            "This rider is not available or has no remaining capacity."
        );

        return;
    }


    delivery.riderId =
        selectedRider.riderId;

    delivery.deliveryStatus =
        "ASSIGNED";


    selectedRider.activeDeliveries += 1;


    if (
        selectedRider.activeDeliveries >=
        selectedRider.capacity
    ) {
        selectedRider.riderStatus =
            "AT_CAPACITY";
    }


    renderAll();


    alert(
        `${delivery.deliveryId} has been assigned to ${selectedRider.name}.`
    );
}


// =========================================================
// REASSIGN DELIVERY
// =========================================================

function reassignDelivery(deliveryId) {

    const delivery =
        deliveries.find(
            item =>
                item.deliveryId === deliveryId
        );


    if (!delivery) return;


    const currentRider =
        getRiderById(
            delivery.riderId
        );


    if (currentRider) {

        currentRider.activeDeliveries =
            Math.max(
                currentRider.activeDeliveries - 1,
                0
            );


        if (
            currentRider.riderStatus ===
            "AT_CAPACITY"
        ) {
            currentRider.riderStatus =
                "AVAILABLE";
        }
    }


    delivery.riderId = null;
    delivery.deliveryStatus = "OPEN";


    renderAll();


    alert(
        `${delivery.deliveryId} is now open for reassignment.`
    );
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
// INITIAL RENDER
// =========================================================

renderAll();