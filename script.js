const STORAGE_KEY = "senn_live_state";

const IDLE_TIMEOUT = 60 * 1000;

const STATUS_CONFIG = {
  online: {
    title: "Online",
    description: "Senn Live is detecting activity.",
    color: "online"
  },

  idle: {
    title: "Idle",
    description: "No recent activity detected.",
    color: "idle"
  },

  offline: {
    title: "Offline",
    description: "The current session is inactive.",
    color: "offline"
  }
};


const elements = {
  statusTitle: document.getElementById("statusTitle"),
  statusDescription: document.getElementById("statusDescription"),
  statusIcon: document.getElementById("statusIcon"),

  sessionTimer: document.getElementById("sessionTimer"),

  lastActive: document.getElementById("lastActive"),
  lastActiveExact: document.getElementById("lastActiveExact"),

  heartbeat: document.getElementById("heartbeat"),
  heartbeatDetail: document.getElementById("heartbeatDetail"),

  connectionDot: document.getElementById("connectionDot"),
  connectionText: document.getElementById("connectionText"),

  activityList: document.getElementById("activityList"),
  clearActivity: document.getElementById("clearActivity"),

  statusButtons: document.querySelectorAll(".status-button")
};


/* =========================
   STATE
========================= */

const defaultState = {
  status: "online",
  sessionStarted: Date.now(),
  lastActive: Date.now(),
  heartbeat: Date.now(),
  activity: []
};


let state = loadState();
let previousSession = null;
let idleTimer = null;


/* =========================
   STORAGE
========================= */

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {
        ...defaultState,
        activity: []
      };
    }

    const parsed = JSON.parse(saved);

    return {
      ...defaultState,
      ...parsed,
      activity: Array.isArray(parsed.activity)
        ? parsed.activity
        : []
    };

  } catch (error) {
    console.warn("Senn Live: failed to load state.", error);

    return {
      ...defaultState,
      activity: []
    };
  }
}


function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    console.warn("Senn Live: failed to save state.", error);
  }
}


/* =========================
   WELCOME BACK
========================= */

function detectPreviousSession() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return;
  }

  try {
    const oldState = JSON.parse(saved);

    if (
      oldState.lastActive &&
      Date.now() - oldState.lastActive > 5 * 60 * 1000
    ) {
      previousSession = oldState.lastActive;
    }

  } catch (error) {
    console.warn("Senn Live: previous session check failed.");
  }
}


function createWelcomeBackActivity() {
  if (!previousSession) {
    return;
  }

  addActivity(
    "online",
    "Welcome back",
    Date.now()
  );

  previousSession = null;
}


/* =========================
   STATUS
========================= */

function setStatus(status, shouldLog = true) {
  if (!STATUS_CONFIG[status]) {
    return;
  }

  state.status = status;

  if (status === "online") {
    state.lastActive = Date.now();
  }

  if (shouldLog) {
    addActivity(
      status,
      STATUS_CONFIG[status].title,
      Date.now()
    );
  }

  saveState();
  renderStatus();
}


function renderStatus() {
  const config = STATUS_CONFIG[state.status];

  elements.statusTitle.textContent = config.title;
  elements.statusDescription.textContent = config.description;

  elements.statusButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.status === state.status
    );
  });

  elements.statusIcon.style.background = getStatusBackground(
    state.status
  );

  elements.statusIcon.style.borderColor = getStatusBorder(
    state.status
  );

  const dot = elements.statusIcon.querySelector("span");

  if (dot) {
    dot.style.background = getStatusColor(
      state.status
    );
  }
}


function getStatusColor(status) {
  if (status === "online") {
    return "var(--online)";
  }

  if (status === "idle") {
    return "var(--idle)";
  }

  return "var(--offline)";
}


function getStatusBackground(status) {
  if (status === "online") {
    return "rgba(98, 214, 167, 0.08)";
  }

  if (status === "idle") {
    return "rgba(240, 189, 105, 0.08)";
  }

  return "rgba(113, 128, 150, 0.08)";
}


function getStatusBorder(status) {
  if (status === "online") {
    return "rgba(98, 214, 167, 0.2)";
  }

  if (status === "idle") {
    return "rgba(240, 189, 105, 0.2)";
  }

  return "rgba(113, 128, 150, 0.2)";
}


/* =========================
   SESSION TIMER
========================= */

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000)
  );

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  return [
    hours,
    minutes,
    seconds
  ]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}


