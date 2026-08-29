// ============================================================================
// BACKEND-BACKED DELIVERY DATA
// ============================================================================
// Loaded from Appwrite TablesDB via public/js/wasili-client.js. Never
// seeded or mutated locally - deliveries is only ever replaced wholesale
// by syncWithBackend(), so the UI can't drift from what the server has
// actually stored. Starts empty until the first sync completes.
// ============================================================================

const retailerSession = Wasili.requireRole("retailerstaff");

let deliveries = [];


// ========================================
// STATUS HELPERS
// ========================================

function formatStatus(status) {

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


function getStatusClass(status) {

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


function getVehicleIcon(vehicle) {

    const icons = {
        Motorcycle: "🏍",
        Bicycle: "🚲",
        Van: "🚐",
        Car: "🚗",
        Truck: "🚚"
    };

    return icons[vehicle] || "📦";
}


// ========================================
// NAVIGATION
// ========================================

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".portal-section");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");


function showSection(sectionId) {

    sections.forEach(section => {
        section.classList.remove("active-section");
    });

    navLinks.forEach(link => {
        link.classList.remove("active");
    });

    document
        .getElementById(sectionId)
        .classList
        .add("active-section");

    document
        .querySelector(`[data-section="${sectionId}"]`)
        ?.classList
        .add("active");


    const titles = {

        dashboard: {
            title: "Dashboard",
            subtitle: "Manage and track your delivery requests"
        },

        "new-delivery": {
            title: "New Delivery Request",
            subtitle: "Create a delivery request for your customer"
        },

        "delivery-status": {
            title: "Delivery Status",
            subtitle: "Track delivery progress and rider information"
        }

    };

    if (titles[sectionId]) {

        pageTitle.textContent =
            titles[sectionId].title;

        pageSubtitle.textContent =
            titles[sectionId].subtitle;
    }


    document
        .getElementById("sidebar")
        .classList
        .remove("open");

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


// ========================================
// QUICK NAVIGATION BUTTONS
// ========================================

document
    .getElementById("quickNewDelivery")
    .addEventListener("click", () => {

        showSection("new-delivery");

    });


document
    .getElementById("dashboardNewDelivery")
    .addEventListener("click", () => {

        showSection("new-delivery");

    });


document
    .getElementById("statusNewDelivery")
    .addEventListener("click", () => {

        showSection("new-delivery");

    });


document
    .getElementById("viewAllStatus")
    .addEventListener("click", () => {

        showSection("delivery-status");

    });


document
    .getElementById("cancelForm")
    .addEventListener("click", () => {

        document
            .getElementById("deliveryForm")
            .reset();

        showSection("dashboard");

    });


// ========================================
// MOBILE SIDEBAR
// ========================================

document
    .getElementById("menuToggle")
    .addEventListener("click", () => {

        document
            .getElementById("sidebar")
            .classList
            .toggle("open");

    });


// ========================================
// RENDER STATISTICS
// ========================================

function renderStatistics() {

    const total =
        deliveries.length;

    const open =
        deliveries.filter(
            delivery => delivery.status === "OPEN"
        ).length;


    const inProgress =
        deliveries.filter(
            delivery =>
                [
                    "ASSIGNED",
                    "ACCEPTED",
                    "PICKED_UP",
                    "OUT_FOR_DELIVERY"
                ].includes(delivery.status)
        ).length;


    const delivered =
        deliveries.filter(
            delivery =>
                delivery.status === "DELIVERED"
        ).length;


    document
        .getElementById("totalDeliveries")
        .textContent = total;

    document
        .getElementById("openDeliveries")
        .textContent = open;

    document
        .getElementById("inProgressDeliveries")
        .textContent = inProgress;

    document
        .getElementById("deliveredDeliveries")
        .textContent = delivered;
}


// ========================================
// RENDER RECENT DELIVERIES TABLE
// ========================================

function renderRecentDeliveries() {

    const tableBody =
        document.getElementById(
            "recentDeliveriesBody"
        );

    tableBody.innerHTML = "";


    const recentDeliveries =
        deliveries.slice(0, 5);


    recentDeliveries.forEach(delivery => {

        const riderName =
            delivery.rider
                ? delivery.rider.name
                : "Not assigned";


        const row = document.createElement("tr");


        row.innerHTML = `

            <td>
                <strong>${delivery.id}</strong>
            </td>

            <td>
                ${delivery.customerName}
            </td>

            <td>
                ${delivery.destination}
            </td>

            <td>
                ${getVehicleIcon(delivery.vehicle)}
                ${delivery.vehicle}
            </td>

            <td>

                <span class="
                    status-badge
                    ${getStatusClass(delivery.status)}
                ">

                    ${formatStatus(delivery.status)}

                </span>

            </td>

            <td>
                ${riderName}
            </td>

        `;


        tableBody.appendChild(row);

    });

}


// ========================================
// RENDER DELIVERY STATUS CARDS
// ========================================

function renderDeliveryStatuses() {

    const container =
        document.getElementById(
            "deliveryStatusList"
        );


    container.innerHTML = "";


    if (deliveries.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No deliveries have been created yet.
            </div>
        `;

        return;
    }


    deliveries.forEach(delivery => {

        const deliveryCard =
            document.createElement("div");

        deliveryCard.className =
            "delivery-item";


        const riderHTML =
            delivery.rider
                ? `

                <div class="rider-card">

                    <div class="rider-avatar">
                        ${delivery.rider.name
                    .split(" ")
                    .map(name => name[0])
                    .join("")
                    .substring(0, 2)
                }
                    </div>

                    <div class="rider-info">

                        <strong>
                            ${delivery.rider.name}
                        </strong>

                        <span>
                            Assigned Rider •
                            ${getVehicleIcon(
                    delivery.rider.vehicle
                )}

                            ${delivery.rider.vehicle}
                        </span>

                        <span>
                            ${delivery.rider.phone}
                        </span>

                    </div>

                </div>

                `

                : `

                <div class="rider-card">

                    <div class="rider-avatar">
                        ?
                    </div>

                    <div class="rider-info">

                        <strong>
                            Rider not assigned yet
                        </strong>

                        <span>
                            The dispatcher will assign
                            a suitable rider.
                        </span>

                    </div>

                </div>

                `;


        const canCancel =
            delivery.status !== "DELIVERED" &&
            delivery.status !== "CANCELLED";


        deliveryCard.innerHTML = `

            <div class="delivery-item-header">

                <div>

                    <h3 class="delivery-id">
                        ${delivery.id}
                    </h3>

                    <p class="delivery-customer">
                        ${delivery.customerName}
                        •
                        ${delivery.phone}
                    </p>

                </div>


                <span class="
                    status-badge
                    ${getStatusClass(delivery.status)}
                ">

                    ${formatStatus(delivery.status)}

                </span>

            </div>


            <div class="delivery-details-grid">

                <div>

                    <span class="detail-label">
                        Destination
                    </span>

                    <span class="detail-value">
                        ${delivery.destination}
                    </span>

                </div>


                <div>

                    <span class="detail-label">
                        Vehicle
                    </span>

                    <span class="detail-value">

                        ${getVehicleIcon(delivery.vehicle)}
                        ${delivery.vehicle}

                    </span>

                </div>


                <div>

                    <span class="detail-label">
                        Package
                    </span>

                    <span class="detail-value">
                        ${delivery.itemDescription}
                    </span>

                </div>

            </div>


            ${riderHTML}


            ${canCancel

                ? `

                    <div class="delivery-actions">

                        <button
                            class="btn btn-danger cancel-delivery-btn"
                            data-id="${delivery.id}"
                        >

                            Cancel Delivery

                        </button>

                    </div>

                    `

                : ""

            }

        `;


        container.appendChild(
            deliveryCard
        );

    });


    addCancelListeners();

}


// ========================================
// DATA NORMALIZATION & FORMATTING HELPERS
// ========================================

function formatKenyanPhone(phone) {
    let cleaned = (phone || "").replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+254")) {
        cleaned = "0" + cleaned.slice(4);
    } else if (cleaned.startsWith("254")) {
        cleaned = "0" + cleaned.slice(3);
    }
    return cleaned;
}

function formatVehicle(vehicle) {
    if (!vehicle) return "Motorcycle";
    const v = vehicle.toUpperCase();
    const map = {
        BICYCLE: "Bicycle",
        MOTORCYCLE: "Motorcycle",
        CAR: "Car",
        VAN: "Van",
        TRUCK: "Truck"
    };
    return map[v] || vehicle;
}

function mapRowToDelivery(row, ridersMap = {}) {
    const rider = (row.riderId && ridersMap[row.riderId]) ? {
        name: ridersMap[row.riderId].name,
        phone: ridersMap[row.riderId].phone,
        vehicle: formatVehicle(ridersMap[row.riderId].vehicleType)
    } : null;

    return {
        id: row.$id || row.id,
        customerName: row.customerName,
        phone: row.customerPhone || row.phone,
        destination: row.address || row.destination,
        landmark: row.landmark || "",
        itemDescription: row.itemDescription,
        vehicle: formatVehicle(row.requiredVehicleType || row.vehicle),
        rawVehicle: row.requiredVehicleType || row.vehicle,
        notes: row.notes || "",
        status: row.deliveryStatus || row.status,
        rider: rider,
        riderId: row.riderId,
        confirmationCode: row.confirmationCode
    };
}

// ========================================
// BACKEND API INTEGRATION (WASILI CLIENT)
// ========================================

function showErrorMessage(message) {
    console.error(message);
    alert(message);
}

async function syncWithBackend() {
    try {
        const [rows, riders] = await Promise.all([
            Wasili.listDeliveries(),
            Wasili.listRiders()
        ]);

        const ridersMap = {};
        (riders || []).forEach(r => {
            if (r && r.$id) ridersMap[r.$id] = r;
        });

        // Replace wholesale, including with an empty array - an empty
        // result is real data (no deliveries yet), not a reason to keep
        // stale data on screen.
        deliveries = (rows || []).map(r => mapRowToDelivery(r, ridersMap));
        renderAll();
    } catch (err) {
        console.error("Backend sync failed:", err);
        showErrorMessage("Could not load your deliveries from the server: " + err.message);
    }
}

function updateStaffProfile() {
    if (retailerSession && retailerSession.name) {
        const staffNameEl = document.querySelector(".staff-info strong");
        const staffAvatarEl = document.querySelector(".staff-avatar");
        if (staffNameEl) staffNameEl.textContent = retailerSession.name;
        if (staffAvatarEl) {
            staffAvatarEl.textContent = retailerSession.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
        }
    }
}

// ========================================
// CANCEL DELIVERY
// ========================================

function addCancelListeners() {

    const cancelButtons =
        document.querySelectorAll(
            ".cancel-delivery-btn"
        );


    cancelButtons.forEach(button => {

        button.addEventListener("click", async () => {

            const deliveryId =
                button.dataset.id;


            const delivery =
                deliveries.find(
                    item =>
                        item.id === deliveryId
                );


            if (!delivery) return;


            const confirmed =
                confirm(
                    `Are you sure you want to cancel ${deliveryId}?`
                );


            if (!confirmed) return;

            try {
                await Wasili.cancelDelivery(deliveryId, "Cancelled by RetailerStaff");
                await syncWithBackend();
                showSuccessMessage(`${deliveryId} has been cancelled.`);
            } catch (err) {
                showErrorMessage(`Could not cancel ${deliveryId}: ${err.message}`);
            }

        });

    });

}


// ========================================
// CREATE NEW DELIVERY
// ========================================

document
    .getElementById("deliveryForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();


        const customerName =
            document
                .getElementById("customerName")
                .value
                .trim();


        const phone =
            document
                .getElementById("phoneNumber")
                .value
                .trim();


        const destination =
            document
                .getElementById("destinationAddress")
                .value
                .trim();


        const landmark =
            document
                .getElementById("landmark")
                .value
                .trim();


        const itemDescription =
            document
                .getElementById("itemDescription")
                .value
                .trim();


        const vehicle =
            document
                .getElementById("vehicleType")
                .value;


        const notes =
            document
                .getElementById("deliveryNotes")
                .value
                .trim();

        const cleanPhone = formatKenyanPhone(phone);
        const requiredVehicleType = vehicle.toUpperCase();

        try {
            const payload = {
                customerName,
                customerPhone: cleanPhone,
                address: destination + (landmark ? ` (Landmark: ${landmark})` : ""),
                itemDescription: itemDescription + (notes ? ` [Notes: ${notes}]` : ""),
                requiredVehicleType
            };

            const res = await Wasili.createDelivery(payload);
            await syncWithBackend();

            this.reset();
            showSection("dashboard");

            const id = res?.$id || res?.id || "Delivery request";
            const codeMsg = res?.confirmationCode ? ` Confirmation code: ${res.confirmationCode}.` : "";
            showSuccessMessage(`${id} created successfully and waiting for rider assignment.${codeMsg}`);
        } catch (err) {
            showErrorMessage("Could not create this delivery: " + err.message);
        }

    });


// ========================================
// SUCCESS MESSAGE
// ========================================

function showSuccessMessage(message) {

    const alert =
        document.getElementById(
            "successAlert"
        );


    const messageElement =
        document.getElementById(
            "successMessage"
        );


    messageElement.textContent =
        message;


    alert.classList.add("show");


    setTimeout(() => {

        alert.classList.remove("show");

    }, 5000);

}


// ========================================
// RENDER EVERYTHING
// ========================================

function renderAll() {

    renderStatistics();

    renderRecentDeliveries();

    renderDeliveryStatuses();

}


// ========================================
// INITIAL RENDER & BACKEND INITIALIZATION
// ========================================

renderAll();
updateStaffProfile();
syncWithBackend();

// Realtime subscription for live delivery updates
Wasili.onDeliveryChange(() => {
    syncWithBackend();
});

// Safety net in case a Realtime event is ever dropped - a no-op re-fetch
// if nothing actually changed.
setInterval(() => syncWithBackend(), 30000);

const retailerLogoutButton = document.getElementById("logoutButton");
if (retailerLogoutButton) {
    retailerLogoutButton.addEventListener("click", () => Wasili.logout());
}
