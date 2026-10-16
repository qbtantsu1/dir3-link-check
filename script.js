const pages = {
  dashboard: "لوحة التحكم",
  scanner: "فحص رابط",
  history: "سجل الفحوصات",
  guide: "دليل الأمان",
  about: "حول المشروع"
};

const pageButtons = document.querySelectorAll("[data-page]");
const pageElements = document.querySelectorAll(".page");
const currentSection = document.getElementById("currentSection");
const sidebar = document.getElementById("sidebar");
const toast = document.getElementById("toast");
const STORAGE_KEY = "dir3-link-check-history-v1";
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function navigate(pageName) {
  if (!pages[pageName]) return;
  pageElements.forEach(page => page.classList.toggle("active", page.id === `page-${pageName}`));
  document.querySelectorAll(".nav-link[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });
  currentSection.textContent = pages[pageName];
  sidebar.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

pageButtons.forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    navigate(button.dataset.page);
  });
});

document.getElementById("menuToggle").addEventListener("click", () => sidebar.classList.toggle("open"));
document.getElementById("helpButton").addEventListener("click", () => {
  showToast("نصيحة: لا تدخل بياناتك الخاصة في الروابط المشكوك بها.");
});

function getHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
  } catch {
    showToast("تعذر حفظ السجل في هذا المتصفح.");
  }
}

function analyzeUrl(rawValue) {
  const raw = rawValue.trim();
  if (!raw) return { error: "أدخل رابطًا أولًا." };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { error: "الرابط غير مكتمل أو غير صحيح. اكتب الرابط مع http:// أو https://." };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { error: "نوع الرابط غير مدعوم. استخدم رابط ويب يبدأ بـ http:// أو https://." };
  }

  const host = url.hostname.toLowerCase();
  const warnings = [];

  if (url.protocol !== "https:") {
    warnings.push("الرابط لا يستخدم HTTPS. هذا اتصال أقل حماية، لكنه وحده لا يثبت أن الموقع احتيالي.");
  }
  if (url.username || url.password || raw.includes("@")) {
    warnings.push("يحتوي الرابط على بيانات دخول أو علامة @؛ تحقق من اسم المضيف الحقيقي قبل المتابعة.");
  }
  if (host.startsWith("xn--") || host.includes(".xn--")) {
    warnings.push("اسم النطاق يحتوي على صيغة ترميز دولية قد تُستخدم أحيانًا لتقليد أسماء النطاقات.");
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    warnings.push("يستخدم الرابط عنوان IP بدل اسم نطاق مألوف. قد يكون مشروعًا لكنه يستحق التحقق.");
  }
  if (host.split(".").length >= 5) {
    warnings.push("اسم المضيف يحتوي على مستويات فرعية كثيرة؛ تحقق من النطاق الأساسي.");
  }
  if (host.length > 45) {
    warnings.push("اسم المضيف طويل بشكل غير معتاد.");
  }
  if (/(login|verify|secure|account|update|gift|free|wallet|password)/i.test(url.pathname + url.search)) {
    warnings.push("المسار أو معلمات الرابط تتضمن كلمات مثل تسجيل الدخول أو التحقق. هذه الكلمات ليست دليلًا وحدها على الاحتيال.");
  }
  if (raw.length > 180) {
    warnings.push("الرابط طويل جدًا؛ افحصه بعناية ولا تثق به لمجرد أن شكله يبدو رسميًا.");
  }

  return {
    url: raw,
    host,
    protocol: url.protocol,
    warnings,
    isWarning: warnings.length > 0,
    date: new Date().toISOString()
  };
}

