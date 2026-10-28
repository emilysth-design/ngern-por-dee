const STORAGE_KEY = "ngern-por-dee-v1";

const categories = [
  { id: "food", name: "อาหาร", icon: "🍜", tone: "orange", budget: 6000 },
  { id: "travel", name: "เดินทาง", icon: "🚌", tone: "blue", budget: 3000 },
  { id: "home", name: "ที่พัก", icon: "🏠", tone: "pink", budget: 8000 },
  { id: "fun", name: "ไลฟ์สไตล์", icon: "☕", tone: "lavender", budget: 2500 },
  { id: "health", name: "สุขภาพ", icon: "🌿", tone: "green", budget: 1500 },
  { id: "other", name: "อื่น ๆ", icon: "✦", tone: "yellow", budget: 2000 },
];

const incomeCategories = [
  { id: "salary", name: "เงินเดือน", icon: "💼" },
  { id: "freelance", name: "งานเสริม", icon: "✨" },
  { id: "other-income", name: "รายรับอื่น ๆ", icon: "↙" },
];

const byId = (id) => document.getElementById(id);
const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
let selectedMonth = currentMonthKey;
let pickerYear = now.getFullYear();
let pickerMonth = now.getMonth() + 1;
let currentView = "overview";
const dateForDay = (day) =>
  `${currentMonthKey}-${String(Math.min(day, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())).padStart(2, "0")}`;

const demoData = {
  transactions: [
    { id: "demo-1", type: "expense", amount: 120, category: "food", date: dateForDay(Math.max(1, now.getDate() - 1)), note: "มื้อกลางวัน" },
    { id: "demo-2", type: "expense", amount: 45, category: "travel", date: dateForDay(Math.max(1, now.getDate() - 1)), note: "รถไฟฟ้า" },
    { id: "demo-3", type: "expense", amount: 185, category: "fun", date: dateForDay(Math.max(1, now.getDate() - 2)), note: "กาแฟกับขนม" },
    { id: "demo-4", type: "expense", amount: 260, category: "food", date: dateForDay(Math.max(1, now.getDate() - 3)), note: "มื้อเย็น" },
    { id: "demo-5", type: "income", amount: 28000, category: "salary", date: dateForDay(1), note: "เงินเดือน" },
  ],
};

const categoryById = new Map(
  [...categories, ...incomeCategories].map((category) => [category.id, category]),
);

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(demoData);
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.transactions)) throw new Error("ข้อมูลรายการไม่ถูกต้อง");
    return parsed;
  } catch (error) {
    console.error("ไม่สามารถโหลดข้อมูลรายการได้", error);
    return structuredClone(demoData);
  }
}

let state = loadData();
let toastTimer;
let editingTransactionId = null;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("ไม่สามารถบันทึกข้อมูลรายการได้", error);
    return false;
  }
}

function formatMoney(value, digits = 0) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;
  if (dateString === today) return "วันนี้";
  if (dateString === yesterday) return "เมื่อวาน";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(date);
}

function currentMonthTransactions() {
  return state.transactions.filter((transaction) => transaction.date.startsWith(selectedMonth));
}

function sumTransactions(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function renderSummary(transactions) {
  const income = sumTransactions(transactions, "income");
  const expenses = sumTransactions(transactions, "expense");
  const remaining = income - expenses;
  const spentPercentage = income > 0 ? Math.min((expenses / income) * 100, 100) : 0;

  const [year, month] = selectedMonth.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, 1);
  const monthName = new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(selectedDate);
  byId("month-name").textContent = monthName;
  byId("summary-period").textContent = monthName;
  byId("remaining-amount").textContent = `฿${formatMoney(remaining)}`;
  byId("spent-amount").textContent = `฿${formatMoney(expenses)}`;
  byId("income-amount").textContent = `฿${formatMoney(income)}`;
  byId("income-stat").textContent = `฿${formatMoney(income)}`;
  byId("expense-stat").textContent = `฿${formatMoney(expenses)}`;
  byId("balance-progress").style.width = `${spentPercentage}%`;
  byId("remaining-amount").classList.toggle("negative-balance", remaining < 0);
}

