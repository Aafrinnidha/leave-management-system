
const $ = (id) => document.getElementById(id);

let userId = null;
let staffToken = null;

// =====================================
// API HELPER
// =====================================

async function api(url, options = {}, token = null) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

// =====================================
// MESSAGE
// =====================================

function showMessage(message) {
    $("message").textContent = message;
}

// =====================================
// SECTION NAVIGATION
// =====================================

const sections = [
    "portal-section",
    "login-section",
    "register-section",
    "dashboard",
    "staff-login-section",
    "staff-register-section",
    "staff-dashboard"
];

function showSection(sectionId) {
    sections.forEach(id => {
        $(id).classList.toggle("hidden", id !== sectionId);
    });

    showMessage("");
}

// =====================================
// HTML ESCAPE
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// =====================================
// DATE FORMAT
// =====================================

function formatDate(date) {
    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
        ? "Unknown"
        : parsed.toLocaleString();
}

// =====================================
// STUDENT BALANCE
// =====================================

function updateBalance(data) {
    $("casual-balance").textContent = data.casualLeave;
    $("medical-balance").textContent = data.medicalLeave;
}

// =====================================
// PORTAL SELECTION
// =====================================

$("student-portal").addEventListener("click", () => {
    showSection("login-section");
});

$("staff-portal").addEventListener("click", () => {
    $("staff-login-message").textContent = "";
    showSection("staff-login-section");
});

document.querySelectorAll(".back-home").forEach(button => {
    button.addEventListener("click", () => {
        showSection("portal-section");
    });
});

// =====================================
// STUDENT REGISTRATION
// =====================================

$("show-register").addEventListener("click", () => {
    $("register-message").textContent = "";
    showSection("register-section");
});

$("show-login").addEventListener("click", () => {
    showSection("login-section");
});

$("register-form").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        const data = await api("/api/register", {
            method: "POST",
            body: JSON.stringify({
                username: $("username").value.trim(),
                email: $("reg-email").value.trim(),
                rollNumber: $("roll-number").value.trim()
            })
        });

        $("register-form").reset();

        showSection("login-section");
        showMessage(data.message + ". Please log in.");

    } catch (error) {
        $("register-message").textContent = error.message;
    }
});

// =====================================
// STUDENT LOGIN
// =====================================

$("login-form").addEventListener("submit", async event => {
    event.preventDefault();

    try {
        const data = await api("/api/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("email").value.trim()
            })
        });

        userId = data.user.id;

        $("username-display").textContent = data.user.username;
        $("roll-display").textContent = data.user.rollNumber;

        const balance = await api(
            `/api/leave-balance/${userId}`
        );

        updateBalance(balance);

        $("login-form").reset();

        showSection("dashboard");
        showMessage("Student login successful!");

        await loadHistory();

    } catch (error) {
        showMessage(error.message);
    }
});

// =====================================
// STUDENT LEAVE BALANCE
// =====================================

async function refreshBalance() {
    if (!userId) return;

    try {
        const data = await api(
            `/api/leave-balance/${userId}`
        );

        updateBalance(data);

    } catch (error) {
        showMessage(error.message);
    }
}

$("refresh-balance").addEventListener("click", async () => {
    await refreshBalance();
    showMessage("Leave balance refreshed.");
});

// =====================================
// STUDENT APPLY LEAVE
// =====================================

$("leave-form").addEventListener("submit", async event => {
    event.preventDefault();

    if (!userId) {
        showMessage("Please log in first.");
        return;
    }

    const days = Number($("leave-days").value);

    if (!Number.isInteger(days) || days < 1) {
        showMessage("Enter a positive whole number of days.");
        return;
    }

    try {
        const data = await api(
            `/api/apply-leave/${userId}`,
            {
                method: "POST",
                body: JSON.stringify({
                    type: $("leave-type").value,
                    days
                })
            }
        );

        $("leave-form").reset();

        await refreshBalance();
        await loadHistory();

        showMessage(data.message);

    } catch (error) {
        showMessage(error.message);
    }
});

// =====================================
// STUDENT LEAVE HISTORY
// =====================================

async function loadHistory() {
    if (!userId) return;

    const list = $("history-list");

    list.textContent = "Loading leave history...";

    try {
        const requests = await api(
            `/api/my-leave-requests/${userId}`
        );

        if (requests.length === 0) {
            list.textContent =
                "You have not submitted any leave requests.";
            return;
        }

        list.innerHTML = requests.map(request => `
            <article class="history-card">

                <p>
                    <strong>Type:</strong>
                    ${escapeHTML(request.type)}
                </p>

                <p>
                    <strong>Days:</strong>
                    ${escapeHTML(request.days)}
                </p>

                <p>
                    <strong>Status:</strong>
                    <span class="status ${escapeHTML(request.status)}">
                        ${escapeHTML(request.status)}
                    </span>
                </p>

                <p>
                    <strong>Applied:</strong>
                    ${escapeHTML(formatDate(request.appliedAt))}
                </p>

            </article>
        `).join("");

    } catch (error) {
        list.textContent = error.message;
    }
}

$("refresh-history").addEventListener("click", loadHistory);

// =====================================
// STUDENT LOGOUT
// =====================================

