const products = [
  { id:"1", name:"iPhone 15 Pro Max", description:"Titanium design, A17 Pro chip, 48MP camera system with 5x optical zoom.", price:3200000, category:"Smartphones", image:"https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&q=80", specs:["A17 Pro Chip","48MP Camera","5x Optical Zoom","Titanium Frame","USB-C"], inStock:true, badge:"New" },
  { id:"2", name:'MacBook Pro 16"', description:"M3 Max chip, 36GB unified memory, stunning Liquid Retina XDR display.", price:6500000, category:"Laptops", image:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80", specs:["M3 Max Chip","36GB RAM","Liquid Retina XDR","22hr Battery","MagSafe"], inStock:true, badge:"Popular" },
  { id:"3", name:"Sony WH-1000XM5", description:"Industry-leading noise canceling with exceptional sound quality and comfort.", price:920000, category:"Audio", image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80", specs:["30hr Battery","ANC","Hi-Res Audio","Multipoint","Foldable"], inStock:true, badge:"Best Seller" },
  { id:"4", name:"Apple Watch Ultra 2", description:"The most rugged Apple Watch with precision dual-frequency GPS and action button.", price:2100000, category:"Wearables", image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80", specs:["Dual GPS","Action Button","100m Water Resist","S9 Chip","36hr Battery"], inStock:true, badge:"New" },
  { id:"5", name:'iPad Pro 12.9"', description:"M2 chip, Liquid Retina XDR display. Works with Apple Pencil and Magic Keyboard.", price:2900000, category:"Tablets", image:"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80", specs:["M2 Chip","Liquid Retina XDR","Face ID","Thunderbolt","5G Option"], inStock:true },
  { id:"6", name:"AirPods Pro 2", description:"Adaptive Audio with USB-C charging and up to 2x more Active Noise Cancellation.", price:650000, category:"Audio", image:"https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80", specs:["Adaptive Audio","USB-C","2x ANC","6hr Battery","IP54 Rated"], inStock:true },
  { id:"7", name:"Samsung Galaxy S24 Ultra", description:"Galaxy AI, 200MP camera, titanium frame, built-in S Pen for productivity.", price:3400000, category:"Smartphones", image:"https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&q=80", specs:["200MP Camera","Galaxy AI","S Pen","Titanium Frame","Snapdragon 8 Gen 3"], inStock:true, badge:"Sale" },
  { id:"8", name:"Dell XPS 15", description:"13th Gen Intel Core processor, OLED InfinityEdge display, ultra-thin design.", price:4700000, category:"Laptops", image:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80", specs:["Intel i7-13700H","OLED Display","32GB RAM","1TB SSD","Thunderbolt 4"], inStock:true },
  { id:"9", name:"Samsung Galaxy Watch 6", description:"Advanced health monitoring, sapphire crystal display, seamless Galaxy integration.", price:860000, category:"Wearables", image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80", specs:["Sapphire Crystal","BioActive Sensor","Wear OS","NFC","IP68"], inStock:true },
  { id:"10", name:"Samsung Galaxy Tab S9", description:"Dynamic AMOLED 2X display, Snapdragon 8 Gen 2, IP68 water resistance.", price:2200000, category:"Tablets", image:"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80", specs:["AMOLED 2X","Snapdragon 8 Gen 2","IP68","S Pen","8GB RAM"], inStock:true },
];
const defaultCategories = ["All","Smartphones","Laptops","Audio","Wearables","Tablets"];


let activeCategory = "All";
let cart = [];
let currentUser = null;
let allUsers = [];
let orders = [];
let authMode = "login";
let previewProduct = null;
let selectedPayment = "mobile";
let selectedProvider = "";
const touchedCheckout = {};
let adminActiveTab = "dashboard";
let adminAvatarPreview = null;



function formatTZS(n) { return 'TZS ' + n.toLocaleString('en-US'); }


function li(name, size) {
  const s = size || 20;
  return `<i data-lucide="${name}" style="width:${s}px;height:${s}px;"></i>`;
}

function reinitIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showToast(msg, type, duration) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const dur = duration || 4000;
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  const iconName = type === 'error' ? 'x-circle' : 'check-circle';
  t.innerHTML = `<i data-lucide="${iconName}" class="toast-icon"></i><span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()"><i data-lucide="x" style="width:14px;height:14px;"></i></button>`;
  document.body.appendChild(t);
  reinitIcons();
  const timer = setTimeout(() => { if (t.parentElement) { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); } }, dur);
  t._timer = timer;
}

function getAdminProducts() {
  try {
    const stored = localStorage.getItem('es_admin_products');
    return stored ? JSON.parse(stored) : [...products];
  } catch { return [...products]; }
}
function saveAdminProducts(p) { localStorage.setItem('es_admin_products', JSON.stringify(p)); }

function getAdminCategories() {
  try {
    const stored = localStorage.getItem('es_admin_categories');
    return stored ? JSON.parse(stored) : defaultCategories.filter(c => c !== "All");
  } catch { return defaultCategories.filter(c => c !== "All"); }
}
function saveAdminCategories(c) { localStorage.setItem('es_admin_categories', JSON.stringify(c)); }

function getStoredUsers() {
  try { return JSON.parse(localStorage.getItem('es_users') || '[]'); } catch { return []; }
}
function saveStoredUsers(u) { localStorage.setItem('es_users', JSON.stringify(u)); allUsers = u; }

function getStoredOrders(userId) {
  try { return JSON.parse(localStorage.getItem('es_orders_' + userId) || '[]'); } catch { return []; }
}
function saveStoredOrders(userId, o) { localStorage.setItem('es_orders_' + userId, JSON.stringify(o)); }



(function seedAdmin() {
  const users = getStoredUsers();
  if (!users.some(u => u.email.toLowerCase() === 'michaelhaji@yahoo.com')) {
    users.push({ id: 'admin-1', firstName: 'Michael', lastName: 'Haji', email: 'michaelhaji@yahoo.com', password: 'Haji#123', role: 'admin' });
    saveStoredUsers(users);
  } else {
    allUsers = users;
  }
})();


let heroIdx = 0;
setInterval(() => {
  const prev = document.getElementById('hero-img-' + heroIdx);
  if (prev) prev.classList.add('hidden');
  heroIdx = (heroIdx + 1) % 3;
  const next = document.getElementById('hero-img-' + heroIdx);
  if (next) next.classList.remove('hidden');
  document.querySelectorAll('#hero-dots .hero-dot').forEach((d, i) => d.classList.toggle('active', i === heroIdx));
}, 5000);


function navigate(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById("page-" + page);
  if (el) el.classList.add("active");
  const nb = document.getElementById("navbar");
  if (nb) nb.style.display = (page === "confirmation" || page === "admin") ? "none" : "";
  window.scrollTo(0, 0);
  if (page === "checkout") renderCheckoutSummary();
  if (page === "profile") populateProfile();
  if (page === "orders") renderOrders();
  if (page === "admin") renderAdminDashboard();
  reinitIcons();
}


function renderCategories() {
  const cats = ["All", ...getAdminCategories()];
  const container = document.getElementById("category-filter");
  if (!container) return;
  container.innerHTML = cats.map(c =>
    `<button class="category-btn ${c === activeCategory ? 'active' : ''}" onclick="setCategory('${c}')">${c}</button>`
  ).join("");
}
function setCategory(cat) { activeCategory = cat; renderCategories(); filterProducts(); }


function getDisplayProducts() { return getAdminProducts(); }

function filterProducts() {
  const searchEl = document.getElementById("search-input");
  const query = searchEl ? searchEl.value.toLowerCase() : "";
  const allProds = getDisplayProducts();
  const filtered = allProds.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    return matchSearch && matchCat && p.inStock !== false;
  });
  const grid = document.getElementById("product-grid");
  const empty = document.getElementById("no-products");
  if (!grid) return;
  if (filtered.length === 0) { grid.innerHTML = ""; if (empty) empty.style.display = "block"; return; }
  if (empty) empty.style.display = "none";
  grid.innerHTML = filtered.map(p => `
    <div class="product-card" onclick="openPreview('${p.id}')">
      ${p.badge ? `<div class="badge ${p.badge === 'Sale' ? 'badge-destructive' : 'badge-default'}" style="position:absolute;top:12px;left:12px;z-index:5;">${p.badge}</div>` : ''}
      <div class="product-img"><img src="${p.image}" alt="${p.name}" loading="lazy" /></div>
      <div class="product-info">
        <p class="category">${p.category}</p>
        <h3 class="line-clamp-1">${p.name}</h3>
        <p class="desc line-clamp-2">${p.description}</p>
        <div class="product-footer">
          <span class="product-price">${formatTZS(p.price)}</span>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart('${p.id}')">
            ${li('shopping-cart',14)} Add
          </button>
        </div>
      </div>
    </div>
  `).join("");
  reinitIcons();
}


function addToCart(id) {
  const product = getDisplayProducts().find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(i => i.id === id);
  if (existing) existing.quantity++;
  else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
  updateCartUI();
}
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); updateCartUI(); renderCartContent(); }
function updateQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
  updateCartUI(); renderCartContent();
}
function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.quantity, 0);
  ["cart-badge-desktop","cart-badge-mobile"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = total; el.style.display = total > 0 ? "flex" : "none"; }
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
    container.innerHTML = `<div class="cart-empty">${li('shopping-bag',40)} <div><p style="font-weight:600;color:var(--fg);">Your cart is empty</p><p style="font-size:0.875rem;color:var(--muted-fg);margin-top:0.25rem;">Add items to get started</p></div><button class="btn btn-outline" onclick="closeCart()">Continue Shopping</button></div>`;
    reinitIcons();
    return;
  }
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 250000 ? 0 : 25000;
  container.innerHTML = `
    <div class="cart-items">${cart.map(i => `
      <div class="cart-item">
        <div class="cart-item-img"><img src="${i.image}" alt="${i.name}" /></div>
        <div class="cart-item-info">
          <h4>${i.name}</h4>
          <div class="cart-item-price">${formatTZS(i.price)}</div>
          <div class="cart-item-qty">
            <button class="btn btn-outline btn-icon-sm" onclick="updateQty('${i.id}',-1)">${li('minus',14)}</button>
            <span>${i.quantity}</span>
            <button class="btn btn-outline btn-icon-sm" onclick="updateQty('${i.id}',1)">${li('plus',14)}</button>
            <button class="btn btn-ghost btn-icon-sm" style="margin-left:auto;color:var(--destructive);" onclick="removeFromCart('${i.id}')">${li('trash-2',14)}</button>
          </div>
        </div>
      </div>`).join("")}
    </div>
    <div class="cart-summary">
      <div class="cart-summary-row"><span class="label">Subtotal</span><span class="value">${formatTZS(subtotal)}</span></div>
      <div class="cart-summary-row"><span class="label">Shipping</span><span class="value" ${shipping===0?'style="color:var(--primary);font-weight:500;"':''}>${shipping===0?'Free':formatTZS(shipping)}</span></div>
      <div class="cart-total"><span>Total</span><span>${formatTZS(subtotal+shipping)}</span></div>
      <button class="btn btn-primary btn-lg" style="width:100%;" onclick="goToCheckout()">Proceed to Checkout</button>
    </div>`;
  reinitIcons();
}
function goToCheckout() {
  if (!currentUser) { closeCart(); openAuthModal(); return; }
  closeCart(); navigate("checkout");
}