function renderBudgets(transactions) {
  byId("budget-list").innerHTML = categories
    .map((category) => {
      const spent = transactions
        .filter((transaction) => transaction.type === "expense" && transaction.category === category.id)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const percentage = (spent / category.budget) * 100;
      const status = percentage >= 100 ? "over" : percentage >= 75 ? "warning" : "";
      return `
        <article class="budget-card">
          <div class="budget-topline">
            <span class="category-icon tone-${category.tone}" aria-hidden="true">${category.icon}</span>
            <span class="budget-name">${category.name}</span>
          </div>
          <div class="budget-numbers">
            <strong>฿${formatMoney(spent)}</strong>
            <span>จาก ฿${formatMoney(category.budget)}</span>
          </div>
          <div class="budget-track" role="progressbar" aria-label="งบ${category.name}" aria-valuenow="${Math.round(percentage)}" aria-valuemin="0" aria-valuemax="100">
            <span class="${status}" style="width: ${Math.min(percentage, 100)}%"></span>
          </div>
        </article>`;
    })
    .join("");
}

function renderBreakdown(transactions, listId, emptyId, transactionType, categoryList, total) {
  const amounts = new Map(
    categoryList.map((category) => [
      category.id,
      sumTransactions(
        transactions.filter((transaction) => transaction.category === category.id),
        transactionType,
      ),
    ]),
  );
  const rows = categoryList
    .map((category) => {
      const amount = amounts.get(category.id) ?? 0;
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      return { category, amount, percentage };
    })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  byId(listId).innerHTML = rows
    .map(({ category, amount, percentage }) => `
      <article class="breakdown-row">
        <span class="category-icon tone-${category.tone ?? (transactionType === "income" ? "green" : "yellow")}" aria-hidden="true">${category.icon}</span>
        <div class="breakdown-copy">
          <div class="breakdown-label">
            <span>${escapeHTML(category.name)}</span>
            <strong>฿${formatMoney(amount)}</strong>
          </div>
          <div class="breakdown-track" role="progressbar" aria-label="${escapeHTML(category.name)} คิดเป็น ${Math.round(percentage)} เปอร์เซ็นต์" aria-valuenow="${Math.round(percentage)}" aria-valuemin="0" aria-valuemax="100">
            <span class="${transactionType}" style="width: ${percentage}%"></span>
          </div>
        </div>
        <span class="breakdown-percentage">${Math.round(percentage)}%</span>
      </article>`)
    .join("");
  byId(emptyId).hidden = rows.length > 0;
}

function renderSummaryPage(transactions) {
  const income = sumTransactions(transactions, "income");
  const expenses = sumTransactions(transactions, "expense");
  const balance = income - expenses;
  const transactionCount = transactions.length;

  byId("summary-income-total").textContent = `฿${formatMoney(income)}`;
  byId("summary-expense-total").textContent = `฿${formatMoney(expenses)}`;
  byId("summary-balance-total").textContent = `฿${formatMoney(balance)}`;
  byId("summary-balance-total").classList.toggle("negative-balance", balance < 0);
  renderBreakdown(transactions, "expense-breakdown", "expense-breakdown-empty", "expense", categories, expenses);
  renderBreakdown(transactions, "income-breakdown", "income-breakdown-empty", "income", incomeCategories, income);
  byId("summary-transaction-count").textContent = `${formatMoney(transactionCount)} รายการใน${byId("month-name").textContent}`;
}