function renderResult(result, container) {
  container.replaceChildren();
  if (result.error) {
    container.className = "scan-result";
    const title = document.createElement("h3");
    title.textContent = "تعذر فحص الرابط";
    const message = document.createElement("p");
    message.textContent = result.error;
    message.className = "safe-note";
    container.append(title, message);
    return;
  }

  container.className = "scan-result";
  const header = document.createElement("div");
  header.className = "result-header";
  const mark = document.createElement("div");
  mark.className = `result-mark ${result.isWarning ? "warn" : "ok"}`;
  mark.textContent = result.isWarning ? "!" : "✓";
  const copy = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = result.isWarning ? "تم العثور على مؤشرات تستحق الانتباه" : "لم تظهر المؤشرات المحددة في هذا الفحص";
  const subtitle = document.createElement("p");
  subtitle.textContent = result.isWarning ? `${result.warnings.length} مؤشرًا — لا يعني ذلك بالضرورة أن الرابط ضار.` : "هذه النتيجة لا تثبت أن الرابط آمن.";
  copy.append(title, subtitle);
  header.append(mark, copy);

  const urlLine = document.createElement("div");
  urlLine.className = "result-url";
  urlLine.textContent = result.url;

  const list = document.createElement("ul");
  list.className = "warning-list";
  if (result.warnings.length) {
    result.warnings.forEach(warning => {
      const item = document.createElement("li");
      item.textContent = warning;
      list.appendChild(item);
    });
  } else {
    const item = document.createElement("li");
    item.textContent = "لم تطابق خصائص الرابط القواعد التحذيرية الموجودة في هذه النسخة التعليمية.";
    list.appendChild(item);
  }

  const note = document.createElement("p");
  note.className = "safe-note";
  note.textContent = "تنبيه: هذا تحليل أولي محلي، وليس فحصًا شاملًا للسمعة أو محتوى الموقع. لا تفتح الروابط المجهولة ولا تدخل بيانات حساسة.";
  container.append(header, urlLine, list, note);
}

function performScan(value) {
  const result = analyzeUrl(value);
  const resultContainer = document.getElementById("scanResult");
  renderResult(result, resultContainer);

  if (result.error) {
    showToast(result.error);
    return;
  }

  const history = getHistory();
  history.unshift(result);
  saveHistory(history);
  updateDashboard();
  renderHistory();
  showToast("اكتمل الفحص وحُفظت النتيجة في السجل.");
}

document.getElementById("quickScanForm").addEventListener("submit", event => {
  event.preventDefault();
  const value = document.getElementById("quickUrl").value;
  navigate("scanner");
  document.getElementById("scanUrl").value = value;
  performScan(value);
});

document.getElementById("scanForm").addEventListener("submit", event => {
  event.preventDefault();
  performScan(document.getElementById("scanUrl").value);
});

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" });
}

function updateDashboard() {
  const history = getHistory();
  document.getElementById("statTotal").textContent = history.length;
  document.getElementById("statWarn").textContent = history.filter(item => item.isWarning).length;
  document.getElementById("statLast").textContent = history.length ? formatDate(history[0].date) : "—";
}

function renderHistory() {
  const history = getHistory();
  const body = document.getElementById("historyBody");
  body.replaceChildren();
  document.getElementById("historyCount").textContent = `${history.length} نتيجة`;

  if (!history.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "table-empty";
    cell.textContent = "لا توجد فحوصات بعد. ابدأ بفحص رابط من القائمة.";
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  history.forEach(item => {
    const row = document.createElement("tr");
    const urlCell = document.createElement("td");
    urlCell.className = "url-cell";
    urlCell.textContent = item.url;
    urlCell.title = item.url;

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `status-label ${item.isWarning ? "warn" : "ok"}`;
    status.textContent = item.isWarning ? "يحتاج انتباهًا" : "لا توجد مؤشرات";
    statusCell.appendChild(status);

    const countCell = document.createElement("td");
    countCell.textContent = item.warnings.length;

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(item.date);

    row.append(urlCell, statusCell, countCell, dateCell);
    body.appendChild(row);
  });
}

document.getElementById("clearHistory").addEventListener("click", () => {
  const history = getHistory();
  if (!history.length) {
    showToast("السجل فارغ بالفعل.");
    return;
  }
  if (window.confirm("هل تريد مسح سجل الفحوصات المحفوظ على هذا الجهاز؟")) {
    localStorage.removeItem(STORAGE_KEY);
    updateDashboard();
    renderHistory();
    showToast("تم مسح السجل المحلي.");
  }
});

updateDashboard();
renderHistory();
