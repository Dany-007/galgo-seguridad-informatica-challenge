// Dashboard de consumo: ejemplo de "aplicacion de otro equipo" que consume la API de forma segura.
// El token JWT se guarda solo en memoria (variable de modulo), nunca en localStorage, para reducir
// la superficie de robo de token via XSS (ver docs/ARQUITECTURA.md - decisiones de frontend).

let sessionToken = null;
let sessionRole = null;
let currentPage = 1;
let selectedUsuarioId = null;

const loginPanel = document.getElementById("login-panel");
const dataPanel = document.getElementById("data-panel");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const sessionInfo = document.getElementById("session-info");
const tbody = document.getElementById("usuarios-tbody");
const paginationInfo = document.getElementById("pagination-info");
const searchInput = document.getElementById("search-input");
const revealDialog = document.getElementById("reveal-dialog");
const revealForm = document.getElementById("reveal-form");
const revealResult = document.getElementById("reveal-result");

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Error HTTP ${response.status}`);
  }
  return response.json();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    sessionToken = result.token;
    sessionRole = result.role;
    sessionInfo.textContent = `Conectado como "${username}" (rol: ${sessionRole})`;
    loginPanel.classList.add("hidden");
    dataPanel.classList.remove("hidden");
    await loadUsuarios();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  sessionToken = null;
  sessionRole = null;
  sessionInfo.textContent = "";
  dataPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
});

document.getElementById("refresh-btn").addEventListener("click", () => loadUsuarios());
searchInput.addEventListener("input", () => {
  currentPage = 1;
  loadUsuarios();
});

async function loadUsuarios() {
  const params = new URLSearchParams({ page: String(currentPage), pageSize: "20" });
  if (searchInput.value) params.set("search", searchInput.value);

  try {
    const result = await apiFetch(`/api/v1/usuarios?${params.toString()}`);
    tbody.innerHTML = "";
    for (const u of result.data) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${escapeHtml(u.userName)}</td>
        <td>${escapeHtml(u.direccion)}</td>
        <td>${escapeHtml(u.creditCardMasked)}</td>
        <td>${escapeHtml(u.cuentaNumeroMasked)}</td>
        <td>${u.cantidadComprasRealizadas}</td>
        <td>${sessionRole === "admin" ? `<button data-id="${u.id}" class="secondary reveal-btn">Revelar</button>` : "-"}</td>
      `;
      tbody.appendChild(tr);
    }
    paginationInfo.textContent = `Pagina ${result.page} de ${result.totalPages} (total: ${result.total})`;

    document.querySelectorAll(".reveal-btn").forEach((btn) => {
      btn.addEventListener("click", () => openRevealDialog(Number(btn.dataset.id)));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function openRevealDialog(id) {
  selectedUsuarioId = id;
  revealResult.textContent = "";
  document.getElementById("reveal-reason").value = "";
  revealDialog.showModal();
}

document.getElementById("reveal-cancel").addEventListener("click", () => revealDialog.close());

revealForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const reason = document.getElementById("reveal-reason").value;
  try {
    const data = await apiFetch(`/api/v1/usuarios/${selectedUsuarioId}/reveal`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    revealResult.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    revealResult.textContent = `Error: ${err.message}`;
  }
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
