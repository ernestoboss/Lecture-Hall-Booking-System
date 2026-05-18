const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

function createDefaultDatabase() {
  return {
    currentBookings: {
      "LIB LT 1": { endTime: "13:30", purpose: "Research Meeting" },
      "PS FF LT 6": { endTime: "13:00", purpose: "CSC 301" },
      "GREAT HALL 2": { endTime: "16:00", purpose: "University Seminar" },
      "AUDITORIUM": { endTime: "14:30", purpose: "Guest Lecture" }
    },
    recurringBookings: [],
    weeklyPassword: "UNI2026"
  };
}

function readDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData = createDefaultDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse db.json, resetting file.', error);
    const defaultData = createDefaultDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

function writeDatabase(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

app.get('/api/bookings', (req, res) => {
  const db = readDatabase();
  res.json(db);
});

app.put('/api/state', (req, res) => {
  const { currentBookings, recurringBookings, weeklyPassword } = req.body;
  if (!currentBookings || !recurringBookings) {
    return res.status(400).json({ error: 'currentBookings and recurringBookings are required' });
  }

  const db = readDatabase();
  db.currentBookings = currentBookings;
  db.recurringBookings = recurringBookings;
  if (weeklyPassword) db.weeklyPassword = weeklyPassword;
  writeDatabase(db);
  res.json(db);
});

app.post('/api/bookings', (req, res) => {
  const { hall, endTime, purpose } = req.body;
  if (!hall || !endTime || !purpose) {
    return res.status(400).json({ error: 'hall, endTime, and purpose are required' });
  }

  const db = readDatabase();
  db.currentBookings = db.currentBookings || {};
  db.currentBookings[hall] = { endTime, purpose };
  writeDatabase(db);
  res.json(db);
});

app.delete('/api/bookings/:hall', (req, res) => {
  const hall = req.params.hall;
  const db = readDatabase();
  if (db.currentBookings && db.currentBookings[hall]) {
    delete db.currentBookings[hall];
    writeDatabase(db);
  }
  res.json(db);
});

app.post('/api/recurring', (req, res) => {
  const { hall, purpose, startTime, endTime, days } = req.body;
  if (!hall || !purpose || !startTime || !endTime || !Array.isArray(days) || days.length === 0) {
    return res.status(400).json({ error: 'hall, purpose, startTime, endTime, and days are required' });
  }

  const db = readDatabase();
  db.recurringBookings = db.recurringBookings || [];
  db.recurringBookings.push({ id: uuidv4(), hall, purpose, startTime, endTime, days });
  writeDatabase(db);
  res.json(db);
});

app.delete('/api/recurring/:id', (req, res) => {
  const id = req.params.id;
  const db = readDatabase();
  db.recurringBookings = (db.recurringBookings || []).filter(rec => rec.id !== id);
  writeDatabase(db);
  res.json(db);
});

app.put('/api/password', (req, res) => {
  const { weeklyPassword } = req.body;
  if (!weeklyPassword) {
    return res.status(400).json({ error: 'weeklyPassword is required' });
  }
  const db = readDatabase();
  db.weeklyPassword = weeklyPassword;
  writeDatabase(db);
  res.json(db);
});

app.post('/api/bookings/clear', (req, res) => {
  const db = readDatabase();
  db.currentBookings = {};
  writeDatabase(db);
  res.json(db);
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
