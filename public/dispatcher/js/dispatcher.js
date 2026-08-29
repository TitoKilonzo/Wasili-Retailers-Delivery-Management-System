"use strict";

/*
 * WASILI DISPATCHER PORTAL
 * Victor's frontend implementation
 *
 * Temporary frontend data only.
 * Backend integration will be handled separately.
 */


// =========================================================
// MOCK DATA
// =========================================================

const deliveries = [
    {
        id: "DL-001",
        customer: "Jane Wanjiku",
        destination: "Westlands, Nairobi",
        vehicle: "Motorcycle",
        status: "Open",
        rider: null
    },
    {
        id: "DL-002",
        customer: "Peter Kamau",
        destination: "Kilimani, Nairobi",
        vehicle: "Bicycle",
        status: "Open",
        rider: null
    },
    {
        id: "DL-003",
        customer: "Mary Njeri",
        destination: "CBD, Nairobi",
        vehicle: "Car",
        status: "Assigned",
        rider: "James Kariuki"
    },
    {
        id: "DL-004",
        customer: "John Maina",
        destination: "Ruiru",
        vehicle: "Van",
        status: "Open",
        rider: null
    }
];


const riders = [
    {
        id: "RDR-001",
        name: "Kevin Mwangi",
        status: "Available",
        vehicle: "Motorcycle",
        capacity: 5,
        active: 2
    },
    {
        id: "RDR-002",
        name: "Brian Otieno",
        status: "Available",
        vehicle: "Bicycle",
        capacity: 4,
        active: 1
    },
    {
        id: "RDR-003",
        name: "James Kariuki",
        status: "At Capacity",
        vehicle: "Car",
        capacity: 3,
        active: 3
    },
    {
        id: "RDR-004",
        name: "Samuel Kamau",
        status: "Available",
        vehicle: "Van",
        capacity: 4,
        active: 0
    },
    {
        id: "RDR-005",
        name: "David Ochieng",
        status: "At Capacity",
        vehicle: "Truck",
        capacity: 3,
        active: 3
    }
];


// =========================================================
// DOM REFERENCES
// =========================================================

const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".portal-section");

const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");


// =========================================================
// PAGE INFORMATION
// =========================================================

const pageInfo = {
    dashboard: {
        title: "Dashboard",
        description:
            "Manage delivery requests, riders and assignments."
    },

    requests: {
        title: "Delivery Requests",
        description:
            "Review incoming deliveries and assign riders."
    },

    riders: {
        title: "Riders",
        description:
            "Monitor rider availability and delivery capacity."
    },

    assignments: {
        title: "Assignments",
        description:
            "Monitor active delivery assignments."
    }
};


// =========================================================
// NAVIGATION
// =========================================================