function openPreview(id) {
  previewProduct = getDisplayProducts().find(p => p.id === id);
  if (!previewProduct) return;
  document.getElementById("preview-img").src = previewProduct.image;
  document.getElementById("preview-img").alt = previewProduct.name;
  document.getElementById("preview-category").textContent = previewProduct.category;
  document.getElementById("preview-name").textContent = previewProduct.name;
  document.getElementById("preview-desc").textContent = previewProduct.description;
  document.getElementById("preview-price").textContent = formatTZS(previewProduct.price);
  document.getElementById("preview-specs").innerHTML = previewProduct.specs ? previewProduct.specs.map(s => `<div class="preview-spec">${li('check',14)}<span>${s}</span></div>`).join("") : '';
  const badge = document.getElementById("preview-badge");
  if (previewProduct.badge) { badge.textContent = previewProduct.badge; badge.style.display = "inline-flex"; badge.className = "badge " + (previewProduct.badge === "Sale" ? "badge-destructive" : "badge-default"); }
  else { badge.style.display = "none"; }
  document.getElementById("preview-overlay").classList.add("open");
  reinitIcons();
}
function closePreview() { document.getElementById("preview-overlay").classList.remove("open"); }
function addToCartFromPreview() { if (previewProduct) { addToCart(previewProduct.id); closePreview(); } }


function openAuthModal() { document.getElementById("auth-overlay").classList.add("open"); }
function closeAuthModal() { document.getElementById("auth-overlay").classList.remove("open"); clearAuthErrors(); }
function clearAuthErrors() {
  ['auth-fn','auth-ln','auth-email','auth-pass','auth-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('is-error','is-valid'); const err = el.closest('.form-group')?.querySelector('.form-error'); if (err) err.remove(); }
  });
}
function switchAuthMode() {
  authMode = authMode === "login" ? "signup" : "login";
  document.getElementById("auth-title").textContent = authMode === "login" ? "Welcome Back" : "Create Account";
  document.getElementById("auth-desc").textContent = authMode === "login" ? "Sign in to your account to proceed to checkout" : "Create an account to start shopping";
  document.getElementById("auth-name-fields").style.display = authMode === "signup" ? "block" : "none";
  document.getElementById("auth-confirm-group").style.display = authMode === "signup" ? "block" : "none";
  document.querySelector("#auth-form button[type=submit]").textContent = authMode === "login" ? "Sign In" : "Create Account";
  document.getElementById("auth-switch").innerHTML = authMode === "login"
    ? 'Don\'t have an account? <button style="background:none;border:none;color:var(--primary);font-weight:500;cursor:pointer;" onclick="switchAuthMode()">Sign up</button>'
    : 'Already have an account? <button style="background:none;border:none;color:var(--primary);font-weight:500;cursor:pointer;" onclick="switchAuthMode()">Sign in</button>';
  clearAuthErrors();
}

