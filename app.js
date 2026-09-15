(function () {
  "use strict";

  let plan = null;
  let settings = null;
  let monthExpenses = [];
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const currentMonthKey = () => new Date().toISOString().slice(0, 7);
  const fmt = (n) => Math.round(n).toLocaleString("en-IN");

  // ---------- boot ----------
  async function boot() {
    plan = await dbGetPlan();
    settings = await dbGetSettings();
    monthExpenses = await dbGetExpensesForMonth(currentMonthKey());

    document.getElementById("month-label").textContent = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });
    document.getElementById("input-reminder-time").value = settings.reminderTime || "22:00";
    document.getElementById("expense-date").value = todayIso();

    renderAll();
    bindEvents();
    registerServiceWorker();
    await checkForegroundReminder();
  }

  function renderAll() {
    renderFixedStrip();
    renderHero();
    renderCategories();
    renderRecent();
    renderSettingsInputs();
  }

  // ---------- derived data ----------
  function totalAllocated() {
    return plan.categories.reduce((s, c) => s + Number(c.allocated || 0), 0);
  }
  function spentInCategory(catId) {
    return monthExpenses.filter((e) => e.categoryId === catId).reduce((s, e) => s + e.amount, 0);
  }
  function totalSpent() {
    return monthExpenses.reduce((s, e) => s + e.amount, 0);
  }

  // ---------- rendering ----------
  function renderFixedStrip() {
    const el = document.getElementById("fixed-strip");
    el.innerHTML = `
      <div class="fixed-chip"><div class="label">Committee</div><div class="value">Rs ${fmt(plan.committee)}</div></div>
      <div class="fixed-chip"><div class="label">Loan</div><div class="value">Rs ${fmt(plan.loan)}</div></div>
    `;
  }

  function renderHero() {
    const budget = totalAllocated();
    const spent = totalSpent();
    const remaining = budget - spent;
    const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

    const heroFigure = document.querySelector(".hero-figure");
    const amountEl = document.getElementById("hero-amount");
    const eyebrow = document.getElementById("hero-eyebrow");
    const bar = document.getElementById("hero-bar-fill");

    if (remaining < 0) {
      heroFigure.classList.add("negative");
      eyebrow.textContent = "over budget by";
      amountEl.textContent = fmt(Math.abs(remaining));
      bar.classList.add("over");
      bar.style.width = "100%";
    } else {
      heroFigure.classList.remove("negative");
      eyebrow.textContent = "left to spend this month";
      amountEl.textContent = fmt(remaining);
      bar.classList.remove("over");
      bar.style.width = pct + "%";
    }
    document.getElementById("hero-sub").textContent = `of Rs ${fmt(budget)} flexible budget`;

    renderBanner(budget, spent, remaining);
  }

  function renderBanner(budget, spent, remaining) {
    const slot = document.getElementById("banner-slot");
    slot.innerHTML = "";
    if (remaining < 0) {
      const div = document.createElement("div");
      div.className = "banner";
      div.innerHTML = `<strong>Budget exceeded — </strong>you're Rs ${fmt(Math.abs(remaining))} over your Rs ${fmt(budget)} monthly plan.`;
      slot.appendChild(div);
    } else if (budget > 0 && spent / budget >= 0.9) {
      const div = document.createElement("div");
      div.className = "banner";
      div.innerHTML = `<strong>Almost there — </strong>only Rs ${fmt(remaining)} left this month.`;
      slot.appendChild(div);
    }
  }

  function renderCategories() {
    const el = document.getElementById("category-list");
    el.innerHTML = "";
    plan.categories.forEach((cat) => {
      const spent = spentInCategory(cat.id);
      const allocated = Number(cat.allocated || 0);
      const pct = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : (spent > 0 ? 100 : 0);
      const over = spent > allocated;

      const row = document.createElement("div");
      row.className = "category-row";
      row.innerHTML = `
        <div class="category-row-top">
          <span class="name">${escapeHtml(cat.name)}</span>
          <span class="figures">${over ? "<strong style='color:var(--warn)'>over</strong> · " : ""}<strong>Rs ${fmt(spent)}</strong> / Rs ${fmt(allocated)}</span>
        </div>
        <div class="cat-bar-track"><div class="cat-bar-fill ${over ? "over" : ""}" style="width:${pct}%"></div></div>
      `;
      el.appendChild(row);
    });
  }

  function renderRecent() {
    const el = document.getElementById("recent-list");
    const sorted = [...monthExpenses].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (sorted.length === 0) {
      el.innerHTML = `<p class="empty-note">No expenses logged yet.</p>`;
      return;
    }
    el.innerHTML = sorted
      .slice(0, 25)
      .map((e) => {
        const cat = plan.categories.find((c) => c.id === e.categoryId);
        const dateLabel = new Date(e.date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
        });
        return `
        <div class="recent-row">
          <div class="r-main">
            <span class="r-cat">${escapeHtml(cat ? cat.name : "Other")}</span>
            ${e.note ? `<span class="r-note">${escapeHtml(e.note)}</span>` : ""}
          </div>
          <div style="text-align:right">
            <div class="r-amount">Rs ${fmt(e.amount)}</div>
            <div class="r-date">${dateLabel}</div>
          </div>
        </div>`;
      })
      .join("");
  }

  function renderSettingsInputs() {
    document.getElementById("input-committee").value = plan.committee;
    document.getElementById("input-loan").value = plan.loan;

    const editor = document.getElementById("category-editor");
    editor.innerHTML = "";
    plan.categories.forEach((cat, idx) => {
      const row = document.createElement("div");
      row.className = "cat-edit-row";
      row.innerHTML = `
        <input type="text" value="${escapeHtml(cat.name)}" data-idx="${idx}" data-field="name" />
        <input type="number" value="${cat.allocated}" data-idx="${idx}" data-field="allocated" />
        <button data-remove="${idx}" aria-label="Remove">&times;</button>
      `;
      editor.appendChild(row);
    });

    renderExpenseCategoryOptions();
  }

  function renderExpenseCategoryOptions() {
    const sel = document.getElementById("expense-category");
    sel.innerHTML = plan.categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- navigation ----------
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    if (id === "screen-analytics") {
      window.dispatchEvent(new Event("analyticsOpened"));
    }
  }

  function openSheet() {
    document.getElementById("sheet-backdrop").classList.add("open");
    document.getElementById("sheet-add").classList.add("open");
    document.getElementById("expense-amount").value = "";
    document.getElementById("expense-note").value = "";
    document.getElementById("expense-date").value = todayIso();
  }
  function closeSheet() {
    document.getElementById("sheet-backdrop").classList.remove("open");
    document.getElementById("sheet-add").classList.remove("open");
  }

  // ---------- events ----------
  function bindEvents() {
    document.getElementById("btn-settings").addEventListener("click", () => showScreen("screen-settings"));
    document.getElementById("btn-analytics").addEventListener("click", () => showScreen("screen-analytics"));
    document.getElementById("btn-back").addEventListener("click", () => showScreen("screen-home"));
    document.getElementById("btn-analytics-back").addEventListener("click", () => showScreen("screen-home"));

    document.getElementById("btn-open-add").addEventListener("click", openSheet);
    document.getElementById("btn-cancel-expense").addEventListener("click", closeSheet);
    document.getElementById("sheet-backdrop").addEventListener("click", closeSheet);

    document.getElementById("btn-save-expense").addEventListener("click", saveExpense);

    document.getElementById("input-committee").addEventListener("change", (e) => {
      plan.committee = Number(e.target.value || 0);
      dbSavePlan(plan);
      renderFixedStrip();
    });
    document.getElementById("input-loan").addEventListener("change", (e) => {
      plan.loan = Number(e.target.value || 0);
      dbSavePlan(plan);
      renderFixedStrip();
    });

    document.getElementById("category-editor").addEventListener("change", (e) => {
      const idx = e.target.getAttribute("data-idx");
      const field = e.target.getAttribute("data-field");
      if (idx === null) return;
      if (field === "name") plan.categories[idx].name = e.target.value;
      if (field === "allocated") plan.categories[idx].allocated = Number(e.target.value || 0);
      dbSavePlan(plan).then(() => renderAll());
    });
    document.getElementById("category-editor").addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-remove");
      if (idx === null) return;
      plan.categories.splice(Number(idx), 1);
      dbSavePlan(plan).then(() => renderAll());
    });
    document.getElementById("btn-add-category").addEventListener("click", () => {
      plan.categories.push({ id: "cat-" + Date.now(), name: "New category", allocated: 0 });
      dbSavePlan(plan).then(() => renderAll());
    });

    document.getElementById("btn-enable-notifs").addEventListener("click", async () => {
      const time = document.getElementById("input-reminder-time").value || "22:00";
      const statusEl = document.getElementById("notif-status");
      const result = await requestNotificationSetup(time);
      settings = await dbGetSettings();
      statusEl.textContent = result.ok
        ? `Reminders on for ${time} daily.`
        : result.reason;
    });
    document.getElementById("input-reminder-time").addEventListener("change", async (e) => {
      settings.reminderTime = e.target.value;
      await dbSaveSettings(settings);
    });

    document.getElementById("btn-reset").addEventListener("click", async () => {
      if (!confirm("This clears all expenses and resets your categories. Continue?")) return;
      const all = await dbGetAllExpenses();
      await Promise.all(all.map((e) => dbDeleteExpense(e.id)));
      plan = defaultPlan();
      await dbSavePlan(plan);
      monthExpenses = [];
      renderAll();
      showScreen("screen-home");
    });
  }

  async function saveExpense() {
    const categoryId = document.getElementById("expense-category").value;
    const amount = Number(document.getElementById("expense-amount").value || 0);
    const note = document.getElementById("expense-note").value.trim();
    const date = document.getElementById("expense-date").value || todayIso();

    if (!amount || amount <= 0) {
      alert("Enter an amount greater than zero.");
      return;
    }

    const expense = { id: "exp-" + Date.now(), categoryId, amount, note, date };
    await dbAddExpense(expense);

    if (date.slice(0, 7) === currentMonthKey()) {
      monthExpenses.push(expense);
    }
    closeSheet();
    renderHero();
    renderCategories();
    renderRecent();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.log("SW registration failed:", err);
      });
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForegroundReminder();
  });

  boot();
})();
