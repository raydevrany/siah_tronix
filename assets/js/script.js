// Global State
let products = [];
let categories = [];
let cart = JSON.parse(localStorage.getItem("es_cart") || "[]"); // Keep cart local for now
let currentUser = null;
let activeCategory = "All";
let orders = [];
let authMode = "login";
let previewProduct = null;
let selectedPayment = "mobile";
let selectedProvider = "";
const touchedCheckout = {};
let adminActiveTab = "dashboard";
let adminAvatarPreview = null;
let adminProductImageData = null;
let dynamicUpdateInterval = null;
let adminCache = {
  stats: null,
  orders: null,
  users: null,
  products: null,
};

// API Base URL (relative)
const API_BASE = "api";

function formatTZS(amount) {
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
  // Aggressive search clear
  const prodSearch = document.getElementById("prod-search-input");
  if (prodSearch) {
    prodSearch.value = "";
    setTimeout(() => {
      prodSearch.value = "";
    }, 100);
    setTimeout(() => {
      prodSearch.value = "";
    }, 500);
  }

  updateAuthUI();
  await checkSession();
  await fetchCategories();
  await fetchProducts();
  updateCartUI();

  // Handle initial page from hash
  const initialHash = window.location.hash.replace("#", "") || "home";
  navigate(initialHash);

  reinitIcons();
  startDynamicPolling();

  // Hide Preloader
  const preloader = document.getElementById("preloader");
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add("fade-out");
      setTimeout(() => preloader.remove(), 400); // Remove from DOM after fade
    }, 100); // Slight delay to ensure content is ready
  }
});

// Deep comparison helper for real-time updates
function dataChanged(oldData, newData) {
  return JSON.stringify(oldData) !== JSON.stringify(newData);
}

function prefetchAdminData() {
  if (currentUser && currentUser.role === "admin") {
    // Only fetch stats initially. Orders and Users are fetched when tab is clicked.
    fetch(`${API_BASE}/admin.php?action=stats`)
      .then((r) => r.json())
      .then((d) => {
        adminCache.stats = d;
      })
      .catch((e) => {});
  }
}

function startDynamicPolling() {
  if (dynamicUpdateInterval) clearInterval(dynamicUpdateInterval);
  dynamicUpdateInterval = setInterval(async () => {
    if (!currentUser) return;

    // Get current hash route
    const hash = window.location.hash.replace("#", "");
    const [page, sub] = hash.split("/");

    if (page === "orders") {
      await fetchOrders(true);
    } else if (page === "admin") {
      renderAdminContent(true);
    } else if (page === "home" || !page) {
      // Poll products for shop
      await fetchProducts(false, true);
    }
  }, 3000); // Poll every 3 seconds for real-time feel
}

async function checkSession() {
  try {
    const res = await fetch(`${API_BASE}/auth.php?action=check_session`);
    const data = await res.json();
    if (data.logged_in) {
      currentUser = data.user;
    } else {
      currentUser = null;
    }

    // Pre-fetch admin data if user is admin to reduce perceived delay
    prefetchAdminData();
  } catch (e) {
    console.error("Session check failed", e);
    currentUser = null;
  }
  updateAuthUI();
}

async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories.php`);
    const data = await res.json();
    if (Array.isArray(data)) {
      categories = ["All", ...data];
      renderCategories();
      reinitIcons();
    }
  } catch (e) {
    console.error("Failed to fetch categories", e);
  }
}

async function fetchProducts(fetchAll = false, isBackground = false) {
  try {
    let url = `${API_BASE}/products.php`;
    if (!fetchAll && activeCategory !== "All")
      url += `?category=${encodeURIComponent(activeCategory)}`;

    const isShopSearch =
      !fetchAll && !!document.getElementById("prod-search-input");
    const searchVal = isShopSearch
      ? document.getElementById("prod-search-input").value
      : "";

    if (searchVal) {
      url +=
        (url.includes("?") ? "&" : "?") +
        `search=${encodeURIComponent(searchVal)}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data)) {
      if (isBackground && !dataChanged(products, data)) return;
      products = data;
      if (!isBackground) renderProducts();
      else {
        // for background, we might want to re-render to update prices/stock
        // but we should avoid stealing focus if input is active?
        // search inputs are handled by filterProducts() which calls this.
        // if background update happens, we just want to update the grid prices/stock.
        renderProducts();
      }
    }
  } catch (e) {
    console.error("Failed to fetch products", e);
  }
}

// No-op for the duplicate function being removed

function li(name, size) {
  const s = size || 20;
  return `<i data-lucide="${name}" style="width:${s}px;height:${s}px;"></i>`;
}

function reinitIcons() {
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function showToast(msg, type, duration) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const dur = duration || 4000;
  const t = document.createElement("div");
  t.className = "toast " + (type || "success");
  const iconName = type === "error" ? "x-circle" : "check-circle";
  t.innerHTML = `<i data-lucide="${iconName}" class="toast-icon"></i><span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()"><i data-lucide="x" style="width:14px;height:14px;"></i></button>`;
  document.body.appendChild(t);
  reinitIcons();
  const timer = setTimeout(() => {
    if (t.parentElement) {
      t.style.opacity = "0";
      t.style.transition = "opacity 0.3s";
      setTimeout(() => t.remove(), 300);
    }
  }, dur);
  t._timer = timer;
}

// Helper functions removed (fetch API used instead)

let heroIdx = 0;
setInterval(() => {
  const prev = document.getElementById("hero-img-" + heroIdx);
  if (prev) prev.classList.add("hidden");
  heroIdx = (heroIdx + 1) % 3;
  const next = document.getElementById("hero-img-" + heroIdx);
  if (next) next.classList.remove("hidden");
  document
    .querySelectorAll("#hero-dots .hero-dot")
    .forEach((d, i) => d.classList.toggle("active", i === heroIdx));
}, 5000);

async function navigate(page, adminTab) {
  // Extract base page and admin tab from page parameter if it contains '/'
  let basePage = page;
  let targetAdminTab = adminTab;

  if (page.includes("/")) {
    const parts = page.split("/");
    basePage = parts[0];
    targetAdminTab = parts[1];
  }

  // Build target hash
  const targetHash = targetAdminTab
    ? `#${basePage}/${targetAdminTab}`
    : `#${basePage}`;

  // If hash doesn't match, update it and return (hashchange will call navigate again)
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
    return;
  }

  // Perform actual navigation
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  const el = document.getElementById("page-" + basePage);
  if (el) el.classList.add("active");
  const nb = document.getElementById("navbar");
  if (nb)
    nb.style.display =
      basePage === "confirmation" || basePage === "admin" ? "none" : "";
  window.scrollTo(0, 0);

  if (basePage === "checkout") renderCheckoutSummary();
  if (basePage === "profile") populateProfile();
  if (basePage === "orders") {
    await fetchOrders();
    renderOrders();
  }
  if (basePage === "admin") {
    adminActiveTab = targetAdminTab || "dashboard";
    // fetchProducts(true); // Removed to prioritize stats/orders loading
    renderAdminContent();
  }
  reinitIcons();
}

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace("#", "") || "home";
  navigate(hash);
});

function renderCategories() {
  const container = document.getElementById("category-filter");
  if (!container) return;
  container.innerHTML = categories
    .map(
      (c) =>
        `<button class="category-btn ${c === activeCategory ? "active" : ""}" onclick="setCategory('${c}')">${c}</button>`,
    )
    .join("");
}
function setCategory(cat) {
  activeCategory = cat;
  renderCategories();
  fetchProducts();
}