function updateSessionTimer() {
  if (state.status === "offline") {
    elements.sessionTimer.textContent = "00:00:00";
    return;
  }

  elements.sessionTimer.textContent =
    formatDuration(
      Date.now() - state.sessionStarted
    );
}


/* =========================
   LAST ACTIVE
========================= */

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return "Unknown";
  }

  const difference = Math.max(
    0,
    Date.now() - timestamp
  );

  const seconds = Math.floor(
    difference / 1000
  );

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  return `${days}d ago`;
}


function updateLastActive() {
  elements.lastActive.textContent =
    formatRelativeTime(state.lastActive);

  elements.lastActiveExact.textContent =
    state.lastActive
      ? new Date(state.lastActive).toLocaleString(
          "id-ID",
          {
            dateStyle: "medium",
            timeStyle: "medium"
          }
        )
      : "Waiting for activity";
}


/* =========================
   HEARTBEAT
========================= */

function updateHeartbeat() {
  const difference =
    Date.now() - state.heartbeat;

  if (difference < 15000) {
    elements.heartbeat.textContent = "Healthy";
    elements.heartbeatDetail.textContent =
      "Local heartbeat active";
  }

  else if (difference < 30000) {
    elements.heartbeat.textContent = "Delayed";
    elements.heartbeatDetail.textContent =
      "Heartbeat is slightly delayed";
  }

  else {
    elements.heartbeat.textContent = "Inactive";
    elements.heartbeatDetail.textContent =
      "Heartbeat needs attention";
  }
}


function sendHeartbeat() {
  state.heartbeat = Date.now();

  saveState();
  updateHeartbeat();

  elements.connectionText.textContent =
    "System online";

  elements.connectionDot.style.background =
    "var(--online)";
}


/* =========================
   ACTIVITY LOG
========================= */

function addActivity(
  status,
  label,
  timestamp = Date.now()
) {
  state.activity.unshift({
    status,
    label,
    timestamp
  });

  state.activity =
    state.activity.slice(0, 12);

  saveState();

  renderActivity();
}


function renderActivity() {
  if (!state.activity.length) {
    elements.activityList.innerHTML = `
      <div class="empty-activity">
        No recent activity.
      </div>
    `;

    return;
  }

  elements.activityList.innerHTML =
    state.activity
      .map(item => `
        <div class="activity-item">

          <div class="activity-left">

            <span
              class="activity-dot ${item.status}"
            ></span>

            <span class="activity-name">
              ${escapeHTML(item.label)}
            </span>

          </div>

          <span class="activity-time">
            ${formatRelativeTime(item.timestamp)}
          </span>

        </div>
      `)
      .join("");
}


function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================
   USER ACTIVITY
========================= */

function registerActivity() {
  const now = Date.now();

  state.lastActive = now;
  state.heartbeat = now;

  if (state.status !== "online") {
    setStatus("online", true);
  }

  saveState();

  resetIdleTimer();
  updateLastActive();
  updateHeartbeat();
}


function resetIdleTimer() {
  clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {

    if (state.status === "online") {
      setStatus("idle", true);
    }

  }, IDLE_TIMEOUT);
}


/* =========================
   VISIBILITY
========================= */

document.addEventListener(
  "visibilitychange",
  () => {

    if (document.visibilityState === "visible") {
      registerActivity();

      elements.connectionText.textContent =
        "System online";
    }

    else {
      state.lastActive = Date.now();
      saveState();
    }

  }
);


/* =========================
   EVENT LISTENERS
========================= */

elements.statusButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const status =
        button.dataset.status;

      if (status === "online") {

        state.sessionStarted = Date.now();

        setStatus("online");

      }

      else if (status === "offline") {

        setStatus("offline");

      }

      else if (status === "idle") {

        setStatus("idle");

      }

    }
  );

});


[
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll"
].forEach(eventName => {

  document.addEventListener(
    eventName,
    registerActivity,
    {
      passive: true
    }
  );

});


elements.clearActivity.addEventListener(
  "click",
  () => {

    state.activity = [];

    saveState();
    renderActivity();

  }
);


/* =========================
   INITIALIZATION
========================= */

detectPreviousSession();

renderStatus();
renderActivity();
updateSessionTimer();
updateLastActive();
updateHeartbeat();

createWelcomeBackActivity();

resetIdleTimer();


/* =========================
   CLOCK / HEARTBEAT LOOP
========================= */

setInterval(() => {

  updateSessionTimer();
  updateLastActive();
  updateHeartbeat();

}, 1000);


setInterval(() => {

  sendHeartbeat();

}, 10000);
