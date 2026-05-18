// All Lecture Halls
const lectureHalls = [
  "BS GF LT 1", "BS GF LT 2", "BS GF LT 3", "BS GF LT 4",
  "PS FF LT 5", "PS FF LT 6", "PS FF LT 7",
  "AG LT 8", "AG LT 9", "VS LT 11", "VS LT 12",
  "AUDITORIUM", "LIB LT 1", "LIB LT 2", "LIB LT 3",
  "GREAT HALL 1", "GREAT HALL 2", "GREAT HALL 3",
  "DAAD LT 1", "DAAD LT 2", "DAAD LT 3",
  "KODEG GF LT 1", "KODEG GF LT 2", "KODEG GF LT 3", "KODEG GF LT 4", "KODEG GF LT 5",
  "KODEG FF LT 1", "KODEG FF LT 2", "KODEG FF LT 3", "KODEG FF LT 4",
  "SJ GF LT 1A", "SJ GF LT 1B", "SJ GF LT 2A", "SJ GF LT 2B",
  "SJ GF LT 3A", "SJ GF LT 3B", "SJ GF LT 4A", "SJ GF LT 4B",
  "SJ GF LT 5A", "SJ GF LT 5B", "SJ GF LT 6A", "SJ GF LT 6B",
  "SJ GF LT 7A", "SJ GF LT 7B", "SJ GF LT 8A", "SJ GF LT 8B"
];

// Weekly Password - Change this every week (Admin will manage this)
let weeklyPassword = "UNI2026";   

// Store current bookings (In real app, this will come from backend)
let currentBookings = {};

// Store recurring bookings
let recurringBookings = [];
let backendAvailable = false;

// Notification history + tracking to avoid duplicate reminders
let notificationHistory = [];
let sentNotificationKeys = new Set();

async function loadBookingsFromServer() {
  try {
    const response = await fetch('/api/bookings');
    if (!response.ok) throw new Error('Server response not OK');
    const data = await response.json();
    currentBookings = data.currentBookings || {};
    recurringBookings = data.recurringBookings || [];
    weeklyPassword = data.weeklyPassword || weeklyPassword;
    saveToLocalStorage();
    backendAvailable = true;
    return true;
  } catch (error) {
    console.warn('Unable to reach backend API, falling back to localStorage:', error);
    backendAvailable = false;
    return false;
  }
}

async function saveStateToServer() {
  if (!backendAvailable) return false;
  try {
    const response = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentBookings, recurringBookings, weeklyPassword })
    });
    return response.ok;
  } catch (error) {
    console.warn('Failed to save state to server:', error);
    backendAvailable = false;
    return false;
  }
}

async function syncFromServer() {
  const loaded = await loadBookingsFromServer();
  if (loaded) {
    renderHalls();
    if (document.getElementById('current-password')) {
      document.getElementById('current-password').value = weeklyPassword;
    }
    if (window.renderAdminHalls) window.renderAdminHalls();
    if (window.renderRecurringList) window.renderRecurringList();
  }
  return loaded;
}

// Sample data - Some halls occupied
function initializeSampleBookings() {
  currentBookings = {
    "LIB LT 1": { startTime: "12:00", endTime: "13:30", purpose: "Research Meeting" },
    "PS FF LT 6": { startTime: "11:00", endTime: "13:00", purpose: "CSC 301" },
    "GREAT HALL 2": { startTime: "14:00", endTime: "16:00", purpose: "University Seminar" },
    "AUDITORIUM": { startTime: "13:00", endTime: "14:30", purpose: "Guest Lecture" }
  };
}

// Load data from localStorage
function loadFromLocalStorage() {
  const savedPassword = localStorage.getItem('weeklyPassword');
  const savedBookings = localStorage.getItem('currentBookings');
  const savedRecurring = localStorage.getItem('recurringBookings');

  if (savedPassword) {
    weeklyPassword = savedPassword.trim();
  } else {
    // If no saved password, save the default one
    saveToLocalStorage();
  }
  
  if (savedBookings) currentBookings = JSON.parse(savedBookings);
  if (savedRecurring) recurringBookings = JSON.parse(savedRecurring);

  const savedNotifications = localStorage.getItem('notificationHistory');
  const savedNotificationKeys = localStorage.getItem('sentNotificationKeys');
  if (savedNotifications) notificationHistory = JSON.parse(savedNotifications) || [];
  if (savedNotificationKeys) sentNotificationKeys = new Set(JSON.parse(savedNotificationKeys));

  // Clean expired bookings
  cleanExpiredBookings();
}