$("logout").addEventListener("click", () => {
    userId = null;

    $("leave-form").reset();
    $("history-list").textContent = "";

    showSection("portal-section");
});

// =====================================
// STAFF REGISTRATION NAVIGATION
// =====================================

$("show-staff-register").addEventListener("click", () => {
    $("staff-register-message").textContent = "";
    showSection("staff-register-section");
});

$("back-to-staff-login").addEventListener("click", () => {
    $("staff-login-message").textContent = "";
    showSection("staff-login-section");
});

// =====================================
// STAFF REGISTRATION
// =====================================

$("staff-register-form").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const message = $("staff-register-message");

        message.textContent = "Creating staff account...";

        try {
            const data = await api("/api/staff/register", {
                method: "POST",
                body: JSON.stringify({
                    username: $("staff-register-name").value.trim(),
                    email: $("staff-register-email").value.trim(),
                    password: $("staff-register-password").value
                })
            });

            $("staff-register-form").reset();

            message.textContent = "";

            showSection("staff-login-section");

            $("staff-login-message").textContent =
                data.message + ". Please log in.";

        } catch (error) {
            message.textContent = error.message;
        }
    }
);

// =====================================
// STAFF LOGIN
// =====================================

$("staff-login-form").addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        const message = $("staff-login-message");

        message.textContent = "Checking staff credentials...";

        try {
            const data = await api("/api/staff/login", {
                method: "POST",
                body: JSON.stringify({
                    email: $("staff-email").value.trim(),
                    password: $("staff-password").value
                })
            });

            staffToken = data.token;

            $("staff-name-display").textContent =
                data.staff.username;

            $("staff-login-form").reset();

            showSection("staff-dashboard");

            await loadStaffRequests();

        } catch (error) {
            message.textContent = error.message;
        }
    }
);

// =====================================
// STAFF DASHBOARD - LOAD REQUESTS
// =====================================

async function loadStaffRequests() {
    const list = $("staff-request-list");
    const message = $("staff-message");

    list.textContent = "Loading leave requests...";
    message.textContent = "";

    try {
        const requests = await api(
            "/api/manager/leave-requests",
            {},
            staffToken
        );

        // Display only pending requests
        const pendingRequests = requests.filter(
            request => request.status === "pending"
        );

        if (pendingRequests.length === 0) {
            list.textContent =
                "There are no pending leave requests.";
            return;
        }

        list.innerHTML = pendingRequests.map(request => `
            <article class="request-card">

                <h3>Student Leave Request</h3>

                <p>
                    <strong>Student:</strong>
                    ${escapeHTML(request.user?.username || "Unknown")}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${escapeHTML(request.user?.email || "")}
                </p>

                <p>
                    <strong>Roll Number:</strong>
                    ${escapeHTML(request.user?.rollNumber || "")}
                </p>

                <p>
                    <strong>Leave Type:</strong>
                    ${escapeHTML(request.type)}
                </p>

                <p>
                    <strong>Days:</strong>
                    ${escapeHTML(request.days)}
                </p>

                <p>
                    <strong>Applied:</strong>
                    ${escapeHTML(formatDate(request.appliedAt))}
                </p>

                <div class="request-actions">

                    <button
                        type="button"
                        data-action="approve"
                        data-id="${escapeHTML(request._id)}">
                        Approve
                    </button>

                    <button
                        type="button"
                        data-action="reject"
                        data-id="${escapeHTML(request._id)}">
                        Reject
                    </button>

                </div>

            </article>
        `).join("");

    } catch (error) {
        list.textContent = "";
        message.textContent = error.message;

        staffToken = null;

        showSection("staff-login-section");

        $("staff-login-message").textContent =
            "Your staff session has expired or is invalid. Please log in again.";
    }
}

// =====================================
// STAFF REFRESH
// =====================================

$("staff-refresh-requests").addEventListener(
    "click",
    loadStaffRequests
);

// =====================================
// STAFF APPROVE AND REJECT
// =====================================

$("staff-request-list").addEventListener(
    "click",
    async event => {

        const button = event.target.closest(
            "button[data-action]"
        );

        if (!button || button.disabled) return;

        const action = button.dataset.action;
        const requestId = button.dataset.id;

        if (!["approve", "reject"].includes(action)) return;

        const confirmed = window.confirm(
            `Are you sure you want to ${action} this leave request?`
        );

        if (!confirmed) return;

        button.disabled = true;

        $("staff-message").textContent = "Processing request...";

        try {
            const data = await api(
                `/api/manager/${action}/${requestId}`,
                {
                    method: "PATCH"
                },
                staffToken
            );

            $("staff-message").textContent = data.message;

            await loadStaffRequests();

        } catch (error) {
            $("staff-message").textContent = error.message;
            button.disabled = false;
        }
    }
);

// =====================================
// STAFF LOGOUT
// =====================================

$("staff-logout").addEventListener("click", () => {
    staffToken = null;

    $("staff-request-list").textContent = "";
    $("staff-message").textContent = "";
    $("staff-login-form").reset();

    showSection("portal-section");
});

// =====================================
// INITIAL PAGE
// =====================================

showSection("portal-section");
