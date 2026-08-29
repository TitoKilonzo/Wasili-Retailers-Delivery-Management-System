// Sign-in page. Wasili.login() (wasili-client.js) does the actual auth call
// and figures out the caller's role from their Appwrite labels - this file
// is just form wiring and the role -> page redirect.

const ROLE_REDIRECT = {
    retailerstaff: "retailer.html",
    dispatcher: "dispatcher.html",
    rider: "rider.html",
    admin: "admin.html",
};

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const loginInfo = document.getElementById("loginInfo");
const roleSelect = document.getElementById("role");

function showError(message) {
    loginInfo.classList.remove("show");
    loginError.textContent = message;
    loginError.classList.add("show");
}

function showInfo(message) {
    loginError.classList.remove("show");
    loginInfo.textContent = message;
    loginInfo.classList.add("show");
}

function redirectForRole(role) {
    window.location.href = ROLE_REDIRECT[role] || "index.html";
}

// Already signed in (back button, reopened tab)? Skip the form.
const existingSession = Wasili.getSession();
if (existingSession && ROLE_REDIRECT[existingSession.role]) {
    showInfo("You're already signed in - redirecting...");
    redirectForRole(existingSession.role);
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const selectedRole = roleSelect.value;
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!selectedRole) {
        showError("Select your role.");
        return;
    }
    if (!username || !password) {
        showError("Enter both a username and a password.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";
    loginError.classList.remove("show");
    loginInfo.classList.remove("show");

    try {
        const session = await Wasili.login(username, password);

        // The account's real role (from its Appwrite label) is the source of
        // truth. If it doesn't match what the person picked, stop them here
        // with a clear message instead of silently sending them to the
        // portal they actually chose.
        if (session.role !== selectedRole) {
            await Wasili.logout({ redirect: false });
            showError(
                `This account is registered as ${Wasili.ROLE_DISPLAY[session.role]}, not ${Wasili.ROLE_DISPLAY[selectedRole]}. Select "${Wasili.ROLE_DISPLAY[session.role]}" and sign in again.`
            );
            loginButton.disabled = false;
            loginButton.textContent = "Sign In";
            return;
        }

        redirectForRole(session.role);
    } catch (err) {
        showError(err.message || "Sign in failed. Check your username and password and try again.");
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});