function navigateTo(sectionId) {

    sections.forEach(section => {
        section.classList.remove("active");
    });

    navItems.forEach(item => {
        item.classList.remove("active");
    });


    const targetSection =
        document.getElementById(sectionId);

    const targetNav =
        document.querySelector(
            `.nav-item[data-section="${sectionId}"]`
        );


    if (targetSection) {
        targetSection.classList.add("active");
    }


    if (targetNav) {
        targetNav.classList.add("active");
    }


    if (pageInfo[sectionId]) {

        pageTitle.textContent =
            pageInfo[sectionId].title;

        pageDescription.textContent =
            pageInfo[sectionId].description;
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


navItems.forEach(item => {

    item.addEventListener("click", () => {

        const section =
            item.dataset.section;

        navigateTo(section);

    });

});


// =========================================================
// QUICK NAVIGATION BUTTONS
// =========================================================

document.querySelectorAll("[data-navigate]").forEach(button => {

    button.addEventListener("click", () => {

        navigateTo(
            button.dataset.navigate
        );

    });

});


// =========================================================
// DELIVERY HELPERS
// =========================================================

function getOpenDeliveries() {

    return deliveries.filter(
        delivery =>
            delivery.status === "Open"
    );
}


function getAssignedDeliveries() {

    return deliveries.filter(
        delivery =>
            delivery.status === "Assigned"
    );

}


function getRemainingCapacity(rider) {

    return Math.max(
        rider.capacity - rider.active,
        0
    );

}


function getAvailableRiders() {

    return riders.filter(rider => {

        return (
            rider.status === "Available" &&
            getRemainingCapacity(rider) > 0
        );

    });

}


function getCapacityRiders() {

    return riders.filter(rider => {

        return (
            rider.status === "At Capacity" ||
            getRemainingCapacity(rider) === 0
        );

    });

}


// =========================================================
// STATUS BADGES
// =========================================================

function getStatusClass(status) {

    return status
        .toLowerCase()
        .replace(/\s+/g, "-");

}


function createStatusBadge(status) {

    return `
        <span class="status-badge status-${getStatusClass(status)}">
            ${status}
        </span>
    `;

}


// =========================================================
// DASHBOARD STATISTICS
// =========================================================

function renderStatistics() {

    const openElement =
        document.getElementById(
            "open-deliveries"
        );

    const assignedElement =
        document.getElementById(
            "assigned-deliveries"
        );

    const availableElement =
        document.getElementById(
            "available-riders"
        );

    const capacityElement =
        document.getElementById(
            "capacity-riders"
        );


    if (openElement) {

        openElement.textContent =
            getOpenDeliveries().length;

    }


    if (assignedElement) {

        assignedElement.textContent =
            getAssignedDeliveries().length;

    }


    if (availableElement) {

        availableElement.textContent =
            getAvailableRiders().length;

    }


    if (capacityElement) {

        capacityElement.textContent =
            getCapacityRiders().length;

    }

}


// =========================================================
// DASHBOARD REQUEST TABLE
// =========================================================

function renderRequestTable() {

    const table =
        document.getElementById(
            "requests-table"
        );

    if (!table) return;


    const openDeliveries =
        getOpenDeliveries();


    if (openDeliveries.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    No open delivery requests.
                </td>
            </tr>
        `;

        return;
    }


    table.innerHTML =
        openDeliveries.map(delivery => {

            return `
                <tr>

                    <td>
                        <strong>
                            ${delivery.id}
                        </strong>
                    </td>

                    <td>
                        ${delivery.customer}
                    </td>

                    <td>
                        ${delivery.destination}
                    </td>

                    <td>
                        ${delivery.vehicle}
                    </td>

                    <td>
                        ${createStatusBadge(delivery.status)}
                    </td>

                    <td>
                        <button
                            class="secondary-button assign-button"
                            data-delivery="${delivery.id}"
                        >
                            Assign
                        </button>
                    </td>

                </tr>
            `;

        }).join("");


    attachAssignButtons();

}


// =========================================================
// RIDER TABLE
// =========================================================

function renderRiderTable() {

    const table =
        document.getElementById(
            "riders-table"
        );

    if (!table) return;


    table.innerHTML =
        riders.map(rider => {

            const remaining =
                getRemainingCapacity(rider);


            return `
                <tr>

                    <td>
                        <strong>
                            ${rider.name}
                        </strong>
                    </td>

                    <td>
                        ${createStatusBadge(rider.status)}
                    </td>

                    <td>
                        ${rider.vehicle}
                    </td>

                    <td>
                        ${rider.capacity}
                    </td>

                    <td>
                        ${rider.active}
                    </td>

                    <td>
                        <strong>
                            ${remaining}
                        </strong>
                    </td>

                </tr>
            `;

        }).join("");

}


// =========================================================
// DELIVERY REQUEST CARDS
// =========================================================

function renderRequestCards() {

    const container =
        document.getElementById(
            "request-list"
        );

    if (!container) return;


    const openDeliveries =
        getOpenDeliveries();


    if (openDeliveries.length === 0) {

        container.innerHTML = `
            <div class="empty-panel">
                No delivery requests available.
            </div>
        `;

        return;
    }


    container.innerHTML =
        openDeliveries.map(delivery => {

            return `
                <article class="request-card panel">

                    <div class="panel-header">

                        <div>

                            <h3>
                                ${delivery.id}
                            </h3>

                            <p>
                                ${delivery.customer}
                            </p>

                        </div>

                        ${createStatusBadge(
                            delivery.status
                        )}

                    </div>


                    <div class="request-details">

                        <div>
                            <small>Destination</small>
                            <strong>
                                ${delivery.destination}
                            </strong>
                        </div>

                        <div>
                            <small>Vehicle</small>
                            <strong>
                                ${delivery.vehicle}
                            </strong>
                        </div>
                        
                    </div>


                    <div class="card-actions">

                        <button
                            class="secondary-button assign-button"
                            data-delivery="${delivery.id}"
                        >
                            Assign Rider
                        </button>

                    </div>

                </article>
            `;

        }).join("");


    attachAssignButtons();

}


// =========================================================
// RIDER CARDS
// =========================================================

function renderRiderCards() {

    const container =
        document.getElementById(
            "rider-list"
        );

    if (!container) return;


    container.innerHTML =
        riders.map(rider => {

            const remaining =
                getRemainingCapacity(rider);

            const percentage =
                Math.min(
                    (rider.active / rider.capacity) * 100,
                    100
                );


            return `
                <article class="rider-card panel">

                    <div class="panel-header">

                        <div>

                            <h3>
                                ${rider.name}
                            </h3>

                            <p>
                                ${rider.id}
                            </p>

                        </div>

                        ${createStatusBadge(
                            rider.status
                        )}

                    </div>


                    <div class="request-details">

                        <div>
                            <small>Vehicle</small>
                            <strong>
                                ${rider.vehicle}
                            </strong>
                        </div>

                        <div>
                            <small>Capacity</small>
                            <strong>
                                ${rider.capacity}
                            </strong>
                        </div>

                        <div>
                            <small>Remaining</small>
                            <strong>
                                ${remaining}
                            </strong>
                        </div>

                    </div>


                    <div class="capacity-info">

                        <span>
                            Active deliveries
                        </span>

                        <span>
                            ${rider.active}
                            /
                            ${rider.capacity}
                        </span>

                    </div>


                    <div class="capacity-bar">

                        <div
                            class="capacity-fill"
                            style="width: ${percentage}%"
                        ></div>

                    </div>

                </article>
            `;

        }).join("");

}


// =========================================================
// ASSIGNMENT CARDS
// =========================================================

function renderAssignmentCards() {

    const container =
        document.getElementById(
            "assignment-list"
        );

    if (!container) return;


    const assignments =
        getAssignedDeliveries();


    if (assignments.length === 0) {

        container.innerHTML = `
            <div class="empty-panel">
                No active assignments.
            </div>
        `;

        return;
    }


    container.innerHTML =
        assignments.map(delivery => {

            return `
                <article class="assignment-card panel">

                    <div class="panel-header">

                        <div>

                            <h3>
                                ${delivery.id}
                            </h3>

                            <p>
                                ${delivery.customer}
                                •
                                ${delivery.destination}
                            </p>

                        </div>

                        ${createStatusBadge(
                            delivery.status
                        )}

                    </div>


                    <div class="request-details">

                        <div>
                            <small>Rider</small>

                            <strong>
                                ${delivery.rider}
                            </strong>
                        </div>

                        <div>
                            <small>Vehicle</small>

                            <strong>
                                ${delivery.vehicle}
                            </strong>
                        </div>

                        <div>
                            <small>Destination</small>

                            <strong>
                                ${delivery.destination}
                            </strong>
                        </div>

                    </div>

                </article>
            `;

        }).join("");

}


// =========================================================
// ASSIGNMENT ACTION
// =========================================================

function assignDelivery(deliveryId) {

    const delivery =
        deliveries.find(
            item =>
                item.id === deliveryId
        );


    if (!delivery) return;


    const compatibleRiders =
        getAvailableRiders().filter(
            rider =>
                rider.vehicle ===
                delivery.vehicle
        );


    if (compatibleRiders.length === 0) {

        alert(
            "No compatible rider is currently available."
        );

        return;
    }


    const options =
        compatibleRiders.map(
            rider =>
                `${rider.id} - ${rider.name}`
        ).join("\n");


    const selected =
        prompt(
            `Select a rider:\n\n${options}\n\nEnter Rider ID:`
        );


    if (!selected) return;


    const rider =
        compatibleRiders.find(
            item =>
                item.id.toLowerCase() ===
                selected.trim().toLowerCase()
        );


    if (!rider) {

        alert(
            "Rider not found."
        );

        return;
    }


    delivery.rider =
        rider.name;

    delivery.status =
        "Assigned";


    rider.active += 1;


    if (
        rider.active >=
        rider.capacity
    ) {

        rider.status =
            "At Capacity";

    }


    renderAll();


    alert(
        `${delivery.id} assigned to ${rider.name}.`
    );

}


// =========================================================
// BUTTON LISTENERS
// =========================================================

function attachAssignButtons() {

    document
        .querySelectorAll(".assign-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    assignDelivery(
                        button.dataset.delivery
                    );

                }
            );

        });

}


// =========================================================
// RENDER EVERYTHING
// =========================================================

function renderAll() {

    renderStatistics();

    renderRequestTable();

    renderRiderTable();

    renderRequestCards();

    renderRiderCards();

    renderAssignmentCards();

}


// =========================================================
// INITIALIZE
// =========================================================

renderAll();