function renderProducts() {
  const grid = document.getElementById("product-grid");
  const empty = document.getElementById("no-products");
  if (!grid) return;
  if (products.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  grid.innerHTML = products
    .map(
      (p) => `
    <div class="product-card" onclick="openPreview('${p.id}')">
      ${p.badge ? `<div class="badge ${p.badge === "Sale" ? "badge-destructive" : "badge-default"}" style="position:absolute;top:12px;left:12px;z-index:9;">${p.badge}</div>` : ""}
      ${!p.inStock ? '<div class="badge badge-destructive" style="position:absolute;top:12px;right:12px;z-index:8;">Out of Stock</div>' : ""}
      <div class="product-img"><img src="${p.image}" alt="${p.name}" loading="lazy" /></div>
      <div class="product-info">
        <p class="category">${p.category}</p>
        <h3 class="line-clamp-1">${p.name}</h3>
        <p class="desc line-clamp-2">${p.description}</p>
        <div class="product-footer">
          <span class="product-price">${formatTZS(p.price)}</span>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart('${p.id}')">
            ${li("shopping-cart", 14)} Add
          </button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
  reinitIcons();
}

function filterProducts() {
  fetchProducts();
}

function addToCart(id) {
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return;
  const existing = cart.find((i) => String(i.id) === String(id));
  if (existing) existing.quantity++;
  else
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
  updateCartUI();
  saveCart();
}
function saveCart() {
  localStorage.setItem("es_cart", JSON.stringify(cart));
}
function removeFromCart(id) {
  cart = cart.filter((i) => String(i.id) !== String(id));
  updateCartUI();
  saveCart();
  renderCartContent();
  if (window.location.hash.includes("checkout")) renderCheckoutSummary();
}
function updateQty(id, delta) {
  const item = cart.find((i) => String(i.id) === String(id));
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0)
    cart = cart.filter((i) => String(i.id) !== String(id));
  updateCartUI();
  saveCart();
  renderCartContent();
  if (window.location.hash.includes("checkout")) renderCheckoutSummary();
}
function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.quantity, 0);
  ["cart-badge-desktop", "cart-badge-mobile"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = total;
      el.style.display = total > 0 ? "flex" : "none";
    }
  });
  const cc = document.getElementById("cart-count");
  if (cc) cc.textContent = total;
}
function openCart() {
  document.getElementById("cart-overlay").classList.add("open");
  document.getElementById("cart-drawer").classList.add("open");
  renderCartContent();
}
function closeCart() {
  document.getElementById("cart-overlay").classList.remove("open");
  document.getElementById("cart-drawer").classList.remove("open");
}
function renderCartContent() {
  const container = document.getElementById("cart-content");
  if (!container) return;
  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty">${li("shopping-bag", 40)} <div><p style="font-weight:600;color:var(--fg);">Your cart is empty</p><p style="font-size:0.875rem;color:var(--muted-fg);margin-top:0.25rem;">Add items to get started</p></div><button class="btn btn-outline" onclick="closeCart()">Continue Shopping</button></div>`;
    reinitIcons();
    return;
  }
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = 0; // Paid on Delivery
  container.innerHTML = `
    <div class="cart-items">${cart
      .map(
        (i) => `
      <div class="cart-item">
        <div class="cart-item-img"><img src="${i.image}" alt="${i.name}" /></div>
        <div class="cart-item-info">
          <h4>${i.name}</h4>
          <div class="cart-item-price">${formatTZS(i.price)}</div>
          <div class="cart-item-qty">
            <button class="btn btn-outline btn-icon-sm" onclick="updateQty('${i.id}',-1)">${li("minus", 14)}</button>
            <span>${i.quantity}</span>
            <button class="btn btn-outline btn-icon-sm" onclick="updateQty('${i.id}',1)">${li("plus", 14)}</button>
            <button class="btn btn-ghost btn-icon-sm" style="margin-left:auto;color:var(--destructive);" onclick="removeFromCart('${i.id}')">${li("trash-2", 14)}</button>
          </div>
        </div>
      </div>`,
      )
      .join("")}
    </div>
    <div class="cart-summary">
      <div class="cart-summary-row"><span class="label">Subtotal</span><span class="value">${formatTZS(subtotal)}</span></div>
      <div class="cart-summary-row"><span class="label">Delivery</span><span class="value" style="color:var(--primary);font-weight:500;">Pay on Delivery</span></div>
      <div class="cart-total"><span>Total</span><span>${formatTZS(subtotal + shipping)}</span></div>
      <button class="btn btn-primary btn-lg" style="width:100%;" onclick="goToCheckout()">Proceed to Checkout</button>
    </div>`;
  reinitIcons();
}
function goToCheckout() {
  if (!currentUser) {
    closeCart();
    openAuthModal();
    return;
  }
  closeCart();
  navigate("checkout");
}

function openPreview(id) {
  previewProduct = products.find((p) => String(p.id) === String(id));
  if (!previewProduct) return;
  document.getElementById("preview-img").src = previewProduct.image;
  document.getElementById("preview-img").alt = previewProduct.name;
  document.getElementById("preview-category").textContent =
    previewProduct.category;
  document.getElementById("preview-name").textContent = previewProduct.name;
  document.getElementById("preview-desc").textContent =
    previewProduct.description;
  document.getElementById("preview-price").textContent = formatTZS(
    previewProduct.price,
  );
  document.getElementById("preview-specs").innerHTML =
    previewProduct.specs && previewProduct.specs.length > 0
      ? previewProduct.specs
          .map(
            (s) =>
              `<div class="preview-spec">${li("check", 14)}<span>${s}</span></div>`,
          )
          .join("")
      : `<p style="font-size:0.875rem;color:var(--muted-fg);font-style:italic;">No specifications available</p>`;

  // Stock Status in Preview
  const badgeStock = document.querySelector(".badge-stock");
  if (badgeStock) {
    badgeStock.textContent = previewProduct.inStock
      ? "In Stock"
      : "Out of Stock";
    badgeStock.className =
      "badge " +
      (previewProduct.inStock ? "badge-success" : "badge-destructive");
  }

  const badge = document.getElementById("preview-badge");
  if (previewProduct.badge) {
    badge.textContent = previewProduct.badge;
    badge.style.display = "inline-flex";
    badge.className =
      "badge " +
      (previewProduct.badge === "Sale" ? "badge-destructive" : "badge-default");
  } else {
    badge.style.display = "none";
  }
  document.getElementById("preview-overlay").classList.add("open");
  reinitIcons();
}
function closePreview() {
  document.getElementById("preview-overlay").classList.remove("open");
}
function addToCartFromPreview() {
  if (previewProduct) {
    addToCart(previewProduct.id);
    closePreview();
  }
}

function openAuthModal() {
  if (authMode !== "login") {
    switchAuthMode();
  }
  document.getElementById("auth-overlay").classList.add("open");
}
function closeAuthModal() {
  document.getElementById("auth-overlay").classList.remove("open");
  clearAuthErrors();
}
function clearAuthErrors() {
  const ids =
    authMode === "login"
      ? ["li-email", "li-pass"]
      : ["su-fn", "su-ln", "su-email", "su-pass", "su-confirm"];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("is-error", "is-valid");
      const err = el.closest(".form-group")?.querySelector(".form-error");
      if (err) err.remove();
      // Reset password visibility
      if (
        el.type === "text" &&
        (id.includes("-pass") || id.includes("-confirm"))
      ) {
        el.type = "password";
        const btn = el
          .closest(".input-wrapper")
          ?.querySelector(".password-toggle");
        if (btn) {
          btn.innerHTML = li("eye", 16);
          reinitIcons();
        }
      }
    }
  });
}

function toggleAuthPassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === "password";

  // Toggle the primary input
  input.type = isPass ? "text" : "password";

  // If it's the signup primary password, also toggle the confirm field
  if (inputId === "su-pass") {
    const confirm = document.getElementById("su-confirm");
    if (confirm) confirm.type = isPass ? "text" : "password";
  }

  btn.innerHTML = li(isPass ? "eye-off" : "eye", 16);
  reinitIcons();
}

function switchAuthMode() {
  authMode = authMode === "login" ? "signup" : "login";
  const title = document.getElementById("auth-title");
  const desc = document.getElementById("auth-desc");
  const form = document.getElementById("auth-form");

  const signupFields = document.getElementById("signup-fields");
  const loginFields = document.getElementById("login-fields");

  title.textContent = authMode === "login" ? "Welcome Back" : "Create Account";
  desc.textContent =
    authMode === "login"
      ? "Sign in to your account to proceed to checkout"
      : "Create an account to start shopping";

  if (signupFields)
    signupFields.style.display = authMode === "signup" ? "block" : "none";
  if (loginFields)
    loginFields.style.display = authMode === "login" ? "block" : "none";

  document.querySelector("#auth-form button[type=submit]").textContent =
    authMode === "login" ? "Sign In" : "Create Account";
  document.getElementById("auth-switch").innerHTML =
    authMode === "login"
      ? 'Don\'t have an account? <button style="background:none;border:none;color:var(--primary);font-weight:500;cursor:pointer;" onclick="switchAuthMode()">Sign up</button>'
      : 'Already have an account? <button style="background:none;border:none;color:var(--primary);font-weight:500;cursor:pointer;" onclick="switchAuthMode()">Sign in</button>';

  // Refine autofill behavior
  if (authMode === "login") {
    form.autocomplete = "on";
  } else {
    form.autocomplete = "off";
  }

  clearAuthErrors();
}

function validateAuthField(el) {
  const id = el.id;
  const val = el.value.trim();
  let error = "";

  if (id === "su-fn" && !val) error = "First name is required";
  else if (id === "su-fn" && val.length < 2) error = "At least 2 characters";
  else if (id === "su-ln" && !val) error = "Last name is required";
  else if (id === "su-ln" && val.length < 2) error = "At least 2 characters";
  else if ((id === "su-email" || id === "li-email") && !val)
    error = "Email is required";
  else if (
    (id === "su-email" || id === "li-email") &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  )
    error = "Enter a valid email";
  else if ((id === "su-pass" || id === "li-pass") && !val)
    error = "Password is required";
  else if ((id === "su-pass" || id === "li-pass") && val.length < 6)
    error = "At least 6 characters";
  else if (id === "su-confirm") {
    const pass = document.getElementById("su-pass").value;
    if (!val) error = "Confirm your password";
    else if (val !== pass) error = "Passwords don't match";
  }

  showFieldError(el, error);
}

function showFieldError(el, error) {
  const group = el.closest(".form-group");
  if (!group) return;
  const oldErr = group.querySelector(".form-error");
  if (oldErr) oldErr.remove();
  if (error) {
    el.classList.add("is-error");
    el.classList.remove("is-valid");
    const errP = document.createElement("p");
    errP.className = "form-error";
    errP.textContent = error;
    group.appendChild(errP);
  } else if (el.value.trim()) {
    el.classList.remove("is-error");
    el.classList.add("is-valid");
  } else {
    el.classList.remove("is-error", "is-valid");
  }
}