// Save data to localStorage
function saveToLocalStorage() {
  localStorage.setItem('weeklyPassword', weeklyPassword.trim());
  localStorage.setItem('currentBookings', JSON.stringify(currentBookings));
  localStorage.setItem('recurringBookings', JSON.stringify(recurringBookings));
  localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
  localStorage.setItem('sentNotificationKeys', JSON.stringify(Array.from(sentNotificationKeys)));
}

// Clean expired bookings
function cleanExpiredBookings() {
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
  for (let hall in currentBookings) {
    const booking = currentBookings[hall];
    if (!booking || !booking.endTime) continue;
    const [hours, minutes] = booking.endTime.split(':').map(Number);
    const endTime = hours * 100 + minutes;
    if (endTime <= currentTime) {
      delete currentBookings[hall];
    }
  }
}

function saveNotificationState() {
  localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
  localStorage.setItem('sentNotificationKeys', JSON.stringify(Array.from(sentNotificationKeys)));
}

function formatTimeToMinutes(timeString) {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function switchBottomTab(tabName) {
  const tabs = ['admin', 'available', 'booked', 'notifications'];
  tabs.forEach(tab => {
    const panel = document.getElementById(`panel-${tab}`);
    if (panel) panel.classList.toggle('hidden', tab !== tabName);
  });

  if (tabName === 'available') renderAvailableHalls();
  if (tabName === 'booked') renderBookedHalls();
  if (tabName === 'notifications') renderNotifications();
}

function renderAvailableHalls() {
  const container = document.getElementById('available-halls-list');
  if (!container) return;
  container.innerHTML = '';
  const freeHalls = lectureHalls.filter(hall => {
    const status = getHallStatus(hall);
    return !status.isOccupied && !status.isReserved;
  });
  if (freeHalls.length === 0) {
    container.innerHTML = `<div class="col-span-full bg-slate-900 rounded-3xl p-6 text-center text-gray-300">No available halls right now.</div>`;
    return;
  }
  freeHalls.forEach(hall => {
    const status = getHallStatus(hall);
    container.innerHTML += `
      <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800">
        <h3 class="text-lg font-semibold mb-2">${hall}</h3>
        <p class="text-sm text-gray-400">${status.statusText}</p>
      </div>
    `;
  });
}

function renderBookedHalls() {
  const container = document.getElementById('booked-halls-list');
  if (!container) return;
  container.innerHTML = '';
  const bookedHalls = lectureHalls.filter(hall => {
    const status = getHallStatus(hall);
    return status.isOccupied || status.isReserved;
  });
  if (bookedHalls.length === 0) {
    container.innerHTML = `<div class="col-span-full bg-slate-900 rounded-3xl p-6 text-center text-gray-300">No booked halls at the moment.</div>`;
    return;
  }
  bookedHalls.forEach(hall => {
    const status = getHallStatus(hall);
    container.innerHTML += `
      <div class="bg-slate-900 rounded-3xl p-5 border border-slate-800">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h3 class="text-lg font-semibold">${hall}</h3>
          <span class="rounded-full px-3 py-1 text-xs font-semibold ${status.isOccupied ? 'bg-red-500 text-white' : 'bg-yellow-500 text-slate-950'}">
            ${status.isOccupied ? 'Occupied' : 'Reserved'}
          </span>
        </div>
        <p class="text-sm text-gray-400">${status.statusText}</p>
        ${status.purpose ? `<p class="mt-2 text-sm text-gray-300"><strong>Purpose:</strong> ${status.purpose}</p>` : ''}
      </div>
    `;
  });
}

function renderNotifications() {
  const feed = document.getElementById('notification-feed');
  if (!feed) return;
  if (notificationHistory.length === 0) {
    feed.innerHTML = `<div class="bg-slate-900 rounded-3xl p-6 text-center text-gray-300">No notifications yet. Book a hall to start seeing alerts.</div>`;
    return;
  }
  feed.innerHTML = notificationHistory.map(item => {
    return `
      <div class="bg-slate-900 rounded-3xl p-4 border border-slate-800">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-gray-400 uppercase tracking-[0.2em]">${item.type}</p>
            <p class="text-base font-semibold mt-1">${item.hall}</p>
          </div>
          <span class="text-xs text-gray-500">${new Date(item.timestamp).toLocaleString()}</span>
        </div>
        <p class="mt-3 text-gray-300">${item.message}</p>
      </div>
    `;
  }).join('');
}

function addNotification(type, hall, message) {
  const timestamp = new Date().toISOString();
  notificationHistory.unshift({ id: `${type}-${hall}-${timestamp}`, type, hall, message, timestamp });
  if (notificationHistory.length > 50) notificationHistory.length = 50;
  saveNotificationState();
  renderNotifications();
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

function checkScheduledNotifications() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const processBooking = (hall, booking, label) => {
    if (!booking || !booking.startTime || !booking.endTime) return;
    const startMinutes = formatTimeToMinutes(booking.startTime);
    const endMinutes = formatTimeToMinutes(booking.endTime);
    const reminderKey = `reminder|${label}|${hall}|${booking.startTime}|${booking.endTime}`;
    const endedKey = `ended|${label}|${hall}|${booking.startTime}|${booking.endTime}`;

    if (startMinutes > currentMinutes && startMinutes - currentMinutes <= 30 && !sentNotificationKeys.has(reminderKey)) {
      const message = `${booking.purpose} begins in ${startMinutes - currentMinutes} minutes at ${formatTime12(booking.startTime)}.`;
      sendNotification(`Upcoming Class in ${hall}`, message);
      addNotification('Reminder', hall, message);
      sentNotificationKeys.add(reminderKey);
      saveNotificationState();
    }

    if (currentMinutes >= endMinutes && !sentNotificationKeys.has(endedKey)) {
      const message = `${booking.purpose} ended at ${formatTime12(booking.endTime)}.`;
      sendNotification(`Class Ended in ${hall}`, message);
      addNotification('Ended', hall, message);
      sentNotificationKeys.add(endedKey);
      saveNotificationState();
    }
  };

  Object.entries(currentBookings).forEach(([hall, booking]) => processBooking(hall, booking, 'booking'));

  const nowDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  recurringBookings.forEach(rec => {
    if (!rec.days.includes(nowDay)) return;
    const hall = rec.hall;
    const booking = { startTime: rec.startTime, endTime: rec.endTime, purpose: rec.purpose };
    processBooking(hall, booking, 'recurring');
  });
}

function getTimeValue(timeString) {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 100 + minutes;
}

function formatTime12(time24) {
  if (!time24) return "";
  const [hours, minutes] = time24.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

// Get hall status (current booking or recurring)
function getHallStatus(hall) {
  const booking = currentBookings[hall];
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.getHours() * 100 + now.getMinutes();

  if (booking) {
    const startTime = getTimeValue(booking.startTime);
    const endTime = getTimeValue(booking.endTime);

    if (startTime !== null && currentTime < startTime) {
      return {
        isOccupied: false,
        isReserved: true,
        endTime: booking.endTime,
        startTime: booking.startTime,
        purpose: booking.purpose,
        statusText: `Reserved from ${formatTime12(booking.startTime)} until ${formatTime12(booking.endTime)}`
      };
    }

    if (endTime !== null && currentTime >= endTime) {
      return { isOccupied: false, isReserved: false, endTime: null, purpose: null, statusText: 'Free all day' };
    }

    return {
      isOccupied: true,
      isReserved: false,
      endTime: booking.endTime,
      startTime: booking.startTime,
      purpose: booking.purpose,
      statusText: `Occupied until ${formatTime12(booking.endTime)} (${booking.purpose})`
    };
  }

  // Check recurring
  for (let rec of recurringBookings) {
    if (rec.hall === hall && rec.days.includes(dayName)) {
      const startTime = getTimeValue(rec.startTime);
      const endTime = getTimeValue(rec.endTime);
      if (currentTime >= startTime && currentTime < endTime) {
        return {
          isOccupied: true,
          isReserved: false,
          endTime: rec.endTime,
          purpose: rec.purpose,
          statusText: `In use: ${rec.purpose} until ${formatTime12(rec.endTime)}`
        };
      }
    }
  }

  // Free, find next recurring
  let nextStart = null;
  for (let rec of recurringBookings) {
    if (rec.hall === hall && rec.days.includes(dayName)) {
      const startTime = getTimeValue(rec.startTime);
      if (startTime > currentTime && (!nextStart || startTime < nextStart)) {
        nextStart = startTime;
      }
    }
  }
  const statusText = nextStart ? `Free until ${String(Math.floor(nextStart / 100)).padStart(2, '0')}:${String(nextStart % 100).padStart(2, '0')}` : 'Free all day';
  return { isOccupied: false, isReserved: false, endTime: null, purpose: null, statusText };
}

// Update current date
function updateDate() {
  const dateElement = document.getElementById("current-date");
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateElement.textContent = now.toLocaleDateString('en-GB', options);
}

// Render all halls
function renderHalls() {
  const container = document.getElementById("halls-grid");
  container.innerHTML = "";

  lectureHalls.forEach(hall => {
    const { isOccupied, isReserved, statusText } = getHallStatus(hall);
    const statusClass = isOccupied ? "occupied" : isReserved ? "reserved" : "free";
    const dotClass = isOccupied ? "red-dot" : isReserved ? "yellow-dot" : "green-dot";

    const cardHTML = `
      <div class="hall-card ${statusClass} border-2 rounded-3xl p-6 cursor-pointer" onclick="showHallDetails('${hall}')">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="font-semibold text-lg leading-tight mb-4">${hall}</h3>
            <p class="${isOccupied ? 'text-red-400' : isReserved ? 'text-yellow-300' : 'text-green-400'} font-medium text-sm">
              ${statusText}
            </p>
          </div>
          <div class="status-dot ${dotClass} mt-1"></div>
        </div>

        ${(!isOccupied && !isReserved) ? `
        <button onclick="event.stopImmediatePropagation(); bookHall('${hall}');" 
                class="mt-6 w-full bg-green-600 hover:bg-green-500 py-3.5 rounded-2xl text-sm font-semibold transition">
          Book This Hall
        </button>` : ''}

      </div>
    `;

    container.innerHTML += cardHTML;
  });
}


// Open booking modal
let selectedHall = null;

function showHallDetails(hallName) {
  selectedHall = hallName;
  const { isOccupied, endTime, purpose, statusText } = getHallStatus(hallName);
  
  document.getElementById("details-hall-name").textContent = `${hallName} - Details`;
  
  // Get current bookings
  let detailsHTML = "";
  const booking = currentBookings[hallName];
  
  // Current booking
  if (booking) {
    const { isReserved } = getHallStatus(hallName);
    detailsHTML += `
      <div class="bg-gray-800 p-4 rounded-2xl border-l-4 border-red-500">
        <p class="text-red-400 font-semibold mb-2">📌 Current Booking</p>
        <p class="text-gray-300"><strong>Purpose:</strong> ${booking.purpose}</p>
        ${booking.startTime ? `<p class="text-gray-300"><strong>From:</strong> ${formatTime12(booking.startTime)}</p>` : ``}
        <p class="text-gray-300"><strong>Until:</strong> ${booking.endTime}</p>
        ${isReserved ? `<p class="text-yellow-300 mt-2">This hall is reserved and will become occupied at ${formatTime12(booking.startTime)}.</p>` : ''}
      </div>
    `;
  }
  
  // Recurring bookings
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const recurringForHall = recurringBookings.filter(rec => rec.hall === hallName);
  
  if (recurringForHall.length > 0) {
    detailsHTML += `<p class="text-gray-400 font-semibold mt-4 mb-2">📋 Recurring Bookings:</p>`;
    recurringForHall.forEach(rec => {
      const dayBadgeColor = rec.days.includes(dayName) ? "bg-blue-600" : "bg-gray-700";
      const dayTimeLabels = rec.days.map(day => `${day}: ${formatTime12(rec.startTime)} - ${formatTime12(rec.endTime)}`).join(' · ');
      detailsHTML += `
        <div class="bg-gray-800 p-4 rounded-2xl border-l-4 border-blue-500">
          <p class="text-blue-400 font-semibold mb-2">${rec.purpose}</p>
          <p class="text-gray-300"><strong>Time:</strong> ${formatTime12(rec.startTime)} - ${formatTime12(rec.endTime)}</p>
          <p class="text-gray-300"><strong>Days:</strong> ${dayTimeLabels}</p>
      `;
    });
  }
  
  if (detailsHTML === "") {
    detailsHTML = `
      <div class="bg-gray-800 p-4 rounded-2xl border-l-4 border-green-500">
        <p class="text-green-400 font-semibold">✓ Hall is Free</p>
        <p class="text-gray-300 mt-2">No current or recurring bookings</p>
      </div>
    `;
  }
  
  document.getElementById("details-content").innerHTML = detailsHTML;
  document.getElementById("details-modal").classList.remove("hidden");
}

function closeDetailsModal() {
  document.getElementById("details-modal").classList.add("hidden");
}

function proceedToBook() {
  closeDetailsModal();
  bookHall(selectedHall);
}

function bookHall(hallName) {
  selectedHall = hallName;
  document.getElementById("modal-hall-name").textContent = `Book ${hallName}`;
  document.getElementById("booking-modal").classList.remove("hidden");
  document.getElementById("password-input").focus();
}

function closeModal() {
  document.getElementById("booking-modal").classList.add("hidden");
  document.getElementById("password-input").value = "";
  document.getElementById("purpose-input").value = "";
}

// Toggle password visibility
function togglePasswordVisibility() {
  const input = document.getElementById("password-input");
  const icon = document.getElementById("eye-icon");
  if (input.type === "password") {
    input.type = "text";
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228L3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m-7.894-7.894L3 3m3.228 3.228 6.364 6.364" />`;
  } else {
    input.type = "password";
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />`;
  }
}

async function confirmBooking() {
  const password = document.getElementById("password-input").value.trim();
  const purpose = document.getElementById("purpose-input").value.trim();
  const startTime = document.getElementById("start-time").value;
  const endTime = document.getElementById("end-time").value;

  if (password === "") {
    alert("Please enter the weekly password");
    return;
  }

  // Normalize both passwords for comparison (trim and remove extra spaces)
  const normalizedPassword = password.trim().toUpperCase();
  const normalizedWeeklyPassword = weeklyPassword.trim().toUpperCase();
  
  if (normalizedPassword !== normalizedWeeklyPassword) {
    alert("❌ Incorrect Password!\nPlease contact the Admin for the correct password.\n\nCurrent password is: " + weeklyPassword);
    return;
  }

  if (!purpose) {
    alert("Please enter the class or purpose");
    return;
  }

  if (!startTime || !endTime) {
    alert("Please select start and end time");
    return;
  }

  // Save booking
  currentBookings[selectedHall] = {
    startTime: startTime,
    endTime: endTime,
    purpose: purpose
  };

  saveToLocalStorage();  // Save to localStorage
  await saveStateToServer();

  const successMessage = `✅ Booking Confirmed!\n\nHall: ${selectedHall}\nTime: ${startTime} - ${endTime}\nPurpose: ${purpose}`;
  alert(successMessage);
  sendNotification(`Hall Booked: ${selectedHall}`, `${purpose} booked from ${formatTime12(startTime)} to ${formatTime12(endTime)}.`);
  addNotification('Booked', selectedHall, `${purpose} booked from ${formatTime12(startTime)} to ${formatTime12(endTime)}.`);

  closeModal();
  renderHalls();   // Refresh the grid
  renderAvailableHalls();
  renderBookedHalls();
  renderNotifications();
  checkScheduledNotifications();
}

// Free hall for today (cancel recurring)
async function freeHallForToday(hallName) {
  currentBookings[hallName] = { endTime: "23:59", purpose: "Free" };
  saveToLocalStorage();
  await saveStateToServer();
  renderHalls();
}

// Initialize the system
async function initializeSystem() {
  initTheme();
  loadFromLocalStorage();
  requestNotificationPermission();

  const backendLoaded = await loadBookingsFromServer();

  if (!backendLoaded && Object.keys(currentBookings).length === 0 && recurringBookings.length === 0) {
    initializeSampleBookings();
  }

  updateDateTime();
  renderHalls();
  renderAvailableHalls();
  renderBookedHalls();
  renderNotifications();
  switchBottomTab('admin');
  startAutoRefresh();
  checkScheduledNotifications();
  setInterval(checkScheduledNotifications, 60000);
}

function updateDateTime() {
  updateDate();
  const timeElement = document.getElementById('current-time');
  if (timeElement) {
    const now = new Date();
    timeElement.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
}

setInterval(updateDateTime, 1000);

function getStoredTheme() {
  return localStorage.getItem('theme') || 'dark';
}

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  document.body.classList.toggle('dark', theme === 'dark');

  const themeButton = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-toggle-icon');
  const themeText = document.getElementById('theme-toggle-text');
  const adminIcon = document.getElementById('admin-link-icon');

  if (themeButton && themeIcon && themeText) {
    themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    themeText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }

  if (adminIcon) {
    adminIcon.textContent = theme === 'dark' ? '👤' : '🧑';
  }
}

function initTheme() {
  const theme = getStoredTheme();
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.body.classList.contains('light') ? 'light' : 'dark';
  const nextTheme = current === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', nextTheme);
  applyTheme(nextTheme);
}
// Auto-refresh every 8 seconds (good balance)
let autoRefreshInterval;

function startAutoRefresh() {
  // Clear any existing interval first
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  
  autoRefreshInterval = setInterval(() => {
    if (!backendAvailable) {
      loadFromLocalStorage();                    // Reload latest data from localStorage
      renderHalls();      // Re-render halls
    } else {
      syncFromServer();
    }
    console.log("🔄 Auto-refreshed at " + new Date().toLocaleTimeString());
  }, 8000);   // 8000ms = 8 seconds
}

// Stop auto-refresh when page is closed (optional)
window.onbeforeunload = function() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
};

// Start the application
window.onload = initializeSystem;
