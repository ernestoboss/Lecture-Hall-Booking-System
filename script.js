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

// Sample data - Some halls occupied
function initializeSampleBookings() {
  currentBookings = {
    "LIB LT 1": { endTime: "13:30", purpose: "Research Meeting" },
    "PS FF LT 6": { endTime: "13:00", purpose: "CSC 301" },
    "GREAT HALL 2": { endTime: "16:00", purpose: "University Seminar" },
    "AUDITORIUM": { endTime: "14:30", purpose: "Guest Lecture" }
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

  // Clean expired bookings
  cleanExpiredBookings();
}

// Save data to localStorage
function saveToLocalStorage() {
  localStorage.setItem('weeklyPassword', weeklyPassword.trim());
  localStorage.setItem('currentBookings', JSON.stringify(currentBookings));
  localStorage.setItem('recurringBookings', JSON.stringify(recurringBookings));
}

// Clean expired bookings
function cleanExpiredBookings() {
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
  for (let hall in currentBookings) {
    const booking = currentBookings[hall];
    const [hours, minutes] = booking.endTime.split(':').map(Number);
    const endTime = hours * 100 + minutes;
    if (endTime <= currentTime) {
      delete currentBookings[hall];
    }
  }
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
  if (booking) {
    return { isOccupied: true, endTime: booking.endTime, purpose: booking.purpose, statusText: `Occupied until ${booking.endTime} (${booking.purpose})` };
  }

  // Check recurring
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.getHours() * 100 + now.getMinutes();

  for (let rec of recurringBookings) {
    if (rec.hall === hall && rec.days.includes(dayName)) {
      const [startH, startM] = rec.startTime.split(':').map(Number);
      const [endH, endM] = rec.endTime.split(':').map(Number);
      const startTime = startH * 100 + startM;
      const endTime = endH * 100 + endM;
      if (currentTime >= startTime && currentTime < endTime) {
        return { isOccupied: true, endTime: rec.endTime, purpose: rec.purpose, statusText: `In use: ${rec.purpose} until ${formatTime12(rec.endTime)}` };
      }
    }
  }

  // Free, find next recurring
  let nextStart = null;
  for (let rec of recurringBookings) {
    if (rec.hall === hall && rec.days.includes(dayName)) {
      const [startH, startM] = rec.startTime.split(':').map(Number);
      const startTime = startH * 100 + startM;
      if (startTime > currentTime && (!nextStart || startTime < nextStart)) {
        nextStart = startTime;
      }
    }
  }
  const statusText = nextStart ? `Free until ${String(Math.floor(nextStart / 100)).padStart(2, '0')}:${String(nextStart % 100).padStart(2, '0')}` : 'Free all day';
  return { isOccupied: false, endTime: null, purpose: null, statusText };
}

// Update current time every 30 seconds
function updateTime() {
  const timeElement = document.getElementById("current-time");
  setInterval(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeElement.textContent = `${hours}:${minutes}`;
  }, 30000);
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
    const { isOccupied, statusText } = getHallStatus(hall);
    const statusClass = isOccupied ? "occupied" : "free";
    const dotClass = isOccupied ? "red-dot" : "green-dot";

    const cardHTML = `
      <div class="hall-card ${statusClass} border-2 rounded-3xl p-6 cursor-pointer" onclick="showHallDetails('${hall}')">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="font-semibold text-lg leading-tight mb-4">${hall}</h3>
            <p class="${isOccupied ? 'text-red-400' : 'text-green-400'} font-medium text-sm">
              ${statusText}
            </p>
          </div>
          <div class="status-dot ${dotClass} mt-1"></div>
        </div>

        ${!isOccupied ? `
        <button onclick="event.stopImmediatePropagation(); bookHall('${hall}');" 
                class="mt-6 w-full bg-green-600 hover:bg-green-500 py-3.5 rounded-2xl text-sm font-semibold transition">
          Book This Hall
        </button>` : (currentBookings[hall] ? '' : `
        <button onclick="event.stopImmediatePropagation(); freeHallForToday('${hall}');" 
                class="mt-6 w-full bg-yellow-600 hover:bg-yellow-500 py-3.5 rounded-2xl text-sm font-semibold transition">
          Free for Today
        </button>`)}
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
  
  // Current booking
  if (currentBookings[hallName]) {
    const booking = currentBookings[hallName];
    detailsHTML += `
      <div class="bg-gray-800 p-4 rounded-2xl border-l-4 border-red-500">
        <p class="text-red-400 font-semibold mb-2">📌 Current Booking</p>
        <p class="text-gray-300"><strong>Purpose:</strong> ${booking.purpose}</p>
        <p class="text-gray-300"><strong>Until:</strong> ${booking.endTime}</p>
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

function confirmBooking() {
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
    endTime: endTime,
    purpose: purpose
  };

  saveToLocalStorage();  // Save to localStorage

  alert(`✅ Booking Confirmed!\n\nHall: ${selectedHall}\nTime: ${startTime} - ${endTime}\nPurpose: ${purpose}`);

  closeModal();
  renderHalls();   // Refresh the grid
}

// Free hall for today (cancel recurring)
function freeHallForToday(hallName) {
  currentBookings[hallName] = { endTime: "23:59", purpose: "Free" };
  saveToLocalStorage();
  renderHalls();
}

// Initialize the system
function initializeSystem() {
  initTheme();
  loadFromLocalStorage();
  if (Object.keys(currentBookings).length === 0) {
    initializeSampleBookings();
  }
  updateDate();
  updateTime();
  renderHalls();
  startAutoRefresh();
}

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
    loadFromLocalStorage();                    // Reload latest data from localStorage
    renderHalls();      // Re-render halls
    console.log("🔄 Auto-refreshed at " + new Date().toLocaleTimeString());
  }, 8000);   // 8000ms = 8 seconds
}

// Stop auto-refresh when page is closed (optional)
window.onbeforeunload = function() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
};

// Start the application
window.onload = initializeSystem;