async function handleAuth(e) {
  e.preventDefault();

  if (authMode === "signup") {
    const fn = document.getElementById("su-fn");
    const ln = document.getElementById("su-ln");
    const email = document.getElementById("su-email");
    const pass = document.getElementById("su-pass");
    const confirm = document.getElementById("su-confirm");

    [fn, ln, email, pass, confirm].forEach((el) => validateAuthField(el));

    if (document.querySelectorAll("#auth-form .is-error").length > 0) return;
    if (
      !fn.value.trim() ||
      !ln.value.trim() ||
      !email.value.trim() ||
      !pass.value.trim() ||
      !confirm.value.trim()
    )
      return;

    try {
      const res = await fetch(`${API_BASE}/auth.php?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: fn.value.trim(),
          last_name: ln.value.trim(),
          email: email.value.trim(),
          password: pass.value,
        }),
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        closeAuthModal();
        updateAuthUI();
        showToast(
          "Welcome to Siah Tronix, " + currentUser.firstName + "!",
          "success",
        );
        fetchOrders();
        prefetchAdminData();
        clearAuthInputs();
      } else {
        showFieldError(email, data.error || "Registration failed");
      }
    } catch (err) {
      showFieldError(email, "Connection error");
    }
  } else {
    const email = document.getElementById("li-email");
    const pass = document.getElementById("li-pass");

    [email, pass].forEach((el) => validateAuthField(el));

    if (document.querySelectorAll("#auth-form .is-error").length > 0) return;
    if (!email.value.trim() || !pass.value.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/auth.php?action=login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value.trim(),
          password: pass.value,
        }),
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        closeAuthModal();
        updateAuthUI();
        showToast("Welcome back, " + currentUser.firstName + "!", "success");
        fetchOrders();
        prefetchAdminData();
        clearAuthInputs();
      } else {
        showFieldError(pass, data.error || "Login failed");
      }
    } catch (err) {
      showFieldError(pass, "Connection error");
    }
  }
}

function clearAuthInputs() {
  [
    "li-email",
    "li-pass",
    "su-fn",
    "su-ln",
    "su-email",
    "su-pass",
    "su-confirm",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

async function logout() {
  try {
    await fetch(`${API_BASE}/auth.php?action=logout`);
  } catch (e) {
    console.error(e);
  }
  currentUser = null;
  orders = [];
  adminCache = { stats: null, orders: null, users: null, products: null };
  if (dynamicUpdateInterval) clearInterval(dynamicUpdateInterval);
  updateAuthUI();
  showToast("Logged out successfully", "success");
  navigate("home");
}

function isAdmin() {
  return (
    currentUser &&
    (currentUser.email.toLowerCase() === "anna@gmail.com" ||
      currentUser.role === "admin")
  );
}

function updateAuthUI() {
  const desktop = document.getElementById("auth-desktop");
  const mobile = document.getElementById("auth-mobile");
  const desktopNav = document.getElementById("desktop-nav");
  const mobileNav = document.getElementById("mobile-nav-links");
  if (!desktop || !desktopNav) return;

  let baseLinks = `
    <a href="#" onclick="navigate('home'); return false;">${li("home", 16)} Home</a>
    <a href="#" onclick="navigate('about'); return false;">${li("info", 16)} About</a>
    <a href="#" onclick="navigate('support'); return false;">${li("headphones", 16)} Support</a>`;
  if (currentUser) {
    if (!isAdmin()) {
      baseLinks += `
      <a href="#" onclick="navigate('profile'); return false;">${li("user-circle", 16)} My Profile</a>
      <a href="#" onclick="navigate('orders'); return false;">${li("package", 16)} My Orders</a>`;
    }
    if (isAdmin()) {
      baseLinks += `<a href="#" class="admin-link" onclick="navigate('admin'); return false;">${li("layout-dashboard", 16)} Admin</a>`;
    }
  }
  desktopNav.innerHTML = baseLinks;

  let mobileLinks = baseLinks.replace(
    /return false;"/g,
    'toggleMobileMenu(); return false;"',
  );
  mobileNav.innerHTML = mobileLinks;

  if (currentUser) {
    desktop.innerHTML = `<button class="btn btn-outline btn-sm" onclick="logout()">${li("log-out", 16)} Logout</button>`;
    mobile.innerHTML = `<button class="btn btn-outline" style="width:100%;" onclick="logout(); toggleMobileMenu();">${li("log-out", 16)} Logout</button>`;
  } else {
    desktop.innerHTML = `<button class="btn btn-outline btn-sm" onclick="openAuthModal()">${li("user", 16)} Login</button>`;
    mobile.innerHTML = `<button class="btn btn-outline" style="width:100%;" onclick="openAuthModal(); toggleMobileMenu();">${li("user", 16)} Login</button>`;
  }
  reinitIcons();
}

function toggleMobileMenu() {
  document.getElementById("mobile-menu").classList.toggle("open");
  document.getElementById("mobile-overlay").classList.toggle("open");
}

function selectPayment(method) {
  selectedPayment = method;
  document
    .querySelectorAll(".payment-method")
    .forEach((el) =>
      el.classList.toggle("active", el.dataset.method === method),
    );
  renderPaymentDetails();
}
function renderPaymentDetails() {
  const container = document.getElementById("payment-details");
  if (!container) return;
  if (selectedPayment === "mobile") {
    container.innerHTML = `
      <div style="margin-bottom:1rem;"><label style="font-size:0.875rem;font-weight:500;display:block;margin-bottom:0.5rem;">Select Provider *</label>
      <div class="mobile-providers">
        <button type="button" class="mobile-provider ${selectedProvider === "vodacom" ? "active" : ""}" onclick="selectProvider('vodacom')"><div class="dot" style="background:#ef4444;"></div><span class="name">Vodacom M-Pesa</span></button>
        <button type="button" class="mobile-provider ${selectedProvider === "tigo" ? "active" : ""}" onclick="selectProvider('tigo')"><div class="dot" style="background:#2563eb;"></div><span class="name">Tigo Pesa (MIX)</span></button>
        <button type="button" class="mobile-provider ${selectedProvider === "halopesa" ? "active" : ""}" onclick="selectProvider('halopesa')"><div class="dot" style="background:#f97316;"></div><span class="name">Halopesa</span></button>
        <button type="button" class="mobile-provider ${selectedProvider === "airtel" ? "active" : ""}" onclick="selectProvider('airtel')"><div class="dot" style="background:#dc2626;"></div><span class="name">Airtel Money</span></button>
      </div></div>
      <div class="form-group"><label for="co-mobile">Mobile Number *</label><input class="form-input" id="co-mobile" placeholder="+255 7XX XXX XXX" required oninput="liveValidateCheckout(this)" onblur="validateCheckoutField(this)" /></div>`;
  } else if (selectedPayment === "card") {
    container.innerHTML = `
      <div class="form-group"><label for="co-cardname">Name on Card</label><input class="form-input" id="co-cardname" oninput="liveValidateCheckout(this)" onblur="validateCheckoutField(this)" /></div>
      <div class="form-group"><label for="co-cardnum">Card Number *</label><input class="form-input" id="co-cardnum" placeholder="1234 5678 9012 3456" required oninput="liveValidateCheckout(this)" onblur="validateCheckoutField(this)" /></div>
      <div class="form-row form-row-2">
        <div class="form-group"><label for="co-expiry">Expiry Date *</label><input class="form-input" id="co-expiry" placeholder="MM/YY" required oninput="liveValidateCheckout(this)" onblur="validateCheckoutField(this)" /></div>
        <div class="form-group"><label for="co-cvv">CVV *</label><input class="form-input" id="co-cvv" placeholder="123" required oninput="liveValidateCheckout(this)" onblur="validateCheckoutField(this)" /></div>
      </div>`;
  } else {
    container.innerHTML = `<div class="cash-notice">${li("banknote", 32)} <p style="margin-top:0.5rem;">Pay with cash when your order is delivered to your doorstep.</p></div>`;
  }
  reinitIcons();
}
function selectProvider(id) {
  selectedProvider = id;
  renderPaymentDetails();
}

function getCheckoutError(el) {
  const id = el.id;
  const val = el.value.trim();
  if (id === "co-fn" && !val) return "First name is required";
  if (id === "co-fn" && val.length > 50) return "Max 50 characters";
  if (id === "co-ln" && !val) return "Last name is required";
  if (id === "co-email" && !val) return "Email is required";
  if (id === "co-email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
    return "Invalid email address";
  if (id === "co-addr" && !val) return "Address is required";
  if (id === "co-city" && !val) return "City is required";
  if (id === "co-region" && !val) return "Region is required";
  if (id === "co-zip" && !val) return "ZIP code is required";
  if (id === "co-phone") {
    if (!val) return "Phone number is required";
    if (!/^(\+?255|0)\d{9}$/.test(val)) return "Invalid Tanzanian phone number";
  }
  if (id === "co-mobile" && selectedPayment === "mobile") {
    if (!val) return "Phone number is required";
    if (!/^(\+?255|0)\d{9}$/.test(val)) return "Invalid Tanzanian phone number";
  }
  if (id === "co-cardnum" && selectedPayment === "card") {
    if (!val) return "Card number is required";
    if (!/^[\d\s]{13,19}$/.test(val)) return "Invalid card number";
  }
  if (id === "co-expiry" && selectedPayment === "card") {
    if (!val) return "Expiry is required";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(val)) return "Use MM/YY format";
  }
  if (id === "co-cvv" && selectedPayment === "card") {
    if (!val) return "CVV is required";
    if (!/^\d{3,4}$/.test(val)) return "Invalid CVV";
  }
  return "";
}
function validateCheckoutField(el) {
  touchedCheckout[el.id] = true;
  showFieldError(el, getCheckoutError(el));
}
function liveValidateCheckout(el) {
  if (touchedCheckout[el.id]) showFieldError(el, getCheckoutError(el));
}

function renderCheckoutSummary() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = 0; // Paid on Delivery
  // const tax = subtotal * 0.08;
  const total = subtotal + shipping;
  const container = document.getElementById("checkout-summary");
  if (!container) return;
  if (cart.length === 0) {
    container.innerHTML = `<p style="text-align:center;color:var(--muted-fg);">Your cart is empty</p><button class="btn btn-primary" style="width:100%;margin-top:1rem;" onclick="navigate('home')">Continue Shopping</button>`;
    return;
  }
  container.innerHTML = `
    <h2 class="font-display" style="font-size:1.125rem;font-weight:600;margin-bottom:1rem;">Order Summary</h2>
    <div style="max-height:16rem;overflow-y:auto;">${cart
      .map(
        (i) => `
      <div class="order-item">
        <div class="order-item-img"><img src="${i.image}" alt="${i.name}" /></div>
        <div class="order-item-info">
          <p class="name">${i.name}</p>
          <p class="qty">Qty: ${i.quantity}</p>
        </div>
        <div style="margin-left:auto; display:flex; align-items:center; gap:0.75rem;">
          <span class="order-item-price">${formatTZS(i.price * i.quantity)}</span>
          <button class="btn btn-ghost btn-icon-sm" style="color:var(--destructive);" onclick="removeFromCart('${i.id}')" title="Remove">${li("trash-2", 14)}</button>
        </div>
      </div>`,
      )
      .join("")}
    </div>
    <div class="summary-divider"></div>
    <div style="font-size:0.875rem;">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="color:var(--muted-fg);">Subtotal</span><span>${formatTZS(subtotal)}</span></div>
      <div class="cart-summary-row"><span class="label">Delivery</span><span class="value" style="color:var(--primary);font-weight:500;">Pay on Delivery</span></div>
    </div>
    <div class="summary-divider"></div>
    <div style="display:flex;justify-content:space-between;font-weight:600;font-size:1.125rem;margin-bottom:1rem;"><span>Total</span><span>${formatTZS(Math.round(total))}</span></div>
    <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">Pay ${formatTZS(Math.round(total))}</button>`;
}

async function handleCheckout(e) {
  e.preventDefault();
  let valid = true;
  e.target.querySelectorAll("input[required]").forEach((inp) => {
    touchedCheckout[inp.id] = true;
    validateCheckoutField(inp);
    if (getCheckoutError(inp)) valid = false;
  });
  if (selectedPayment === "mobile" && !selectedProvider) {
    showToast("Please select a mobile money provider", "error");
    valid = false;
  }
  if (!valid) {
    showToast("Please fix the errors before submitting", "error");
    return;
  }

  const orderItems = cart.map((i) => ({ id: i.id, quantity: i.quantity }));

  try {
    const res = await fetch(`${API_BASE}/orders.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: orderItems,
        shipping_phone: document.getElementById("co-phone").value.trim(),
        shipping_address: document.getElementById("co-addr").value.trim(),
        shipping_city: document.getElementById("co-city").value.trim(),
        shipping_region: document.getElementById("co-region").value.trim(),
        shipping_zip: document.getElementById("co-zip").value.trim(),
      }),
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById("conf-order").textContent = data.orderNumber;
      document.getElementById("conf-total").textContent = formatTZS(data.total);

      cart = [];
      saveCart();
      updateCartUI();
      Object.keys(touchedCheckout).forEach((k) => delete touchedCheckout[k]);

      // Immediately fetch latest orders
      await fetchOrders();
      navigate("confirmation");
    } else {
      showToast("Order failed: " + (data.error || "Unknown error"), "error");
    }
  } catch (err) {
    showToast("Connection error during checkout", "error");
    console.error(err);
  }
}

async function fetchOrders(isBackground = false) {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API_BASE}/orders.php`);
    const data = await res.json();
    if (Array.isArray(data)) {
      if (isBackground && !dataChanged(orders, data)) return;
      orders = data;
      if (isBackground) renderOrders();
    }
  } catch (e) {
    console.error("Failed to fetch orders", e);
  }
}

function renderOrders() {
  if (!currentUser) {
    navigate("home");
    return;
  }

  const container = document.getElementById("orders-list");
  if (!container) return;
  if (orders.length === 0) {
    container.innerHTML = `<div class="orders-empty">${li("shopping-bag", 64)}<p class="title">No orders yet</p><p class="sub">When you place an order, it will appear here.</p><button class="btn btn-primary" onclick="navigate('home')">Start Shopping</button></div>`;
    reinitIcons();
    return;
  }
  const statusBadge = (s) =>
    `<span class="badge badge-${s.toLowerCase()}">${s}</span>`;
  container.innerHTML = orders
    .map(
      (order) => `
    <div class="order-card">
      <div class="order-card-header">
        <div><p class="order-num">${order.orderNumber || order.order_number}</p><div class="order-card-meta"><span>${li("calendar", 12)} ${order.created_at || order.date}</span><span>${li("credit-card", 12)} ${formatTZS(order.total || order.total_amount)}</span></div></div>
        ${statusBadge(order.status)}
      </div>
      <div class="order-card-body">${order.items
        .map(
          (item) => `
        <div class="order-line"><div class="order-line-left">${li("package", 14)}<span class="oname">${item.name}</span><span class="oqty">×${item.quantity}</span></div><span class="order-line-price">${formatTZS(item.price * item.quantity)}</span></div>`,
        )
        .join("")}
      </div>
    </div>`,
    )
    .join("");
  reinitIcons();
}

function populateProfile() {
  if (!currentUser) {
    navigate("home");
    return;
  }
  document.getElementById("pf-fn").value = currentUser.firstName || "";
  document.getElementById("pf-ln").value = currentUser.lastName || "";
  document.getElementById("pf-email").value = currentUser.email || "";
  ["pf-curpass", "pf-newpass", "pf-confpass"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  [
    "pf-fn",
    "pf-ln",
    "pf-email",
    "pf-curpass",
    "pf-newpass",
    "pf-confpass",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("is-error", "is-valid");
      const e = el.closest(".form-group")?.querySelector(".form-error");
      if (e) e.remove();
    }
  });
  renderProfileThemeCard();
}

function renderProfileThemeCard() {
  const card = document.getElementById("profile-theme-card");
  if (!card) return;
  const isDark = document.documentElement.classList.contains("dark");
  card.innerHTML = `
    <div class="profile-card-header"><h2>${li(isDark ? "moon" : "sun", 20)} Appearance</h2><p>Toggle between light and dark mode</p></div>
    <div class="profile-card-body">
      <div class="theme-toggle">
        <div class="info"><p>${isDark ? "Dark Mode" : "Light Mode"}</p><p>Switch your preferred theme</p></div>
        <button class="btn btn-outline" onclick="toggleProfileTheme()">${li(isDark ? "sun" : "moon", 16)} ${isDark ? "Light Mode" : "Dark Mode"}</button>
      </div>
    </div>`;
  reinitIcons();
}

function toggleProfileTheme() {
  document.documentElement.classList.toggle("dark");
  renderProfileThemeCard();
}

function validateProfileField(el) {
  const id = el.id;
  const val = el.value.trim();
  let error = "";
  if (id === "pf-fn" && !val) error = "First name is required";
  else if (id === "pf-fn" && val.length < 2) error = "At least 2 characters";
  else if (id === "pf-ln" && !val) error = "Last name is required";
  else if (id === "pf-ln" && val.length < 2) error = "At least 2 characters";
  else if (id === "pf-email" && !val) error = "Email is required";
  else if (id === "pf-email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
    error = "Enter a valid email";
  else if (id === "pf-newpass" && val && val.length < 6)
    error = "Must be at least 6 characters";
  else if (id === "pf-confpass") {
    const np = document.getElementById("pf-newpass").value;
    if (np && !val) error = "Please confirm your password";
    else if (val && val !== np) error = "Passwords don't match";
  } else if (id === "pf-curpass") {
    const np = document.getElementById("pf-newpass").value;
    if (np && !val) error = "Current password is required";
  }
  showFieldError(el, error);
}

function toggleProfilePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === "password" ? "text" : "password";
  btn.innerHTML = li(input.type === "password" ? "eye" : "eye-off", 16);
  reinitIcons();
}

async function saveProfile() {
  if (!currentUser) return;
  const fn = document.getElementById("pf-fn"),
    ln = document.getElementById("pf-ln"),
    email = document.getElementById("pf-email");
  const curPass = document.getElementById("pf-curpass"),
    newPass = document.getElementById("pf-newpass"),
    confPass = document.getElementById("pf-confpass");
  [fn, ln, email, curPass, newPass, confPass].forEach((el) =>
    validateProfileField(el),
  );
  if (document.querySelectorAll("#page-profile .is-error").length > 0) return;
  if (!fn.value.trim() || !ln.value.trim() || !email.value.trim()) return;

  try {
    const res = await fetch(`${API_BASE}/auth.php?action=update_profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: fn.value.trim(),
        last_name: ln.value.trim(),
        email: email.value.trim(),
        current_password: curPass.value,
        new_password: newPass.value,
      }),
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateAuthUI();
      [curPass, newPass, confPass].forEach((el) => {
        el.value = "";
        el.classList.remove("is-error", "is-valid");
      });
      showToast("Profile updated successfully!");
    } else {
      showFieldError(
        newPass.value ? curPass : email,
        data.error || "Update failed",
      );
    }
  } catch (err) {
    showToast("Connection error", "error");
  }
}

// Debounce helper
function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function renderAdminDashboard() {
  if (!isAdmin()) {
    navigate("home");
    return;
  }
  adminAvatarPreview = null;
  renderAdminContent();
}

function setAdminTab(tab) {
  window.location.hash = `admin/${tab}`;
}

function renderAdminContent(isBackground = false) {
  const main = document.getElementById("admin-main");
  if (!main) return;

  // Ensure stable structure
  if (!main.querySelector(".admin-view-container")) {
    main.innerHTML = `
      <div class="admin-view-container">
        <div id="admin-toolbar-container"></div>
        <div id="admin-data-container"></div>
      </div>`;
  }

  const toolbar = document.getElementById("admin-toolbar-container");
  const dataContainer = document.getElementById("admin-data-container");

  // Track the last rendered tab to avoid resetting the toolbar unnecessarily
  const currentTab = main.dataset.activeTab;
  const tabChanged = currentTab !== adminActiveTab;
  main.dataset.activeTab = adminActiveTab;

  document
    .querySelectorAll(".admin-tab")
    .forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === adminActiveTab),
    );

  switch (adminActiveTab) {
    case "dashboard":
      if (tabChanged && !isBackground) toolbar.innerHTML = "";
      renderAdminDashboardTab(dataContainer, tabChanged, isBackground);
      break;
    case "orders":
      renderAdminOrdersTab(toolbar, dataContainer, tabChanged, isBackground);
      break;
    case "categories":
      renderAdminCategoriesTab(
        toolbar,
        dataContainer,
        tabChanged,
        isBackground,
      );
      break;
    case "products":
      renderAdminProductsTab(toolbar, dataContainer, tabChanged, isBackground);
      break;
    case "users":
      renderAdminUsersTab(toolbar, dataContainer, tabChanged, isBackground);
      break;
    case "profile":
      if (tabChanged && !isBackground) toolbar.innerHTML = "";
      renderAdminProfileTab(dataContainer);
      break;
    default:
      if (tabChanged && !isBackground) toolbar.innerHTML = "";
      renderAdminDashboardTab(dataContainer, tabChanged, isBackground);
  }
  if (!isBackground) reinitIcons();
}

function renderAdminSkeleton(type, main) {
  if (!main) return;
  if (type === "stats") {
    main.innerHTML = `
      <div class="profile-card skeleton" style="margin-bottom:1.5rem; height: 120px;"></div>
      <div class="admin-stats">
        ${[1, 2, 3, 4].map(() => `<div class="stat-card skeleton skeleton-stat"></div>`).join("")}
      </div>`;
  } else if (type === "table") {
    main.innerHTML = `
      <div class="admin-toolbar skeleton" style="height: 50px; margin-bottom: 1.5rem;"></div>
      <div class="admin-table-wrap">
        ${[1, 2, 3, 4, 5].map(() => `<div class="skeleton skeleton-table-row"></div>`).join("")}
      </div>`;
  } else if (type === "grid") {
    main.innerHTML = `
      <div class="admin-toolbar skeleton" style="height: 50px; margin-bottom: 1.5rem;"></div>
      <div class="admin-product-grid">
        ${[1, 2, 3, 4, 5, 6, 7, 8].map(() => `<div class="skeleton skeleton-card"></div>`).join("")}
      </div>`;
  }
}

async function renderAdminDashboardTab(main, tabChanged, isBackground = false) {
  if (!isBackground) {
    if (adminCache.stats) {
      renderStatsHtml(main, adminCache.stats);
    } else if (tabChanged) {
      renderAdminSkeleton("stats", main);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/admin.php?action=stats`);
    const stats = await res.json();

    if (!dataChanged(adminCache.stats, stats)) return;

    adminCache.stats = stats;
    renderStatsHtml(main, stats);
    if (!isBackground) reinitIcons();
  } catch (err) {
    if (!adminCache.stats && !isBackground) {
      main.innerHTML = `<div class="p-6 text-center text-destructive">Failed to load stats</div>`;
    }
  }
}

function renderStatsHtml(main, stats) {
  main.innerHTML = `
      <div class="profile-card" style="margin-bottom:1.5rem;">
        <div class="profile-card-header"><h2 style="font-family:var(--font-display);font-size:1.5rem;">Hi, ${currentUser?.firstName || "Admin"} 👋</h2><p>Welcome to the ElectroShop Admin Dashboard. Manage your products, orders, categories, and users from here.</p></div>
      </div>
      <div class="admin-stats">
        ${[
          { l: "Products", v: stats.products || 0, i: "package" },
          { l: "Orders", v: stats.orders || 0, i: "shopping-cart" },
          { l: "Users", v: stats.users || 0, i: "users" },
          { l: "Categories", v: stats.categories || 0, i: "folder-tree" },
        ]
          .map(
            (s) => `
        <div class="stat-card"><div class="stat-card-inner"><div class="stat-info"><p>${s.l}</p><p>${s.v}</p></div>${li(s.i, 40)}</div></div>`,
          )
          .join("")}
      </div>`;
}

let adminOrderSearch = "";
const debouncedRenderOrders = debounce(() => {
  const dataContainer = document.getElementById("admin-data-container");
  if (dataContainer && adminActiveTab === "orders") {
    renderOrdersDataOnly(dataContainer, adminCache.orders || []);
  }
}, 300);

async function renderAdminOrdersTab(
  toolbar,
  dataContainer,
  tabChanged,
  isBackground = false,
) {
  if (tabChanged && !isBackground) {
    toolbar.innerHTML = `
      <div class="admin-toolbar">
        <div class="search-wrapper">
          ${li("search", 16)}
          <input 
            class="search-input" 
            placeholder="Search orders by number, name or email..." 
            value="${adminOrderSearch}" 
            oninput="adminOrderSearch=this.value; debouncedRenderOrders();" 
          />
        </div>
      </div>`;

    if (adminCache.orders) {
      renderOrdersDataOnly(dataContainer, adminCache.orders);
    } else {
      renderAdminSkeleton("table", dataContainer);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/admin.php?action=orders`);
    const allOrders = await res.json();

    if (isBackground && !dataChanged(adminCache.orders, allOrders)) return;

    adminCache.orders = allOrders;
    renderOrdersDataOnly(dataContainer, allOrders);
    if (!isBackground) reinitIcons();
  } catch (err) {
    if (!adminCache.orders && !isBackground) {
      dataContainer.innerHTML = `<div class="p-6 text-center text-destructive">Failed to load orders</div>`;
    }
  }
}

function renderOrdersDataOnly(container, allOrders) {
  const q = adminOrderSearch.toLowerCase();
  const filtered = q
    ? allOrders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.userName.toLowerCase().includes(q) ||
          o.userEmail.toLowerCase().includes(q),
      )
    : allOrders;

  const statusBadge = (s) => {
    const cls =
      s === "Delivered"
        ? "delivered"
        : s === "Completed"
          ? "shipped"
          : s === "Cancelled"
            ? "cancelled"
            : "processing";
    return `<span class="badge badge-${cls}">${s}</span>`;
  };

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Order #</th><th>Customer</th><th class="hide-mobile">Email</th><th>Total</th><th>Status</th><th class="hide-mobile">Date</th><th>Actions</th></tr></thead>
        <tbody>${
          filtered.length === 0
            ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted-fg);">${allOrders.length === 0 ? "No orders yet" : "No orders match"}</td></tr>`
            : filtered
                .map((o) => {
                  const oNum = o.orderNumber || o.order_number;
                  return `<tr>
          <td class="mono">${oNum}</td>
          <td>${o.userName}</td>
          <td class="hide-mobile" style="color:var(--muted-fg);">${o.userEmail}</td>
          <td style="font-weight:600;">${formatTZS(o.total || o.total_amount)}</td>
          <td>${statusBadge(o.status)}</td>
          <td class="hide-mobile" style="color:var(--muted-fg);">${o.created_at || o.date}</td>
          <td><div class="actions">
            <button class="btn btn-outline btn-icon-sm" onclick="viewAdminOrder('${oNum}')" title="View">${li("eye", 14)}</button>
            ${
              o.status === "Processing"
                ? `
              <button class="btn btn-outline btn-icon-sm" style="color:var(--primary);" onclick="setAdminOrderStatus('${oNum}','Completed')" title="Complete">${li("check", 14)}</button>
              <button class="btn btn-outline btn-icon-sm" style="color:var(--destructive);" onclick="setAdminOrderStatus('${oNum}','Cancelled')" title="Cancel">${li("x", 14)}</button>`
                : ""
            }
            ${o.status === "Completed" ? `<button class="btn btn-outline btn-icon-sm" style="color:var(--primary);" onclick="setAdminOrderStatus('${oNum}','Delivered')" title="Deliver">${li("package", 14)}</button>` : ""}
            <button class="btn btn-outline btn-icon-sm" style="color:var(--destructive);" onclick="deleteAdminOrder('${oNum}')" title="Delete Order">${li("trash-2", 14)}</button>
          </div></td>
        </tr>`;
                })
                .join("")
        }
        </tbody>
      </table>
    </div>`;
  reinitIcons();
}

async function setAdminOrderStatus(orderNum, status) {
  try {
    const res = await fetch(
      `${API_BASE}/admin.php?action=update_order_status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_number: orderNum, status: status }),
      },
    );
    const data = await res.json();
    if (data.success) {
      showToast("Order " + status);
      // Force refresh admin data immediately
      await renderAdminOrdersTab(
        document.getElementById("admin-toolbar-container"),
        document.getElementById("admin-data-container"),
        false,
      );
    } else {
      showToast(data.error || "Failed to update status", "error");
    }
  } catch (err) {
    showToast("Connection error", "error");
  }
}