function renderTransactions(transactions) {
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const visibleTransactions = currentView === "history" ? sorted : sorted.slice(0, 5);
  byId("transaction-list").innerHTML = visibleTransactions
    .map((transaction) => {
      const category = categoryById.get(transaction.category) ?? { name: "อื่น ๆ", icon: "✦", tone: "yellow" };
      const isIncome = transaction.type === "income";
      const title = transaction.note || category.name;
      return `
        <article class="transaction-row">
          <span class="category-icon tone-${category.tone ?? "green"}" aria-hidden="true">${category.icon}</span>
          <div class="transaction-copy">
            <p class="transaction-title">${escapeHTML(title)}</p>
            <p class="transaction-meta">${category.name} · ${formatDate(transaction.date)}</p>
          </div>
          <span class="transaction-amount ${isIncome ? "income" : ""}">${isIncome ? "+" : "−"}฿${formatMoney(transaction.amount)}</span>
          <button class="edit-transaction" type="button" data-edit-transaction="${escapeHTML(transaction.id)}" aria-label="แก้ไข${escapeHTML(title)}">แก้ไข</button>
        </article>`;
    })
    .join("");
  byId("transaction-list").hidden = visibleTransactions.length === 0;
  byId("empty-state").hidden = visibleTransactions.length > 0;
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  byId("empty-state").textContent = `ยังไม่มีรายการใน${monthName} ลองเพิ่มรายการแรกของคุณเลย`;
  byId("all-transactions").textContent = currentView === "history" ? "กลับภาพรวม ↑" : "ดูทั้งหมด →";
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function render() {
  const transactions = currentMonthTransactions();
  renderSummary(transactions);
  renderBudgets(transactions);
  renderSummaryPage(transactions);
  renderTransactions(transactions);
  const historyView = currentView === "history";
  const summaryView = currentView === "summary";
  byId("overview-summary-card").hidden = summaryView;
  byId("budget-section").hidden = historyView || summaryView;
  byId("summary-page").hidden = !summaryView;
  byId("activity-section").hidden = summaryView;
  byId("month-label").textContent = summaryView ? "สรุปการเงินประจำเดือน" : "ภาพรวมประจำเดือน";
  byId("welcome-title").textContent = historyView ? "ประวัติรายการ" : summaryView ? "สรุปการเงิน" : "สวัสดี, วันนี้เป็นไงบ้าง?";
  byId("activity-title").textContent = historyView ? "รายการทั้งหมด" : "รายการใช้จ่าย";
  byId("activity-eyebrow").textContent = historyView ? `รายการทั้งหมดใน${byId("month-name").textContent}` : "อัปเดตล่าสุด";
  document.querySelectorAll(".nav-item").forEach((item) => {
    const active = item.id === (historyView ? "nav-transactions" : summaryView ? "nav-summary" : "nav-overview");
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

function updateCategoryOptions(type) {
  const options = type === "income" ? incomeCategories : categories;
  byId("category").innerHTML = options
    .map((category) => `<option value="${category.id}">${category.icon}  ${category.name}</option>`)
    .join("");
  byId("expense-option").classList.toggle("selected", type === "expense");
  byId("income-option").classList.toggle("selected", type === "income");
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2500);
}

function renderMonthPicker() {
  byId("picker-year").textContent = String(pickerYear);
  byId("previous-year").disabled = pickerYear <= 1900;
  byId("next-year").disabled = pickerYear >= 9999;
  byId("month-grid").innerHTML = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const name = new Intl.DateTimeFormat("th-TH", { month: "long" }).format(new Date(2020, index, 1));
    const selected = month === pickerMonth;
    return `<button class="month-option${selected ? " selected" : ""}" type="button" data-month="${month}" aria-pressed="${selected}">${name}</button>`;
  }).join("");
}

function openDialog(transaction = null, initialType = "expense") {
  const form = byId("expense-form");
  form.reset();
  editingTransactionId = transaction?.id ?? null;
  const type = transaction?.type ?? initialType;
  form.elements.type.value = type;
  const defaultDay = selectedMonth === currentMonthKey ? now.getDate() : 1;
  const [year, month] = selectedMonth.split("-").map(Number);
  const day = Math.min(defaultDay, new Date(year, month, 0).getDate());
  byId("date").value = transaction?.date ?? `${selectedMonth}-${String(day).padStart(2, "0")}`;
  byId("amount").value = transaction?.amount ?? "";
  byId("note").value = transaction?.note ?? "";
  byId("form-error").hidden = true;
  updateCategoryOptions(type);
  if (transaction) byId("category").value = transaction.category;
  byId("type-toggle").hidden = false;
  byId("category-field").hidden = false;
  byId("dialog-title").textContent = transaction ? "แก้ไขรายการ" : type === "income" ? "เพิ่มรายรับ" : "เพิ่มรายจ่าย";
  byId("expense-form").querySelector(".submit-button").innerHTML = transaction
    ? 'บันทึกการแก้ไข <span aria-hidden="true">→</span>'
    : 'บันทึกรายการ <span aria-hidden="true">→</span>';
  byId("expense-dialog").showModal();
  window.setTimeout(() => byId("amount").focus(), 50);
}

byId("open-expense").addEventListener("click", () => byId("entry-type-dialog").showModal());
byId("close-entry-type").addEventListener("click", () => byId("entry-type-dialog").close());
byId("entry-type-dialog").addEventListener("click", (event) => {
  if (event.target === byId("entry-type-dialog")) byId("entry-type-dialog").close();
});
byId("add-income").addEventListener("click", () => {
  byId("entry-type-dialog").close();
  openDialog(null, "income");
});
byId("add-expense").addEventListener("click", () => {
  byId("entry-type-dialog").close();
  openDialog(null, "expense");
});
byId("close-dialog").addEventListener("click", () => byId("expense-dialog").close());
byId("expense-dialog").addEventListener("click", (event) => {
  if (event.target === byId("expense-dialog")) byId("expense-dialog").close();
});
byId("expense-dialog").addEventListener("close", () => {
  editingTransactionId = null;
});

byId("transaction-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-transaction]");
  if (!button) return;
  const transaction = state.transactions.find((item) => item.id === button.dataset.editTransaction);
  if (!transaction) {
    console.error("ไม่พบรายการที่ต้องการแก้ไข");
    showToast("ไม่พบรายการนี้");
    return;
  }
  openDialog(transaction);
});