function validateAuthField(el) {
  const id = el.id; const val = el.value.trim();
  let error = '';
  if (id === 'auth-fn' && authMode === 'signup' && !val) error = 'First name is required';
  else if (id === 'auth-fn' && authMode === 'signup' && val.length < 2) error = 'At least 2 characters';
  else if (id === 'auth-ln' && authMode === 'signup' && !val) error = 'Last name is required';
  else if (id === 'auth-ln' && authMode === 'signup' && val.length < 2) error = 'At least 2 characters';
  else if (id === 'auth-email' && !val) error = 'Email is required';
  else if (id === 'auth-email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) error = 'Enter a valid email';
  else if (id === 'auth-pass' && !val) error = 'Password is required';
  else if (id === 'auth-pass' && val.length < 6) error = 'At least 6 characters';
  else if (id === 'auth-confirm' && authMode === 'signup') {
    const pass = document.getElementById('auth-pass').value;
    if (!val) error = 'Confirm your password';
    else if (val !== pass) error = "Passwords don't match";
  }
  showFieldError(el, error);
}

function showFieldError(el, error) {
  const group = el.closest('.form-group');
  if (!group) return;
  const oldErr = group.querySelector('.form-error');
  if (oldErr) oldErr.remove();
  if (error) {
    el.classList.add('is-error'); el.classList.remove('is-valid');
    const errP = document.createElement('p'); errP.className = 'form-error'; errP.textContent = error; group.appendChild(errP);
  } else if (el.value.trim()) {
    el.classList.remove('is-error'); el.classList.add('is-valid');
  } else {
    el.classList.remove('is-error', 'is-valid');
  }
}

function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById("auth-email");
  const pass = document.getElementById("auth-pass");
  [email, pass].forEach(el => validateAuthField(el));
  if (authMode === "signup") {
    const fn = document.getElementById("auth-fn");
    const ln = document.getElementById("auth-ln");
    const confirm = document.getElementById("auth-confirm");
    [fn, ln, confirm].forEach(el => validateAuthField(el));
    if (document.querySelectorAll('#auth-form .is-error').length > 0) return;
    if (!fn.value.trim() || !ln.value.trim() || !email.value.trim() || !pass.value.trim() || !confirm.value.trim()) return;
    const users = getStoredUsers();
    if (users.some(u => u.email.toLowerCase() === email.value.trim().toLowerCase())) {
      showFieldError(email, 'An account with this email already exists'); return;
    }
    const newUser = { id: 'user-' + Date.now().toString(36), firstName: fn.value.trim(), lastName: ln.value.trim(), email: email.value.trim(), password: pass.value, role: 'customer' };
    users.push(newUser);
    saveStoredUsers(users);
    currentUser = { id: newUser.id, firstName: newUser.firstName, lastName: newUser.lastName, email: newUser.email, role: newUser.role };
  } else {
    if (document.querySelectorAll('#auth-form .is-error').length > 0) return;
    if (!email.value.trim() || !pass.value.trim()) return;
    const users = getStoredUsers();
    const found = users.find(u => u.email.toLowerCase() === email.value.trim().toLowerCase() && u.password === pass.value);
    if (!found) { showFieldError(pass, 'Invalid email or password'); return; }
    currentUser = { id: found.id, firstName: found.firstName, lastName: found.lastName, email: found.email, role: found.role || (found.email.toLowerCase() === 'anna@gmail.com' ? 'admin' : 'customer') };
  }
  orders = getStoredOrders(currentUser.id);
  closeAuthModal();
  updateAuthUI();
 
  showToast('Hi, ' + currentUser.firstName + '! Welcome to ElectroShop 🎉', 'success', 5000);

  ['auth-fn','auth-ln','auth-email','auth-pass','auth-confirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function logout() { currentUser = null; orders = []; updateAuthUI(); navigate('home'); }

function isAdmin() {
  return currentUser && (currentUser.email.toLowerCase() === 'anna@gmail.com' || currentUser.role === 'admin');
}

function updateAuthUI() {
  const desktop = document.getElementById("auth-desktop");
  const mobile = document.getElementById("auth-mobile");
  const desktopNav = document.getElementById("desktop-nav");
  const mobileNav = document.getElementById("mobile-nav-links");
  if (!desktop || !desktopNav) return;

  let baseLinks = `
    <a href="#" onclick="navigate('home'); return false;">${li('home',16)} Home</a>
    <a href="#" onclick="navigate('about'); return false;">${li('info',16)} About</a>
    <a href="#" onclick="navigate('support'); return false;">${li('headphones',16)} Support</a>`;
  if (currentUser) {
    if (!isAdmin()) {
      baseLinks += `
      <a href="#" onclick="navigate('profile'); return false;">${li('user-circle',16)} My Profile</a>
      <a href="#" onclick="navigate('orders'); return false;">${li('package',16)} My Orders</a>`;
    }
    if (isAdmin()) {
      baseLinks += `<a href="#" class="admin-link" onclick="navigate('admin'); return false;">${li('layout-dashboard',16)} Admin</a>`;
    }
  }
  desktopNav.innerHTML = baseLinks;

  let mobileLinks = baseLinks.replace(/return false;"/g, 'toggleMobileMenu(); return false;"');
  mobileNav.innerHTML = mobileLinks;

  if (currentUser) {
    desktop.innerHTML = `<button class="btn btn-outline btn-sm" onclick="logout()">${li('log-out',16)} Logout</button>`;
    mobile.innerHTML = `<button class="btn btn-outline" style="width:100%;" onclick="logout(); toggleMobileMenu();">${li('log-out',16)} Logout</button>`;
  } else {
    desktop.innerHTML = `<button class="btn btn-outline btn-sm" onclick="openAuthModal()">${li('user',16)} Login</button>`;
    mobile.innerHTML = `<button class="btn btn-outline" style="width:100%;" onclick="openAuthModal(); toggleMobileMenu();">${li('user',16)} Login</button>`;
  }
  reinitIcons();
}


function toggleMobileMenu() {
  document.getElementById("mobile-menu").classList.toggle("open");
  document.getElementById("mobile-overlay").classList.toggle("open");
}


function selectPayment(method) {
  selectedPayment = method;
  document.querySelectorAll(".payment-method").forEach(el => el.classList.toggle("active", el.dataset.method === method));
  renderPaymentDetails();
}
function renderPaymentDetails() {
  const container = document.getElementById("payment-details");
  if (!container) return;
  if (selectedPayment === "mobile") {
    container.innerHTML = `
      <div style="margin-bottom:1rem;"><label style="font-size:0.875rem;font-weight:500;display:block;margin-bottom:0.5rem;">Select Provider *</label>
      <div class="mobile-providers">
        <button type="button" class="mobile-provider ${selectedProvider==='vodacom'?'active':''}" onclick="selectProvider('vodacom')"><div class="dot" style="background:#ef4444;"></div><span class="name">Vodacom M-Pesa</span></button>
        <button type="button" class="mobile-provider ${selectedProvider==='tigo'?'active':''}" onclick="selectProvider('tigo')"><div class="dot" style="background:#2563eb;"></div><span class="name">Tigo Pesa (MIX)</span></button>
        <button type="button" class="mobile-provider ${selectedProvider==='halopesa'?'active':''}" onclick="selectProvider('halopesa')"><div class="dot" style="background:#f97316;"></div><span class="name">Halopesa</span></button>
        <button type="button" class="mobile-provider ${selectedProvider==='airtel'?'active':''}" onclick="selectProvider('airtel')"><div class="dot" style="background:#dc2626;"></div><span class="name">Airtel Money</span></button>
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
    container.innerHTML = `<div class="cash-notice">${li('banknote',32)} <p style="margin-top:0.5rem;">Pay with cash when your order is delivered to your doorstep.</p></div>`;
  }
  reinitIcons();
}
function selectProvider(id) { selectedProvider = id; renderPaymentDetails(); }


function getCheckoutError(el) {
  const id = el.id; const val = el.value.trim();
  if (id === 'co-fn' && !val) return 'First name is required';
  if (id === 'co-fn' && val.length > 50) return 'Max 50 characters';
  if (id === 'co-ln' && !val) return 'Last name is required';
  if (id === 'co-email' && !val) return 'Email is required';
  if (id === 'co-email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email address';
  if (id === 'co-addr' && !val) return 'Address is required';
  if (id === 'co-city' && !val) return 'City is required';
  if (id === 'co-region' && !val) return 'Region is required';
  if (id === 'co-zip' && !val) return 'ZIP code is required';
  if (id === 'co-mobile' && selectedPayment === 'mobile') {
    if (!val) return 'Phone number is required';
    if (!/^(\+?255|0)\d{9}$/.test(val)) return 'Invalid Tanzanian phone number';
  }
  if (id === 'co-cardnum' && selectedPayment === 'card') {
    if (!val) return 'Card number is required';
    if (!/^[\d\s]{13,19}$/.test(val)) return 'Invalid card number';
  }
  if (id === 'co-expiry' && selectedPayment === 'card') {
    if (!val) return 'Expiry is required';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(val)) return 'Use MM/YY format';
  }
  if (id === 'co-cvv' && selectedPayment === 'card') {
    if (!val) return 'CVV is required';
    if (!/^\d{3,4}$/.test(val)) return 'Invalid CVV';
  }
  return '';
}
function validateCheckoutField(el) { touchedCheckout[el.id] = true; showFieldError(el, getCheckoutError(el)); }
function liveValidateCheckout(el) { if (touchedCheckout[el.id]) showFieldError(el, getCheckoutError(el)); }

function renderCheckoutSummary() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 250000 ? 0 : 25000;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  const container = document.getElementById("checkout-summary");
  if (!container) return;
  if (cart.length === 0) { container.innerHTML = `<p style="text-align:center;color:var(--muted-fg);">Your cart is empty</p><button class="btn btn-primary" style="width:100%;margin-top:1rem;" onclick="navigate('home')">Continue Shopping</button>`; return; }
  container.innerHTML = `
    <h2 class="font-display" style="font-size:1.125rem;font-weight:600;margin-bottom:1rem;">Order Summary</h2>
    <div style="max-height:16rem;overflow-y:auto;">${cart.map(i => `
      <div class="order-item"><div class="order-item-img"><img src="${i.image}" alt="${i.name}" /></div><div class="order-item-info"><p class="name">${i.name}</p><p class="qty">Qty: ${i.quantity}</p></div><span class="order-item-price">${formatTZS(i.price * i.quantity)}</span></div>`).join("")}
    </div>
    <div class="summary-divider"></div>
    <div style="font-size:0.875rem;">
      <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="color:var(--muted-fg);">Subtotal</span><span>${formatTZS(subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="color:var(--muted-fg);">Shipping</span><span ${shipping===0?'style="color:var(--primary);font-weight:500;"':''}>${shipping===0?'Free':formatTZS(shipping)}</span></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted-fg);">Tax</span><span>${formatTZS(Math.round(tax))}</span></div>
    </div>
    <div class="summary-divider"></div>
    <div style="display:flex;justify-content:space-between;font-weight:600;font-size:1.125rem;margin-bottom:1rem;"><span>Total</span><span>${formatTZS(Math.round(total))}</span></div>
    <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">Pay ${formatTZS(Math.round(total))}</button>`;
}

function handleCheckout(e) {
  e.preventDefault();
  let valid = true;
  e.target.querySelectorAll("input[required]").forEach(inp => {
    touchedCheckout[inp.id] = true;
    validateCheckoutField(inp);
    if (getCheckoutError(inp)) valid = false;
  });
  if (selectedPayment === 'mobile' && !selectedProvider) { alert('Please select a mobile money provider'); valid = false; }
  if (!valid) { alert("Please fix the errors before submitting"); return; }
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 250000 ? 0 : 25000;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();
  const newOrder = {
    orderNumber, total: Math.round(total),
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
    status: "Processing"
  };
  orders.unshift(newOrder);
  if (currentUser) saveStoredOrders(currentUser.id, orders);
  document.getElementById("conf-order").textContent = orderNumber;
  document.getElementById("conf-total").textContent = formatTZS(Math.round(total));
  cart = []; updateCartUI();
  Object.keys(touchedCheckout).forEach(k => delete touchedCheckout[k]);
  navigate("confirmation");
}


function renderOrders() {
  if (!currentUser) { navigate('home'); return; }
  orders = getStoredOrders(currentUser.id);
  const container = document.getElementById("orders-list");
  if (!container) return;
  if (orders.length === 0) {
    container.innerHTML = `<div class="orders-empty">${li('shopping-bag',64)}<p class="title">No orders yet</p><p class="sub">When you place an order, it will appear here.</p><button class="btn btn-primary" onclick="navigate('home')">Start Shopping</button></div>`;
    reinitIcons();
    return;
  }
  const statusBadge = (s) => `<span class="badge badge-${s.toLowerCase()}">${s}</span>`;
  container.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-card-header">
        <div><p class="order-num">${order.orderNumber}</p><div class="order-card-meta"><span>${li('calendar',12)} ${order.date}</span><span>${li('credit-card',12)} ${formatTZS(order.total)}</span></div></div>
        ${statusBadge(order.status)}
      </div>
      <div class="order-card-body">${order.items.map(item => `
        <div class="order-line"><div class="order-line-left">${li('package',14)}<span class="oname">${item.name}</span><span class="oqty">×${item.quantity}</span></div><span class="order-line-price">${formatTZS(item.price * item.quantity)}</span></div>`).join("")}
      </div>
    </div>`).join("");
  reinitIcons();
}


function populateProfile() {
  if (!currentUser) { navigate('home'); return; }
  document.getElementById('pf-fn').value = currentUser.firstName || '';
  document.getElementById('pf-ln').value = currentUser.lastName || '';
  document.getElementById('pf-email').value = currentUser.email || '';
  ['pf-curpass','pf-newpass','pf-confpass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['pf-fn','pf-ln','pf-email','pf-curpass','pf-newpass','pf-confpass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('is-error','is-valid'); const e = el.closest('.form-group')?.querySelector('.form-error'); if (e) e.remove(); }
  });
  renderProfileThemeCard();
}

function renderProfileThemeCard() {
  const card = document.getElementById('profile-theme-card');
  if (!card) return;
  const isDark = document.documentElement.classList.contains('dark');
  card.innerHTML = `
    <div class="profile-card-header"><h2>${li(isDark?'moon':'sun',20)} Appearance</h2><p>Toggle between light and dark mode</p></div>
    <div class="profile-card-body">
      <div class="theme-toggle">
        <div class="info"><p>${isDark?'Dark Mode':'Light Mode'}</p><p>Switch your preferred theme</p></div>
        <button class="btn btn-outline" onclick="toggleProfileTheme()">${li(isDark?'sun':'moon',16)} ${isDark?'Light Mode':'Dark Mode'}</button>
      </div>
    </div>`;
  reinitIcons();
}

function toggleProfileTheme() {
  document.documentElement.classList.toggle('dark');
  renderProfileThemeCard();
}

function validateProfileField(el) {
  const id = el.id; const val = el.value.trim(); let error = '';
  if (id === 'pf-fn' && !val) error = 'First name is required';
  else if (id === 'pf-fn' && val.length < 2) error = 'At least 2 characters';
  else if (id === 'pf-ln' && !val) error = 'Last name is required';
  else if (id === 'pf-ln' && val.length < 2) error = 'At least 2 characters';
  else if (id === 'pf-email' && !val) error = 'Email is required';
  else if (id === 'pf-email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) error = 'Enter a valid email';
  else if (id === 'pf-newpass' && val && val.length < 6) error = 'Must be at least 6 characters';
  else if (id === 'pf-confpass') {
    const np = document.getElementById('pf-newpass').value;
    if (np && !val) error = 'Please confirm your password';
    else if (val && val !== np) error = "Passwords don't match";
  } else if (id === 'pf-curpass') {
    const np = document.getElementById('pf-newpass').value;
    if (np && !val) error = 'Current password is required';
  }
  showFieldError(el, error);
}

function toggleProfilePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.innerHTML = li(input.type === 'password' ? 'eye' : 'eye-off', 16);
  reinitIcons();
}

function saveProfile() {
  if (!currentUser) return;
  const fn = document.getElementById('pf-fn'), ln = document.getElementById('pf-ln'), email = document.getElementById('pf-email');
  const curPass = document.getElementById('pf-curpass'), newPass = document.getElementById('pf-newpass'), confPass = document.getElementById('pf-confpass');
  [fn, ln, email, curPass, newPass, confPass].forEach(el => validateProfileField(el));
  if (document.querySelectorAll('#page-profile .is-error').length > 0) return;
  if (!fn.value.trim() || !ln.value.trim() || !email.value.trim()) return;
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx === -1) return;
  if (newPass.value) {
    if (!curPass.value || users[idx].password !== curPass.value) { showFieldError(curPass, 'Current password is incorrect'); return; }
    users[idx].password = newPass.value;
  }
  if (email.value.trim().toLowerCase() !== users[idx].email.toLowerCase()) {
    if (users.some((u,i) => i !== idx && u.email.toLowerCase() === email.value.trim().toLowerCase())) { showFieldError(email, 'Email already exists'); return; }
  }
  users[idx].firstName = fn.value.trim();
  users[idx].lastName = ln.value.trim();
  users[idx].email = email.value.trim();
  saveStoredUsers(users);
  currentUser.firstName = fn.value.trim();
  currentUser.lastName = ln.value.trim();
  currentUser.email = email.value.trim();
  updateAuthUI();
  [curPass, newPass, confPass].forEach(el => { el.value = ''; el.classList.remove('is-error','is-valid'); });
  showToast('Profile updated successfully!');
}


function renderAdminDashboard() {
  if (!isAdmin()) { navigate('home'); return; }
  adminActiveTab = 'dashboard';
  adminAvatarPreview = null;
  renderAdminContent();
}

function setAdminTab(tab) {
  adminActiveTab = tab;
  renderAdminContent();
}

function renderAdminContent() {
  const main = document.getElementById('admin-main');
  if (!main) return;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === adminActiveTab));

  switch(adminActiveTab) {
    case 'dashboard': renderAdminDashboardTab(main); break;
    case 'orders': renderAdminOrdersTab(main); break;
    case 'categories': renderAdminCategoriesTab(main); break;
    case 'products': renderAdminProductsTab(main); break;
    case 'users': renderAdminUsersTab(main); break;
    case 'profile': renderAdminProfileTab(main); break;
    default: renderAdminDashboardTab(main);
  }
  reinitIcons();
}


function renderAdminDashboardTab(main) {
  const prods = getAdminProducts();
  const cats = getAdminCategories();
  const users = getStoredUsers();
  let ordersCount = 0;
  users.forEach(u => { ordersCount += getStoredOrders(u.id).length; });

  main.innerHTML = `
    <div class="profile-card" style="margin-bottom:1.5rem;">
      <div class="profile-card-header"><h2 style="font-family:var(--font-display);font-size:1.5rem;">Hi, ${currentUser?.firstName || 'Admin'} 👋</h2><p>Welcome to the ElectroShop Admin Dashboard. Manage your products, orders, categories, and users from here.</p></div>
    </div>
    <div class="admin-stats">
      ${[{l:'Products',v:prods.length,i:'package'},{l:'Orders',v:ordersCount,i:'shopping-cart'},{l:'Users',v:users.length,i:'users'},{l:'Categories',v:cats.length,i:'folder-tree'}].map(s => `
      <div class="stat-card"><div class="stat-card-inner"><div class="stat-info"><p>${s.l}</p><p>${s.v}</p></div>${li(s.i,40)}</div></div>`).join('')}
    </div>`;
}


let adminOrderSearch = '';
function renderAdminOrdersTab(main) {
  const users = getStoredUsers();
  let allOrders = [];
  users.forEach(u => {
    getStoredOrders(u.id).forEach(o => {
      allOrders.push({ ...o, userId: u.id, userName: u.firstName + ' ' + u.lastName, userEmail: u.email });
    });
  });
  allOrders.sort((a, b) => b.orderNumber.localeCompare(a.orderNumber));
  const q = adminOrderSearch.toLowerCase();
  const filtered = q ? allOrders.filter(o => o.orderNumber.toLowerCase().includes(q) || o.userName.toLowerCase().includes(q) || o.userEmail.toLowerCase().includes(q)) : allOrders;

  const statusBadge = s => { const cls = s==='Delivered'?'delivered':s==='Shipped'?'shipped':s==='Cancelled'?'cancelled':'processing'; return `<span class="badge badge-${cls}">${s}</span>`; };

  main.innerHTML = `
    <div class="admin-toolbar">
      <div class="search-wrapper">${li('search',16)}<input class="search-input" placeholder="Search orders by number, name or email..." value="${adminOrderSearch}" oninput="adminOrderSearch=this.value; renderAdminContent();" /></div>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Order #</th><th>Customer</th><th class="hide-mobile">Email</th><th>Total</th><th>Status</th><th class="hide-mobile">Date</th><th>Actions</th></tr></thead>
        <tbody>${filtered.length === 0 ? `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted-fg);">${allOrders.length === 0 ? 'No orders yet' : 'No orders match'}</td></tr>` :
        filtered.map(o => `<tr>
          <td class="mono">${o.orderNumber}</td>
          <td>${o.userName}</td>
          <td class="hide-mobile" style="color:var(--muted-fg);">${o.userEmail}</td>
          <td style="font-weight:600;">${formatTZS(o.total)}</td>
          <td>${statusBadge(o.status)}</td>
          <td class="hide-mobile" style="color:var(--muted-fg);">${o.date}</td>
          <td><div class="actions">
            <button class="btn btn-ghost btn-icon-sm" onclick="viewAdminOrder('${o.userId}','${o.orderNumber}')" title="View">${li('eye',14)}</button>
            ${o.status === 'Processing' ? `
              <button class="btn btn-ghost btn-icon-sm" style="color:var(--primary);" onclick="setAdminOrderStatus('${o.userId}','${o.orderNumber}','Shipped')" title="Ship">${li('check',14)}</button>
              <button class="btn btn-ghost btn-icon-sm" style="color:var(--destructive);" onclick="setAdminOrderStatus('${o.userId}','${o.orderNumber}','Cancelled')" title="Cancel">${li('x',14)}</button>` : ''}
            ${o.status === 'Shipped' ? `<button class="btn btn-ghost btn-icon-sm" style="color:var(--primary);" onclick="setAdminOrderStatus('${o.userId}','${o.orderNumber}','Delivered')" title="Deliver">${li('package',14)}</button>` : ''}
          </div></td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function setAdminOrderStatus(userId, orderNum, status) {
  const ords = getStoredOrders(userId);
  saveStoredOrders(userId, ords.map(o => o.orderNumber === orderNum ? { ...o, status } : o));
  showToast('Order ' + status);
  renderAdminContent();
}

function viewAdminOrder(userId, orderNum) {
  const ords = getStoredOrders(userId);
  const order = ords.find(o => o.orderNumber === orderNum);
  const user = getStoredUsers().find(u => u.id === userId);
  if (!order) return;
  openAdminModal('Order ' + order.orderNumber, `Customer: ${user ? user.firstName + ' ' + user.lastName : 'Unknown'} (${user?.email || ''})`, `
    <div style="margin-bottom:0.75rem;display:flex;justify-content:space-between;font-size:0.875rem;"><span style="color:var(--muted-fg);">Date</span><span>${order.date}</span></div>
    <div style="margin-bottom:0.75rem;display:flex;justify-content:space-between;font-size:0.875rem;"><span style="color:var(--muted-fg);">Status</span><span class="badge badge-${order.status.toLowerCase()}">${order.status}</span></div>
    <div style="border-top:1px solid var(--border);padding-top:0.75rem;margin-top:0.5rem;">
      ${order.items.map(i => `<div style="display:flex;justify-content:space-between;font-size:0.875rem;margin-bottom:0.5rem;"><span>${i.name} × ${i.quantity}</span><span style="font-weight:500;">${formatTZS(i.price * i.quantity)}</span></div>`).join('')}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:0.75rem;display:flex;justify-content:space-between;font-weight:600;"><span>Total</span><span>${formatTZS(order.total)}</span></div>
  `);
}


let adminCatSearch = '';
function renderAdminCategoriesTab(main) {
  const cats = getAdminCategories();
  const prods = getAdminProducts();
  const q = adminCatSearch.toLowerCase();
  const filtered = q ? cats.filter(c => c.toLowerCase().includes(q)) : cats;

  main.innerHTML = `
    <div class="admin-toolbar">
      <div class="search-wrapper">${li('search',16)}<input class="search-input" placeholder="Search categories..." value="${adminCatSearch}" oninput="adminCatSearch=this.value; renderAdminContent();" /></div>
      <button class="btn btn-primary" onclick="openAdminCategoryModal()">${li('plus',16)} Add Category</button>
    </div>
    <div class="admin-cat-grid">
      ${filtered.map(c => {
        const count = prods.filter(p => p.category === c).length;
        return `<div class="cat-card"><div><h3>${c}</h3><p class="count">${count} product${count!==1?'s':''}</p></div><div class="actions"><button class="btn btn-ghost btn-icon-sm" onclick="openAdminCategoryModal('${c}')" title="Edit">${li('pencil',14)}</button><button class="btn btn-ghost btn-icon-sm" style="color:var(--destructive);" onclick="deleteAdminCategory('${c}')" title="Delete">${li('trash-2',14)}</button></div></div>`;
      }).join('')}
      ${filtered.length === 0 ? `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted-fg);">${cats.length===0?'No categories yet':'No match'}</div>` : ''}
    </div>`;
}

function openAdminCategoryModal(editName) {
  const isEdit = !!editName;
  openAdminModal(isEdit ? 'Edit Category' : 'Add Category', isEdit ? 'Update the category name' : 'Enter a name for the new category', `
    <div class="form-group"><label>Category Name *</label><input class="form-input" id="admin-cat-name" value="${editName||''}" /></div>
    <div id="admin-modal-error"></div>
  `, `
    <button class="btn btn-outline" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAdminCategory('${editName||''}')">${isEdit?'Update':'Add'}</button>
  `);
}

function saveAdminCategory(editName) {
  const name = document.getElementById('admin-cat-name').value.trim();
  if (!name) { document.getElementById('admin-modal-error').innerHTML = '<p class="form-error">Category name is required</p>'; return; }
  const cats = getAdminCategories();
  if (editName) {
    const idx = cats.indexOf(editName);
    if (idx !== -1) {
      if (cats.some((c,i) => i!==idx && c.toLowerCase()===name.toLowerCase())) { document.getElementById('admin-modal-error').innerHTML = '<p class="form-error">Category already exists</p>'; return; }
      cats[idx] = name;
      const prods = getAdminProducts();
      prods.forEach(p => { if (p.category === editName) p.category = name; });
      saveAdminProducts(prods);
    }
    showToast('Category updated');
  } else {
    if (cats.some(c => c.toLowerCase()===name.toLowerCase())) { document.getElementById('admin-modal-error').innerHTML = '<p class="form-error">Category already exists</p>'; return; }
    cats.push(name);
    showToast('Category added');
  }
  saveAdminCategories(cats);
  closeAdminModal(); renderAdminContent(); renderCategories();
}

function deleteAdminCategory(name) {
  if (!confirm('Delete "' + name + '"? Products in this category will remain but be uncategorized.')) return;
  saveAdminCategories(getAdminCategories().filter(c => c !== name));
  showToast('Category deleted');
  renderAdminContent(); renderCategories();
}


let adminProdSearch = '';
function renderAdminProductsTab(main) {
  const prods = getAdminProducts();
  const q = adminProdSearch.toLowerCase();
  const filtered = q ? prods.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) : prods;

  main.innerHTML = `
    <div class="admin-toolbar">
      <div class="search-wrapper">${li('search',16)}<input class="search-input" placeholder="Search products..." value="${adminProdSearch}" oninput="adminProdSearch=this.value; renderAdminContent();" /></div>
      <button class="btn btn-primary" onclick="openAdminProductModal()">${li('plus',16)} Add Product</button>
    </div>
    <div class="admin-product-grid">
      ${filtered.map(p => `
      <div class="admin-product-card">
        <div class="img-wrap">
          <img src="${p.image}" alt="${p.name}" />
          ${!p.inStock ? '<div class="product-stock-overlay"><span class="badge badge-destructive">Out of Stock</span></div>' : ''}
          ${p.badge ? `<div class="badge ${p.badge==='Sale'?'badge-destructive':'badge-default'}" style="position:absolute;top:8px;left:8px;">${p.badge}</div>` : ''}
        </div>
        <div class="card-body">
          <p class="cat-label">${p.category}</p>
          <h3>${p.name}</h3>
          <p class="price">${formatTZS(p.price)}</p>
          <div class="card-actions">
            <button class="btn btn-ghost btn-icon-sm" onclick="openAdminProductModal('${p.id}')" title="Edit">${li('pencil',14)}</button>
            <button class="btn btn-ghost btn-icon-sm" onclick="toggleAdminStock('${p.id}')" title="${p.inStock?'Mark Out of Stock':'Mark In Stock'}">${li(p.inStock?'toggle-right':'toggle-left',14)}</button>
            <button class="btn btn-ghost btn-icon-sm" style="color:var(--destructive);" onclick="deleteAdminProduct('${p.id}')" title="Delete">${li('trash-2',14)}</button>
          </div>
        </div>
      </div>`).join('')}
      ${filtered.length === 0 ? `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted-fg);">${prods.length===0?'No products yet':'No match'}</div>` : ''}
    </div>`;
}

function openAdminProductModal(editId) {
  const prods = getAdminProducts();
  const p = editId ? prods.find(x => x.id === editId) : null;
  const isEdit = !!p;
  const cats = getAdminCategories();
  openAdminModal(isEdit ? 'Edit Product' : 'Add Product', isEdit ? 'Update the product details' : 'Fill in the product details', `
    <div class="form-group"><label>Name *</label><input class="form-input" id="ap-name" value="${p?.name||''}" /></div>
    <div class="form-group"><label>Description *</label><textarea class="form-input" id="ap-desc" style="height:80px;padding-top:0.5rem;resize:vertical;">${p?.description||''}</textarea></div>
    <div class="form-row form-row-2">
      <div class="form-group"><label>Price (TZS) *</label><input class="form-input" id="ap-price" type="number" value="${p?.price||''}" /></div>
      <div class="form-group"><label>Category *</label><select class="form-input" id="ap-cat">${cats.map(c=>`<option value="${c}" ${p?.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label>Image URL *</label><input class="form-input" id="ap-img" value="${p?.image||''}" placeholder="https://..." /></div>
    <div class="form-row form-row-2">
      <div class="form-group"><label>Badge</label><select class="form-input" id="ap-badge"><option value="">None</option>${['New','Popular','Best Seller','Sale'].map(b => `<option value="${b}" ${p?.badge===b?'selected':''}>${b}</option>`).join('')}</select></div>
      <div class="form-group"><label>&nbsp;</label><label style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;"><input type="checkbox" id="ap-stock" ${(!p||p.inStock)?'checked':''}> In Stock</label></div>
    </div>
    <div class="form-group"><label>Specs (comma-separated)</label><input class="form-input" id="ap-specs" value="${p?.specs?.join(', ')||''}" placeholder="e.g. 48MP Camera, 5G" /></div>
    <div id="admin-modal-error"></div>
  `, `
    <button class="btn btn-outline" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAdminProduct('${editId||''}')">${isEdit?'Update':'Add'}</button>
  `, true);
}

function saveAdminProduct(editId) {
  const name = document.getElementById('ap-name').value.trim();
  const desc = document.getElementById('ap-desc').value.trim();
  const price = Number(document.getElementById('ap-price').value);
  const cat = document.getElementById('ap-cat').value;
  const img = document.getElementById('ap-img').value.trim();
  const badge = document.getElementById('ap-badge').value;
  const inStock = document.getElementById('ap-stock').checked;
  const specs = document.getElementById('ap-specs').value.split(',').map(s => s.trim()).filter(Boolean);

  let errors = [];
  if (!name) errors.push('Name is required');
  if (!desc) errors.push('Description is required');
  if (!price || price <= 0) errors.push('Valid price is required');
  if (!cat) errors.push('Category is required');
  if (!img) errors.push('Image URL is required');
  if (errors.length) { document.getElementById('admin-modal-error').innerHTML = errors.map(e => `<p class="form-error">${e}</p>`).join(''); return; }

  const prods = getAdminProducts();
  if (editId) {
    const idx = prods.findIndex(p => p.id === editId);
    if (idx !== -1) { prods[idx] = { ...prods[idx], name, description: desc, price, category: cat, image: img, badge: badge||undefined, inStock, specs }; }
    showToast('Product updated');
  } else {
    prods.push({ id: 'prod-' + Date.now().toString(36), name, description: desc, price, category: cat, image: img, badge: badge||undefined, inStock, specs });
    showToast('Product added');
  }
  saveAdminProducts(prods);
  closeAdminModal(); renderAdminContent(); filterProducts();
}

function toggleAdminStock(id) {
  const prods = getAdminProducts();
  const p = prods.find(x => x.id === id);
  if (!p) return;
  p.inStock = !p.inStock;
  saveAdminProducts(prods);
  showToast(p.name + ' is now ' + (p.inStock ? 'in stock' : 'out of stock'));
  renderAdminContent(); filterProducts();
}

function deleteAdminProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  saveAdminProducts(getAdminProducts().filter(p => p.id !== id));
  showToast('Product deleted');
  renderAdminContent(); filterProducts();
}


let adminUserSearch = '';
function renderAdminUsersTab(main) {
  const users = getStoredUsers();
  const q = adminUserSearch.toLowerCase();
  const filtered = q ? users.filter(u => (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;

  main.innerHTML = `
    <div class="admin-toolbar">
      <div class="search-wrapper">${li('search',16)}<input class="search-input" placeholder="Search users..." value="${adminUserSearch}" oninput="adminUserSearch=this.value; renderAdminContent();" /></div>
      <button class="btn btn-primary" onclick="openAdminUserModal()">${li('plus',16)} Add User</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>${filtered.length === 0 ? `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--muted-fg);">No users found</td></tr>` :
        filtered.map(u => {
          const role = u.role === 'admin' || u.email.toLowerCase() === 'anna@gmail.com' ? 'admin' : 'customer';
          return `<tr>
            <td style="font-weight:500;">${u.firstName} ${u.lastName}</td>
            <td style="color:var(--muted-fg);">${u.email}</td>
            <td><span class="badge badge-${role==='admin'?'admin':'customer'}">${role==='admin'?'Admin':'Customer'}</span></td>
            <td><div class="actions">
              <button class="btn btn-ghost btn-icon-sm" onclick="openAdminUserModal('${u.id}')" title="Edit">${li('pencil',14)}</button>
              <button class="btn btn-ghost btn-icon-sm" onclick="toggleAdminUserRole('${u.id}')" title="Toggle Role">${li(role==='admin'?'shield':'user',14)}</button>
              ${u.email.toLowerCase()!=='anna@gmail.com'?`<button class="btn btn-ghost btn-icon-sm" style="color:var(--destructive);" onclick="deleteAdminUser('${u.id}')" title="Delete">${li('trash-2',14)}</button>`:''}
            </div></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>`;
}

function openAdminUserModal(editId) {
  const users = getStoredUsers();
  const u = editId ? users.find(x => x.id === editId) : null;
  const isEdit = !!u;
  openAdminModal(isEdit ? 'Edit User' : 'Add User', isEdit ? 'Update user details' : 'Create a new user account', `
    <div class="form-row form-row-2">
      <div class="form-group"><label>First Name *</label><input class="form-input" id="au-fn" value="${u?.firstName||''}" /></div>
      <div class="form-group"><label>Last Name *</label><input class="form-input" id="au-ln" value="${u?.lastName||''}" /></div>
    </div>
    <div class="form-group"><label>Email *</label><input class="form-input" id="au-email" type="email" value="${u?.email||''}" /></div>
    <div class="form-group"><label>${isEdit?'Password (leave blank to keep)':'Password *'}</label><input class="form-input" id="au-pass" type="password" /></div>
    <div class="form-group"><label>Role</label><select class="form-input" id="au-role"><option value="customer" ${u?.role!=='admin'?'selected':''}>Customer</option><option value="admin" ${u?.role==='admin'||u?.email?.toLowerCase()==='anna@gmail.com'?'selected':''}>Admin</option></select></div>
    <div id="admin-modal-error"></div>
  `, `
    <button class="btn btn-outline" onclick="closeAdminModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAdminUser('${editId||''}')">${isEdit?'Update':'Add'}</button>
  `);
}

function saveAdminUser(editId) {
  const fn = document.getElementById('au-fn').value.trim();
  const ln = document.getElementById('au-ln').value.trim();
  const email = document.getElementById('au-email').value.trim();
  const pass = document.getElementById('au-pass').value;
  const role = document.getElementById('au-role').value;
  let errors = [];
  if (!fn) errors.push('First name is required');
  if (!ln) errors.push('Last name is required');
  if (!email) errors.push('Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email');
  if (!editId && (!pass || pass.length < 6)) errors.push('Password must be at least 6 characters');
  if (editId && pass && pass.length < 6) errors.push('Password must be at least 6 characters');
  if (errors.length) { document.getElementById('admin-modal-error').innerHTML = errors.map(e => `<p class="form-error">${e}</p>`).join(''); return; }

  const users = getStoredUsers();
  if (editId) {
    const idx = users.findIndex(u => u.id === editId);
    if (idx === -1) return;
    if (users.some((u,i) => i!==idx && u.email.toLowerCase()===email.toLowerCase())) { document.getElementById('admin-modal-error').innerHTML = '<p class="form-error">Email already exists</p>'; return; }
    users[idx].firstName = fn; users[idx].lastName = ln; users[idx].email = email; users[idx].role = role;
    if (pass) users[idx].password = pass;
    showToast('User updated');
  } else {
    if (users.some(u => u.email.toLowerCase()===email.toLowerCase())) { document.getElementById('admin-modal-error').innerHTML = '<p class="form-error">Email already exists</p>'; return; }
    users.push({ id: 'user-' + Date.now().toString(36), firstName: fn, lastName: ln, email, password: pass, role });
    showToast('User added');
  }
  saveStoredUsers(users);
  closeAdminModal(); renderAdminContent();
}

function toggleAdminUserRole(id) {
  const users = getStoredUsers();
  const u = users.find(x => x.id === id);
  if (!u) return;
  u.role = (u.role || 'customer') === 'admin' ? 'customer' : 'admin';
  saveStoredUsers(users);
  showToast(u.firstName + ' is now ' + u.role);
  renderAdminContent();
}

function deleteAdminUser(id) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  saveStoredUsers(getStoredUsers().filter(u => u.id !== id));
  showToast('User deleted');
  renderAdminContent();
}


function renderAdminProfileTab(main) {
  const isDark = document.documentElement.classList.contains('dark');
  main.innerHTML = `
    <div class="admin-profile">
      <div class="profile-card">
        <div class="profile-card-header"><h2>${li('upload',20)} Profile Photo</h2><p>Upload a profile image</p></div>
        <div class="profile-card-body" style="text-align:center;">
          <div class="admin-avatar" id="admin-avatar-preview">${adminAvatarPreview ? `<img src="${adminAvatarPreview}" alt="Avatar" />` : li('user',48)}</div>
          <label style="cursor:pointer;">
            <span class="btn btn-outline btn-sm">${li('upload',14)} Choose Image</span>
            <input type="file" accept="image/*" style="display:none;" onchange="handleAdminAvatar(event)" />
          </label>
        </div>
      </div>
      <div class="profile-card">
        <div class="profile-card-header"><h2>${li('user',20)} Personal Information</h2><p>Update your name and email</p></div>
        <div class="profile-card-body">
          <div class="form-row form-row-2">
            <div class="form-group"><label>First Name *</label><input class="form-input" id="adp-fn" value="${currentUser?.firstName||''}" oninput="validateAdminProfileField(this)" /></div>
            <div class="form-group"><label>Last Name *</label><input class="form-input" id="adp-ln" value="${currentUser?.lastName||''}" oninput="validateAdminProfileField(this)" /></div>
          </div>
          <div class="form-group"><label>Email *</label><input class="form-input" id="adp-email" type="email" value="${currentUser?.email||''}" oninput="validateAdminProfileField(this)" /></div>
        </div>
      </div>
      <div class="profile-card">
        <div class="profile-card-header"><h2>${li('lock',20)} Change Password</h2><p>Leave blank to keep current password</p></div>
        <div class="profile-card-body">
          <div class="form-group"><label>Current Password</label><input class="form-input" id="adp-curpass" type="password" oninput="validateAdminProfileField(this)" /></div>
          <div class="form-row form-row-2">
            <div class="form-group"><label>New Password</label><input class="form-input" id="adp-newpass" type="password" oninput="validateAdminProfileField(this)" /></div>
            <div class="form-group"><label>Confirm Password</label><input class="form-input" id="adp-confpass" type="password" oninput="validateAdminProfileField(this)" /></div>
          </div>
        </div>
      </div>
      <div class="profile-card">
        <div class="profile-card-header"><h2>${li(isDark?'moon':'sun',20)} Appearance</h2><p>Toggle between light and dark mode</p></div>
        <div class="profile-card-body">
          <div class="theme-toggle">
            <div class="info"><p>${isDark?'Dark Mode':'Light Mode'}</p><p>Switch your preferred theme</p></div>
            <button class="btn btn-outline" onclick="toggleAdminTheme()">${li(isDark?'sun':'moon',16)} ${isDark?'Light Mode':'Dark Mode'}</button>
          </div>
        </div>
      </div>
      <div style="text-align:center;margin-top:1rem;"><button class="btn btn-primary btn-lg" style="padding:0.75rem 3rem;" onclick="saveAdminProfile()">Save Changes</button></div>
    </div>`;
}

function handleAdminAvatar(e) {
  const file = e.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => { adminAvatarPreview = reader.result; renderAdminContent(); };
    reader.readAsDataURL(file);
  }
}

function validateAdminProfileField(el) {
  const id = el.id; const val = el.value.trim(); let error = '';
  if (id === 'adp-fn' && !val) error = 'Required';
  else if (id === 'adp-fn' && val.length < 2) error = 'At least 2 characters';
  else if (id === 'adp-ln' && !val) error = 'Required';
  else if (id === 'adp-ln' && val.length < 2) error = 'At least 2 characters';
  else if (id === 'adp-email' && !val) error = 'Required';
  else if (id === 'adp-email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) error = 'Invalid email';
  else if (id === 'adp-newpass' && val && val.length < 6) error = 'At least 6 characters';
  else if (id === 'adp-confpass') { const np = document.getElementById('adp-newpass')?.value; if (np && val !== np) error = "Passwords don't match"; }
  else if (id === 'adp-curpass') { const np = document.getElementById('adp-newpass')?.value; if (np && !val) error = 'Required'; }
  showFieldError(el, error);
}

function saveAdminProfile() {
  const fn = document.getElementById('adp-fn'), ln = document.getElementById('adp-ln'), email = document.getElementById('adp-email');
  const curPass = document.getElementById('adp-curpass'), newPass = document.getElementById('adp-newpass'), confPass = document.getElementById('adp-confpass');
  [fn, ln, email, curPass, newPass, confPass].forEach(el => validateAdminProfileField(el));
  if (document.querySelectorAll('#admin-main .is-error').length > 0) return;
  if (!fn.value.trim() || !ln.value.trim() || !email.value.trim()) return;
  const users = getStoredUsers();
  const idx = users.findIndex(u => u.id === currentUser.id);
  if (idx === -1) return;
  if (newPass.value) {
    if (!curPass.value || users[idx].password !== curPass.value) { showFieldError(curPass, 'Current password is incorrect'); return; }
    users[idx].password = newPass.value;
  }
  if (email.value.trim().toLowerCase() !== users[idx].email.toLowerCase()) {
    if (users.some((u,i) => i!==idx && u.email.toLowerCase()===email.value.trim().toLowerCase())) { showFieldError(email, 'Email already exists'); return; }
  }
  users[idx].firstName = fn.value.trim(); users[idx].lastName = ln.value.trim(); users[idx].email = email.value.trim();
  saveStoredUsers(users);
  currentUser.firstName = fn.value.trim(); currentUser.lastName = ln.value.trim(); currentUser.email = email.value.trim();
  updateAuthUI();
  showToast('Profile updated!');
  renderAdminContent();
}

function toggleAdminTheme() {
  document.documentElement.classList.toggle('dark');
  renderAdminContent();
}


function openAdminModal(title, desc, body, footer, wide) {
  const overlay = document.getElementById('admin-modal-overlay');
  const modal = document.getElementById('admin-modal');
  modal.className = 'modal' + (wide ? ' modal-lg' : '');
  modal.innerHTML = `
    <button class="modal-close" onclick="closeAdminModal()">${li('x',20)}</button>
    <h2>${title}</h2>
    <p class="desc">${desc}</p>
    ${body}
    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
  `;
  overlay.classList.add('open');
  reinitIcons();
}

function closeAdminModal() { document.getElementById('admin-modal-overlay').classList.remove('open'); }
function clearAdminModalError() { const e = document.getElementById('admin-modal-error'); if (e) e.innerHTML = ''; }


renderCategories();
filterProducts();
renderPaymentDetails();
updateAuthUI();
reinitIcons();