async function deleteAdminOrder(orderNum) {
  showConfirmModal(
    "Delete Order",
    `Are you sure you want to delete order ${orderNum}? This cannot be undone.`,
    async () => {
      try {
        const res = await fetch(`${API_BASE}/admin.php?action=delete_order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_number: orderNum }),
        });
        const data = await res.json();
        if (data.success) {
          showToast("Order deleted successfully");
          renderAdminContent();
        } else {
          showToast(data.error || "Failed to delete order", "error");
        }
      } catch (err) {
        showToast("Connection error", "error");
      }
    },
  );
}

function viewAdminOrder(orderNum) {
  fetch(`${API_BASE}/admin.php?action=orders`)
    .then((res) => res.json())
    .then((allOrders) => {
      const order = allOrders.find(
        (o) => o.orderNumber === orderNum || o.order_number === orderNum,
      );
      if (!order) {
        showToast("Order details not found", "error");
        return;
      }
      openAdminModal(
        "Order " + order.orderNumber,
        `Customer: ${order.userName} (${order.userEmail} / ${order.shipping_phone || "No phone"})`,
        `
            <div style="margin-bottom:0.75rem;display:flex;justify-content:space-between;font-size:0.875rem;"><span style="color:var(--muted-fg);">Date</span><span>${order.created_at || order.date}</span></div>
            <div style="margin-bottom:0.75rem;display:flex;justify-content:space-between;font-size:0.875rem;"><span style="color:var(--muted-fg);">Status</span><span class="badge badge-${order.status.toLowerCase()}">${order.status}</span></div>
            <div style="margin-bottom:0.75rem;font-size:0.875rem;"><span style="color:var(--muted-fg);">Delivery Address:</span><br/>${order.shipping_address || "No address"}, ${order.shipping_city || ""}</div>
            <div style="margin-bottom:0.75rem;font-size:0.875rem;"><span style="color:var(--muted-fg);">Delivery Phone:</span><br/>${order.shipping_phone || "No phone"}</div>
            <div style="border-top:1px solid var(--border);padding-top:0.75rem;margin-top:0.5rem;">
              ${order.items.map((i) => `<div style="display:flex;justify-content:space-between;font-size:0.875rem;margin-bottom:0.5rem;"><span>${i.name} × ${i.quantity}</span><span style="font-weight:500;">${formatTZS(i.price * i.quantity)}</span></div>`).join("")}
            </div>
            <div style="border-top:1px solid var(--border);padding-top:0.75rem;display:flex;justify-content:space-between;font-weight:600;"><span>Total</span><span>${formatTZS(order.total || order.total_amount)}</span></div>
          `,
      );
    });
}

let adminCatSearch = "";
const debouncedRenderCategories = debounce(() => {
  const dataContainer = document.getElementById("admin-data-container");
  if (dataContainer && adminActiveTab === "categories") {
    renderCategoriesDataOnly(dataContainer);
  }
}, 300);

async function renderAdminCategoriesTab(
  toolbar,
  dataContainer,
  tabChanged,
  isBackground = false,
) {
  if (tabChanged && !isBackground) {
    toolbar.innerHTML = `
      <div class="admin-toolbar">
        <div class="search-wrapper">
          ${li("search", 16)}
          <input 
            class="search-input" 
            placeholder="Search categories..." 
            value="${adminCatSearch}" 
            oninput="adminCatSearch=this.value; debouncedRenderCategories();" 
          />
        </div>
        <button class="btn btn-primary" onclick="openAdminCategoryModal()">${li("plus", 16)} Add Category</button>
      </div>`;

    if (categories.length > 0) {
      renderCategoriesDataOnly(dataContainer);
    } else {
      renderAdminSkeleton("grid", dataContainer);
    }
  }

  // Use diffing for background updates is hard here because 'categories' variable is global and modified by fetchCategories
  // We'll trust fetchCategories to return list, but we need to check if it changed.
  // Actually, fetchCategories updates the global 'categories' array.
  // We should create a caching mechanism for categories comparison or just fetch and compare properly.

  if (isBackground) {
    const res = await fetch(`${API_BASE}/categories.php`);
    const newCats = await res.json();
    const prodsRes = await fetch(`${API_BASE}/products.php`); // Needed for counts
    const newProds = await prodsRes.json();

    const catsChanged = dataChanged(categories, newCats);
    const prodsChanged = dataChanged(products, newProds);

    if (!catsChanged && !prodsChanged) return;

    categories = newCats;
    products = newProds;
    updateProductCounts(); // If we have such a function, otherwise just render
  } else {
    if (categories.length === 0) await fetchCategories();
    if (products.length === 0) await fetchProducts(true);
  }

  renderCategoriesDataOnly(dataContainer);
  if (!isBackground) reinitIcons();
}

function renderCategoriesDataOnly(container) {
  const q = adminCatSearch.toLowerCase();
  const realCategories = categories.filter((c) => c !== "All");
  const filtered = q
    ? realCategories.filter((c) => c.toLowerCase().includes(q))
    : realCategories;

  container.innerHTML = `
    <div class="admin-cat-grid">
      ${filtered
        .map((c) => {
          const count = products.filter((p) => p.category === c).length;
          const escC = c.replace(/'/g, "\\'");
          return `<div class="cat-card"><div><h3>${c}</h3><p class="count">${count} product${count !== 1 ? "s" : ""}</p></div><div class="actions"><button class="btn btn-outline btn-icon-sm" onclick="openAdminCategoryModal('${escC}')" title="Edit">${li("pencil", 14)}</button><button class="btn btn-outline btn-icon-sm" style="color:var(--destructive);" onclick="deleteAdminCategory('${escC}')" title="Delete">${li("trash-2", 14)}</button></div></div>`;
        })
        .join("")}
      ${filtered.length === 0 ? `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted-fg);">${realCategories.length === 0 ? "No categories yet" : "No match"}</div>` : ""}
    </div>`;
}

function openAdminCategoryModal(editName) {
  const isEdit = !!editName;
  openAdminModal(
    isEdit ? "Edit Category" : "Add Category",
    isEdit ? "Update the category name" : "Enter a name for the new category",
    `
    <div class="form-group"><label>Category Name *</label><input class="form-input" id="admin-cat-name" value="${editName || ""}" /></div>
    <div id="admin-modal-error"></div>
  `,
    `
    <button class="btn btn-outline" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAdminCategory('${(editName || "").replace(/'/g, "\\'")}')">${isEdit ? "Update" : "Add"}</button>
  `,
  );
}

async function saveAdminCategory(oldName) {
  const name = document.getElementById("admin-cat-name").value.trim();
  if (!name) {
    document.getElementById("admin-modal-error").innerHTML =
      '<p class="form-error">Category name is required</p>';
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/admin.php?action=${oldName ? "edit_category" : "add_category"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, old_name: oldName }),
      },
    );
    const data = await res.json();
    if (data.success) {
      showToast(oldName ? "Category updated" : "Category added");
      await fetchCategories();
      closeAdminModal();
      renderAdminContent();
      renderCategories();
    } else {
      document.getElementById("admin-modal-error").innerHTML =
        `<p class="form-error">${data.error || "Failed"}</p>`;
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteAdminCategory(name) {
  showConfirmModal(
    "Delete Category",
    'Delete "' +
      name +
      '"? Products in this category will remain but be uncategorized.',
    async () => {
      try {
        const res = await fetch(
          `${API_BASE}/admin.php?action=delete_category`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
          },
        );
        const data = await res.json();
        if (data.success) {
          showToast("Category deleted");
          await fetchCategories();
          renderAdminContent();
          renderCategories();
        } else {
          showToast(data.error || "Failed to delete", "error");
        }
      } catch (err) {
        console.error(err);
      }
    },
  );
}

let adminProdSearch = "";
const debouncedRenderProducts = debounce(() => {
  const dataContainer = document.getElementById("admin-data-container");
  if (dataContainer && adminActiveTab === "products") {
    renderProductsDataOnly(dataContainer);
  }
}, 300);

async function renderAdminProductsTab(
  toolbar,
  dataContainer,
  tabChanged,
  isBackground = false,
) {
  if (tabChanged && !isBackground) {
    toolbar.innerHTML = `
      <div class="admin-toolbar">
        <div class="search-wrapper">
          ${li("search", 16)}
          <input 
            class="search-input" 
            placeholder="Search products..." 
            value="${adminProdSearch}" 
            oninput="adminProdSearch=this.value; debouncedRenderProducts();" 
          />
        </div>
        <button class="btn btn-primary" onclick="openAdminProductModal()">${li("plus", 16)} Add Product</button>
      </div>`;

    if (products.length > 0) {
      renderProductsDataOnly(dataContainer);
    } else {
      renderAdminSkeleton("grid", dataContainer);
    }
  }

  if (isBackground) {
    const res = await fetch(`${API_BASE}/products.php`);
    const newProds = await res.json();

    if (!dataChanged(products, newProds)) return;

    products = newProds;
  } else {
    if (products.length === 0) await fetchProducts(true);
  }

  renderProductsDataOnly(dataContainer);
  if (!isBackground) reinitIcons();
}

function renderProductsDataOnly(container) {
  const q = adminProdSearch.toLowerCase();
  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
    : products;

  container.innerHTML = `
    <div class="admin-product-grid">
      ${filtered
        .map(
          (p) => `
      <div class="admin-product-card">
        <div class="img-wrap">
          <img src="${p.image}" alt="${p.name}" />
          ${p.badge ? `<div class="badge ${p.badge === "Sale" ? "badge-destructive" : "badge-default"}" style="position:absolute;top:8px;left:8px;z-index:9;">${p.badge}</div>` : ""}
          ${!p.inStock ? '<div class="product-stock-overlay"><span class="badge badge-destructive">Out of Stock</span></div>' : ""}
        </div>
        <div class="card-body">
          <p class="cat-label">${p.category}</p>
          <h3>${p.name}</h3>
          <p class="price">${formatTZS(p.price)}</p>
          <div class="card-actions">
            <button class="btn btn-outline btn-icon-sm" onclick="openAdminProductModal('${p.id}')" title="Edit">${li("pencil", 14)}</button>
            <button class="btn btn-outline btn-icon-sm" onclick="toggleAdminStock('${p.id}')" title="${p.inStock ? "Mark Out of Stock" : "Mark In Stock"}">${li(p.inStock ? "toggle-right" : "toggle-left", 14)}</button>
            <button class="btn btn-outline btn-icon-sm" style="color:var(--destructive);" onclick="deleteAdminProduct('${p.id}')" title="Delete">${li("trash-2", 14)}</button>
          </div>
        </div>
      </div>`,
        )
        .join("")}
      ${filtered.length === 0 ? `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted-fg);">${products.length === 0 ? "No products yet" : "No match"}</div>` : ""}
    </div>`;
}

function openAdminProductModal(editId) {
  // Ensure we have the latest products if list is empty (e.g. direct link or refresh)
  if (
    editId &&
    (products.length === 0 ||
      !products.find((x) => String(x.id) === String(editId)))
  ) {
    fetchProducts(true).then(() => _openAdminProductModalInner(editId));
  } else {
    _openAdminProductModalInner(editId);
  }
}

function _openAdminProductModalInner(editId) {
  const p = editId
    ? products.find((x) => String(x.id) === String(editId))
    : null;
  const isEdit = !!p;
  adminProductImageData = p?.image || null;

  openAdminModal(
    isEdit ? "Edit Product" : "Add Product",
    isEdit ? "Update the product details" : "Fill in the product details",
    `
    <div class="form-group"><label>Name *</label><input class="form-input" id="ap-name" value="${p?.name || ""}" /></div>
    <div class="form-group"><label>Description *</label><textarea class="form-input" id="ap-desc" style="height:80px;padding-top:0.5rem;resize:vertical;">${p?.description || ""}</textarea></div>
    <div class="form-row form-row-2">
      <div class="form-group"><label>Price (TZS) *</label><input class="form-input" id="ap-price" type="number" value="${p?.price || ""}" /></div>
      <div class="form-group"><label>Category *</label><select class="form-input" id="ap-cat">${categories
        .filter((c) => c !== "All")
        .map(
          (c) =>
            `<option value="${c}" ${p?.category === c ? "selected" : ""}>${c}</option>`,
        )
        .join("")}</select></div>
    </div>
    <div class="form-group">
      <label>Image</label>
      <div id="ap-drop-zone" class="drop-zone">
        ${adminProductImageData ? `<button class="remove-img" onclick="event.stopPropagation(); removeProductImage();">${li("x", 16)}</button><img src="${adminProductImageData}" id="ap-preview" />` : ""}
        <div class="drop-zone-content">
          ${li("upload", 40)}
          <p>Drag and drop an image or click to browse</p>
        </div>
        <input type="file" id="ap-file" hidden accept="image/*" onchange="handleProductImage(this.files[0])" />
      </div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label>Badge</label><select class="form-input" id="ap-badge"><option value="">None</option>${["New", "Popular", "Best Seller", "Sale"].map((b) => `<option value="${b}" ${p?.badge === b ? "selected" : ""}>${b}</option>`).join("")}</select></div>
      <div class="form-group"><label>&nbsp;</label><label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;"><input type="checkbox" id="ap-stock" ${!p || p.inStock ? "checked" : ""}> In Stock</label></div>
    </div>
    <div class="form-group"><label>Specs (comma-separated)</label><input class="form-input" id="ap-specs" value="${p?.specs?.join(", ") || ""}" placeholder="e.g. 48MP Camera, 5G" /></div>
    <div id="admin-modal-error"></div>
  `,
    `
    <button class="btn btn-outline" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAdminProduct('${editId || ""}')">${isEdit ? "Update" : "Add"}</button>
  `,
    true,
  );

  const zone = document.getElementById("ap-drop-zone");
  if (zone) {
    zone.onclick = () => document.getElementById("ap-file").click();
    zone.ondragover = (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    };
    zone.ondragleave = () => zone.classList.remove("drag-over");
    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      if (e.dataTransfer.files.length)
        handleProductImage(e.dataTransfer.files[0]);
    };
  }
}

function handleProductImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    adminProductImageData = e.target.result;
    updateProductPreview();
  };
  reader.readAsDataURL(file);
}

function removeProductImage() {
  adminProductImageData = null;
  updateProductPreview();
}

function updateProductPreview() {
  const zone = document.getElementById("ap-drop-zone");
  if (!zone) return;

  // Clear existing preview elements
  const existingPreview = document.getElementById("ap-preview");
  if (existingPreview) existingPreview.remove();
  const existingRemove = zone.querySelector(".remove-img");
  if (existingRemove) existingRemove.remove();

  if (adminProductImageData) {
    const btn = document.createElement("button");
    btn.className = "remove-img";
    btn.innerHTML = li("x", 16);
    btn.onclick = (e) => {
      e.stopPropagation();
      removeProductImage();
    };

    const img = document.createElement("img");
    img.id = "ap-preview";
    img.src = adminProductImageData;

    zone.appendChild(btn);
    zone.appendChild(img);
  }
  reinitIcons();
}

async function saveAdminProduct(editId) {
  const name = document.getElementById("ap-name").value.trim();
  const desc = document.getElementById("ap-desc").value.trim();
  const price = Number(document.getElementById("ap-price").value);
  const cat = document.getElementById("ap-cat").value;
  const badge = document.getElementById("ap-badge").value;
  const inStock = document.getElementById("ap-stock").checked;
  const specs = document
    .getElementById("ap-specs")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let errors = [];
  if (!name) errors.push("Name is required");
  if (!desc) errors.push("Description is required");
  if (!price || price <= 0) errors.push("Valid price is required");
  if (!cat) errors.push("Category is required");
  if (!adminProductImageData) errors.push("Product image is required");

  if (errors.length) {
    document.getElementById("admin-modal-error").innerHTML = errors
      .map((e) => `<p class="form-error">${e}</p>`)
      .join("");
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/admin.php?action=${editId ? "edit_product" : "add_product"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          name,
          description: desc,
          price,
          category: cat,
          image: adminProductImageData,
          badge,
          stock: inStock ? 100 : 0,
          specs,
        }),
      },
    );
    const data = await res.json();
    if (data.success) {
      showToast(editId ? "Product updated" : "Product added");
      await fetchProducts(true);
      closeAdminModal();
      renderAdminContent();
    } else {
      showToast(data.error || "Failed", "error");
    }
  } catch (err) {
    console.error(err);
  }
}

async function toggleAdminStock(id) {
  const p = products.find((x) => x.id == id);
  if (!p) return;
  const newStock = p.inStock ? 0 : 100;
  try {
    const res = await fetch(`${API_BASE}/admin.php?action=edit_product_stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock: newStock }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(
        p.name + " is now " + (newStock > 0 ? "in stock" : "out of stock"),
      );
      await fetchProducts(true);
      renderAdminContent();
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteAdminProduct(id) {
  showConfirmModal(
    "Delete Product",
    "Delete this product? This cannot be undone.",
    async () => {
      try {
        const res = await fetch(`${API_BASE}/admin.php?action=delete_product`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.success) {
          showToast("Product deleted");
          await fetchProducts(true);
          renderAdminContent();
        }
      } catch (err) {
        console.error(err);
      }
    },
  );
}

let adminUserSearch = "";
const debouncedRenderUsers = debounce(() => {
  const dataContainer = document.getElementById("admin-data-container");
  if (dataContainer && adminActiveTab === "users") {
    renderUsersDataOnly(dataContainer, adminCache.users || []);
  }
}, 300);

async function renderAdminUsersTab(
  toolbar,
  dataContainer,
  tabChanged,
  isBackground = false,
) {
  if (tabChanged && !isBackground) {
    toolbar.innerHTML = `
      <div class="admin-toolbar">
        <div class="search-wrapper">
          ${li("search", 16)}
          <input 
            class="search-input" 
            placeholder="Search users..." 
            value="${adminUserSearch}" 
            oninput="adminUserSearch=this.value; debouncedRenderUsers();" 
          />
        </div>
        <button class="btn btn-primary" onclick="openAdminUserModal()">${li("plus", 16)} Add User</button>
      </div>`;

    if (adminCache.users) {
      renderUsersDataOnly(dataContainer, adminCache.users);
    } else {
      renderAdminSkeleton("table", dataContainer);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/admin.php?action=users`);
    const users = await res.json();

    if (isBackground && !dataChanged(adminCache.users, users)) return;

    adminCache.users = users;
    renderUsersDataOnly(dataContainer, users);
    if (!isBackground) reinitIcons();
  } catch (err) {
    if (!adminCache.users && !isBackground) {
      dataContainer.innerHTML = `<div class="p-6 text-center text-destructive">Failed to load users</div>`;
    }
  }
}

function renderUsersDataOnly(container, users) {
  const q = adminUserSearch.toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          (u.firstName + " " + u.lastName).toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
    : users;

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>${
          filtered.length === 0
            ? `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted-fg);">No users found</td></tr>`
            : filtered
                .map((u) => {
                  const role = u.role;
                  return `<tr>
            <td style="font-weight:500;">${u.firstName} ${u.lastName}</td>
            <td style="color:var(--muted-fg);">${u.email}</td>
            <td><span class="badge badge-${role === "admin" ? "admin" : "customer"}">${role === "admin" ? "Admin" : "Customer"}</span></td>
             <td><div class="actions">
              <button class="btn btn-outline btn-icon-sm" onclick="openAdminUserModal('${u.id}')" title="Edit">${li("pencil", 14)}</button>
              <button class="btn btn-outline btn-icon-sm" ${u.id === currentUser.id ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : `onclick="toggleAdminUserRole('${u.id}')"`} title="Toggle Role">${li(role === "admin" ? "shield" : "user", 14)}</button>
              ${u.email.toLowerCase() !== "anna@gmail.com" && u.id !== currentUser.id ? `<button class="btn btn-outline btn-icon-sm" style="color:var(--destructive);" onclick="deleteAdminUser('${u.id}')" title="Delete">${li("trash-2", 14)}</button>` : ""}
            </div></td>
          </tr>`;
                })
                .join("")
        }
        </tbody>
      </table>
    </div>`;
  reinitIcons();
}

function openAdminUserModal(editId) {
  // We should find the user in the current list. Since renderAdminUsersTab is async,
  // we might need a way to store users globally or pass them.
  // For now, let's just re-fetch in openAdminUserModal for simplicity if needed,
  // or just use the current users if we store them.
  // Let's modify renderAdminUsersTab to fetch and store in a variable we can access.
  // Actually, I'll just fetch again for the modal if editing.

  if (editId) {
    fetch(`${API_BASE}/admin.php?action=users`)
      .then((res) => res.json())
      .then((users) => {
        const u = users.find((x) => x.id == editId);
        _openUserModalInner(u);
      });
  } else {
    _openUserModalInner(null);
  }
}

function _openUserModalInner(u) {
  const isEdit = !!u;
  openAdminModal(
    isEdit ? "Edit User" : "Add User",
    isEdit ? "Update user details" : "Create a new user account",
    `
    <div class="form-row form-row-2">
      <div class="form-group"><label>First Name *</label><input class="form-input" id="au-fn" value="${u?.firstName || ""}" /></div>
      <div class="form-group"><label>Last Name *</label><input class="form-input" id="au-ln" value="${u?.lastName || ""}" /></div>
    </div>
    <div class="form-group"><label>Email *</label><input class="form-input" id="au-email" type="email" value="${u?.email || ""}" autocomplete="off" /></div>
    <div class="form-group"><label>${isEdit ? "Password (leave blank to keep)" : "Password *"}</label><input class="form-input" id="au-pass" type="password" autocomplete="new-password" /></div>
    <div class="form-group"><label>Role</label><select class="form-input" id="au-role" ${u?.id === currentUser.id ? "disabled" : ""}><option value="customer" ${u?.role !== "admin" ? "selected" : ""}>Customer</option><option value="admin" ${u?.role === "admin" ? "selected" : ""}>Admin</option></select></div>
    <div id="admin-modal-error"></div>
  `,
    `
    <button class="btn btn-outline" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAdminUser('${u?.id || ""}')">${isEdit ? "Update" : "Add"}</button>
  `,
  );
}

async function saveAdminUser(editId) {
  const fn = document.getElementById("au-fn").value.trim();
  const ln = document.getElementById("au-ln").value.trim();
  const email = document.getElementById("au-email").value.trim();
  const pass = document.getElementById("au-pass").value;
  const role = document.getElementById("au-role").value;
  let errors = [];
  if (!fn) errors.push("First name is required");
  if (!ln) errors.push("Last name is required");
  if (!email) errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("Invalid email");
  if (!editId && (!pass || pass.length < 6))
    errors.push("Password must be at least 6 characters");
  if (editId && pass && pass.length < 6)
    errors.push("Password must be at least 6 characters");
  if (errors.length) {
    document.getElementById("admin-modal-error").innerHTML = errors
      .map((e) => `<p class="form-error">${e}</p>`)
      .join("");
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/admin.php?action=${editId ? "edit_user" : "add_user"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          first_name: fn,
          last_name: ln,
          email,
          password: pass,
          role,
        }),
      },
    );
    const data = await res.json();
    if (data.success) {
      showToast(editId ? "User updated" : "User added");
      closeAdminModal();
      renderAdminContent();
    } else {
      document.getElementById("admin-modal-error").innerHTML =
        `<p class="form-error">${data.error || "Failed"}</p>`;
    }
  } catch (err) {
    console.error(err);
  }
}

async function toggleAdminUserRole(id) {
  // We need current role to toggle.
  try {
    const usersRes = await fetch(`${API_BASE}/admin.php?action=users`);
    const users = await usersRes.json();
    const u = users.find((x) => x.id == id);
    if (!u) return;

    const newRole = u.role === "admin" ? "customer" : "admin";
    const res = await fetch(`${API_BASE}/admin.php?action=edit_user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: newRole }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(u.firstName + " is now " + newRole);
      renderAdminContent();
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteAdminUser(id) {
  showConfirmModal(
    "Delete User",
    "Delete this user? This cannot be undone.",
    async () => {
      try {
        const res = await fetch(`${API_BASE}/admin.php?action=delete_user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.success) {
          showToast("User deleted");
          renderAdminContent();
        }
      } catch (err) {
        console.error(err);
      }
    },
  );
}

function renderAdminProfileTab(main) {
  const isDark = document.documentElement.classList.contains("dark");
  main.innerHTML = `
    <div class="admin-profile">
      <div class="profile-card">
        <div class="profile-card-header"><h2>${li("user", 20)} Personal Information</h2><p>Update your name and email</p></div>
        <div class="profile-card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label>First Name *</label><input class="form-input" id="adp-fn" value="${currentUser?.firstName || ""}" oninput="validateAdminProfileField(this)" /></div>
            <div class="form-group"><label>Last Name *</label><input class="form-input" id="adp-ln" value="${currentUser?.lastName || ""}" oninput="validateAdminProfileField(this)" /></div>
          </div>
          <div class="form-group"><label>Email *</label><input class="form-input" id="adp-email" type="email" value="${currentUser?.email || ""}" oninput="validateAdminProfileField(this)" /></div>
        </div>
      </div>
      <div class="profile-card">
        <div class="profile-card-header"><h2>${li("lock", 20)} Change Password</h2><p>Leave blank to keep current password</p></div>
        <div class="profile-card-body">
          <div class="form-group"><label>Current Password</label><input class="form-input" id="adp-curpass" type="password" oninput="validateAdminProfileField(this)" /></div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>New Password</label><input class="form-input" id="adp-newpass" type="password" oninput="validateAdminProfileField(this)" /></div>
            <div class="form-group"><label>Confirm Password</label><input class="form-input" id="adp-confpass" type="password" oninput="validateAdminProfileField(this)" /></div>
          </div>
        </div>
      </div>
      <div class="profile-card">
        <div class="profile-card-header"><h2>${li(isDark ? "moon" : "sun", 20)} Appearance</h2><p>Toggle between light and dark mode</p></div>
        <div class="profile-card-body">
          <div class="theme-toggle">
            <div class="info"><p>${isDark ? "Dark Mode" : "Light Mode"}</p><p>Switch your preferred theme</p></div>
            <button class="btn btn-outline" onclick="toggleAdminTheme()">${li(isDark ? "sun" : "moon", 16)} ${isDark ? "Light Mode" : "Dark Mode"}</button>
          </div>
        </div>
      </div>
      <div style="text-align:center;margin-top:1rem;"><button class="btn btn-primary btn-lg" style="padding:0.75rem 3rem;" onclick="saveAdminProfile()">Save Changes</button></div>
    </div>`;
}

function validateAdminProfileField(el) {
  const id = el.id;
  const val = el.value.trim();
  let error = "";
  if (id === "adp-fn" && !val) error = "Required";
  else if (id === "adp-fn" && val.length < 2) error = "At least 2 characters";
  else if (id === "adp-ln" && !val) error = "Required";
  else if (id === "adp-ln" && val.length < 2) error = "At least 2 characters";
  else if (id === "adp-email" && !val) error = "Required";
  else if (id === "adp-email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
    error = "Invalid email";
  else if (id === "adp-newpass" && val && val.length < 6)
    error = "At least 6 characters";
  else if (id === "adp-confpass") {
    const np = document.getElementById("adp-newpass")?.value;
    if (np && val !== np) error = "Passwords don't match";
  } else if (id === "adp-curpass") {
    const np = document.getElementById("adp-newpass")?.value;
    if (np && !val) error = "Required";
  }
  showFieldError(el, error);
}

async function saveAdminProfile() {
  const fn = document.getElementById("adp-fn"),
    ln = document.getElementById("adp-ln"),
    email = document.getElementById("adp-email");
  const curPass = document.getElementById("adp-curpass"),
    newPass = document.getElementById("adp-newpass"),
    confPass = document.getElementById("adp-confpass");
  [fn, ln, email, curPass, newPass, confPass].forEach((el) =>
    validateAdminProfileField(el),
  );
  if (document.querySelectorAll("#admin-main .is-error").length > 0) return;
  if (!fn.value.trim() || !ln.value.trim() || !email.value.trim()) return;

  try {
    const res = await fetch(`${API_BASE}/auth.php?action=update_profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: fn.value.trim(),
        last_name: ln.value.trim(),
        email: email.value.trim(),
        current_password: curPass.value,
        new_password: newPass.value,
      }),
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateAuthUI();
      [curPass, newPass, confPass].forEach((el) => {
        el.value = "";
        el.classList.remove("is-error", "is-valid");
      });
      showToast("Admin profile updated!");
      renderAdminContent();
    } else {
      showToast(data.error || "Update failed", "error");
    }
  } catch (err) {
    console.error(err);
  }
}

function toggleAdminTheme() {
  document.documentElement.classList.toggle("dark");
  renderAdminContent();
}

function openAdminModal(title, desc, body, footer, wide) {
  const overlay = document.getElementById("admin-modal-overlay");
  const modal = document.getElementById("admin-modal");
  if (!modal) return;
  modal.className = "modal" + (wide ? " modal-lg" : "");
  modal.innerHTML = `
    <button class="modal-close" onclick="closeAdminModal()">${li("x", 20)}</button>
    <h2>${title}</h2>
    <p class="desc">${desc}</p>
    ${body}
    ${footer ? `<div class="modal-footer">${footer}</div>` : ""}
  `;
  overlay.classList.add("open");
  reinitIcons();
}

function showConfirmModal(title, desc, onConfirm) {
  openAdminModal(
    title,
    desc,
    "",
    `
      <button class="btn btn-outline" onclick="closeAdminModal()">Cancel</button>
      <button class="btn btn-destructive" id="confirm-modal-btn">Confirm</button>
      `,
  );
  document.getElementById("confirm-modal-btn").onclick = () => {
    onConfirm();
    closeAdminModal();
  };
}

function closeAdminModal() {
  document.getElementById("admin-modal-overlay").classList.remove("open");
}
function clearAdminModalError() {
  const e = document.getElementById("admin-modal-error");
  if (e) e.innerHTML = "";
}