byId("expense-form").elements.type.forEach((radio) => {
  radio.addEventListener("change", (event) => updateCategoryOptions(event.target.value));
});

byId("expense-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const amount = Number(formData.get("amount"));
  const date = String(formData.get("date"));
  const currentTransaction = editingTransactionId
    ? state.transactions.find((item) => item.id === editingTransactionId)
    : null;
  const type = String(formData.get("type"));
  const category = String(formData.get("category"));
  const error = byId("form-error");

  if (!Number.isFinite(amount) || amount <= 0) {
    error.textContent = "กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท";
    error.hidden = false;
    byId("amount").focus();
    return;
  }
  if (!categoryById.has(category) || (type === "income") !== incomeCategories.some((item) => item.id === category)) {
    error.textContent = "กรุณาเลือกหมวดหมู่ให้ตรงกับประเภทรายการ";
    error.hidden = false;
    return;
  }
  if (!date || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    error.textContent = "กรุณาเลือกวันที่ให้ถูกต้อง";
    error.hidden = false;
    return;
  }

  const transaction = {
    id: currentTransaction?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    amount,
    category,
    date,
    note: String(formData.get("note")).trim(),
  };
  const editedIndex = currentTransaction ? state.transactions.indexOf(currentTransaction) : -1;
  if (currentTransaction) {
    state.transactions[editedIndex] = transaction;
  } else {
    state.transactions.push(transaction);
  }
  if (!saveData()) {
    if (currentTransaction) {
      state.transactions[editedIndex] = currentTransaction;
    } else {
      state.transactions.pop();
    }
    error.textContent = "บันทึกไม่สำเร็จ พื้นที่จัดเก็บในอุปกรณ์อาจไม่เพียงพอ";
    error.hidden = false;
    return;
  }

  byId("expense-dialog").close();
  render();
  showToast(currentTransaction ? "แก้ไขรายการแล้ว" : type === "expense" ? "เพิ่มรายจ่ายแล้ว" : "เพิ่มรายรับแล้ว");
});

function showNavMessage(message) {
  showToast(message);
}

function showHistory() {
  currentView = "history";
  render();
  byId("activity-title").scrollIntoView({ behavior: "smooth", block: "center" });
}

byId("nav-overview").addEventListener("click", () => {
  currentView = "overview";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
byId("nav-transactions").addEventListener("click", showHistory);
byId("all-transactions").addEventListener("click", () => {
  if (currentView === "history") {
    currentView = "overview";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    showHistory();
  }
});
function showBudgets() {
  currentView = "overview";
  render();
  byId("budget-title").scrollIntoView({ behavior: "smooth", block: "center" });
}

byId("nav-budgets").addEventListener("click", showBudgets);
byId("all-budgets").addEventListener("click", showBudgets);
byId("nav-summary").addEventListener("click", () => {
  currentView = "summary";
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
byId("month-picker").addEventListener("click", () => {
  [pickerYear, pickerMonth] = selectedMonth.split("-").map(Number);
  renderMonthPicker();
  byId("month-dialog").showModal();
});
byId("close-month-dialog").addEventListener("click", () => byId("month-dialog").close());
byId("previous-year").addEventListener("click", () => {
  if (pickerYear > 1900) pickerYear -= 1;
  renderMonthPicker();
});
byId("next-year").addEventListener("click", () => {
  if (pickerYear < 9999) pickerYear += 1;
  renderMonthPicker();
});
byId("month-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-month]");
  if (!button) return;
  pickerMonth = Number(button.dataset.month);
  renderMonthPicker();
});
byId("month-form").addEventListener("submit", (event) => {
  event.preventDefault();
  selectedMonth = `${pickerYear}-${String(pickerMonth).padStart(2, "0")}`;
  byId("month-dialog").close();
  render();
});

render();
