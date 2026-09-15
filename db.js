/*
  db.js — minimal IndexedDB wrapper.
  IMPORTANT: this file is loaded both by index.html (the page) and by
  service-worker.js (importScripts). It must not touch window/document.
  Using IndexedDB instead of localStorage is what lets the service worker
  check "did I log an expense today?" during a background periodic sync,
  even when the app itself is closed.
*/

const DB_NAME = "meri-budget";
const DB_VERSION = 1;

function openBudgetDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("expenses")) {
        const store = db.createObjectStore("expenses", { keyPath: "id" });
        store.createIndex("byDate", "date");
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbGetMeta(key, fallback) {
  const db = await openBudgetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const req = tx.objectStore("meta").get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : fallback);
    req.onerror = () => reject(req.error);
  });
}

async function dbSetMeta(key, value) {
  const db = await openBudgetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ key, value });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbAddExpense(expense) {
  const db = await openBudgetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("expenses", "readwrite");
    tx.objectStore("expenses").put(expense);
    tx.oncomplete = () => resolve(expense);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDeleteExpense(id) {
  const db = await openBudgetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("expenses", "readwrite");
    tx.objectStore("expenses").delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAllExpenses() {
  const db = await openBudgetDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("expenses", "readonly");
    const req = tx.objectStore("expenses").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetExpensesForMonth(yyyyMm) {
  const all = await dbGetAllExpenses();
  return all.filter((e) => e.date.slice(0, 7) === yyyyMm);
}

async function dbHasExpenseOn(dateStr) {
  const all = await dbGetAllExpenses();
  return all.some((e) => e.date === dateStr);
}

// Default budget plan seeded from the user's own numbers.
function defaultPlan() {
  return {
    committee: 20000,
    loan: 10000,
    categories: [
      { id: "food", name: "Food", allocated: 13950 },
      { id: "transport", name: "Transport", allocated: 3560 },
      { id: "rent", name: "Rent", allocated: 3000 },
      { id: "books", name: "Books", allocated: 3000 },
      { id: "personal", name: "Personal care & misc", allocated: 1750 },
      { id: "utilities", name: "Utilities", allocated: 1000 },
      { id: "mobile", name: "Mobile", allocated: 1000 },
      { id: "laundry", name: "Laundry", allocated: 250 }
    ]
  };
}

async function dbGetPlan() {
  const plan = await dbGetMeta("plan", null);
  if (plan) return plan;
  const d = defaultPlan();
  await dbSetMeta("plan", d);
  return d;
}

async function dbSavePlan(plan) {
  await dbSetMeta("plan", plan);
  return plan;
}

async function dbGetSettings() {
  return dbGetMeta("settings", { reminderTime: "22:00", remindersEnabled: false });
}

async function dbSaveSettings(settings) {
  await dbSetMeta("settings", settings);
  return settings;
}
