const state = { products: [], cart: loadCart(), category: 'All', search: '', sort: 'featured', selectedProduct: null, checkoutStep: 1, shipping: {} };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value) => `$${value.toFixed(2)}`;

function loadCart() {
  try { return JSON.parse(localStorage.getItem('aurelia-cart') || '[]'); }
  catch { showToast('Could not restore your saved bag.', 'error'); return []; }
}
function saveCart() { localStorage.setItem('aurelia-cart', JSON.stringify(state.cart)); }
function showToast(message, type = 'success') {
  const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message;
  $('#toast-region').append(toast); setTimeout(() => toast.remove(), 3500);
}
function filteredProducts() {
  const query = state.search.toLowerCase().trim();
  const result = state.products.filter((product) => (state.category === 'All' || product.category === state.category) &&
    (!query || [product.name, product.brand, product.category, product.notes].some((value) => value.toLowerCase().includes(query))));
  return result.sort((a, b) => state.sort === 'name-asc' ? a.name.localeCompare(b.name) : state.sort === 'price-asc' ? a.price - b.price : state.sort === 'price-desc' ? b.price - a.price : Number(b.featured) - Number(a.featured));
}
function renderProducts() {
  const products = filteredProducts(); const grid = $('#product-grid');
  $('#result-count').textContent = `${products.length} ${products.length === 1 ? 'fragrance' : 'fragrances'}`;
  grid.innerHTML = products.map((product) => `<article class="product-card"><div class="product-image" data-product="${product.id}" tabindex="0" role="button" aria-label="View ${product.name}"><img src="${product.image}" alt="${product.name} by ${product.brand}" loading="lazy"><span class="product-badge">${product.category}</span><span class="quick-view">View details</span></div><h3>${product.name}</h3><span class="product-brand">${product.brand}</span><p class="product-description">${product.description}</p><div class="product-bottom"><span class="price">${money(product.price)}</span><button class="add-button" data-add="${product.id}">Add to bag</button></div></article>`).join('');
  $('#empty-state').hidden = products.length > 0;
  $$('.product-image').forEach((element) => { element.addEventListener('click', () => openProduct(element.dataset.product)); element.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') openProduct(element.dataset.product); }); });
  $$('[data-add]').forEach((button) => button.addEventListener('click', () => addToCart(button.dataset.add)));
}
function openProduct(id) {
  const product = state.products.find((item) => item.id === id); if (!product) return;
  state.selectedProduct = product; $('#modal-product-image').style.backgroundImage = `url("${product.image}")`;
  $('#modal-product-category').textContent = product.category; $('#modal-product-name').textContent = product.name; $('#modal-product-brand').textContent = product.brand;
  $('#modal-product-description').textContent = product.description; $('#modal-product-notes').textContent = product.notes; $('#modal-product-price').textContent = money(product.price); $('#modal-quantity').value = 1;
  $('#product-modal').hidden = false; document.body.classList.add('modal-open'); $('#modal-add-button').focus();
}
function closeModal() { $('#product-modal').hidden = true; document.body.classList.remove('modal-open'); }
function addToCart(id, quantity = 1) {
  const product = state.products.find((item) => item.id === id); if (!product) return;
  const existing = state.cart.find((item) => item.id === id); existing ? existing.quantity += quantity : state.cart.push({ id, quantity });
  saveCart(); updateCartCount(); renderCart(); showToast(`${product.name} added to your bag.`);
}
function updateCartCount() { const count = state.cart.reduce((total, item) => total + item.quantity, 0); $('#cart-count').textContent = count; $('#floating-bag-count').textContent = count; }
function cartDetails() { return state.cart.map((item) => ({ ...item, product: state.products.find((product) => product.id === item.id) })).filter((item) => item.product); }
function renderCart() {
  const items = cartDetails(); const content = $('#cart-content'); const footer = $('#cart-footer');
  if (!items.length) { content.innerHTML = '<div class="cart-empty"><strong>Your bag is waiting.</strong><p>Add a fragrance to begin your collection.</p></div>'; footer.innerHTML = ''; return; }
  content.innerHTML = items.map(({ product, quantity }) => `<div class="cart-line"><div class="cart-line-image" style="background-image:url('${product.image}')"></div><div><h3>${product.name}</h3><small>${product.brand}</small><div class="quantity-control"><button data-quantity="${product.id}" data-change="-1" aria-label="Decrease quantity">−</button><span>${quantity}</span><button data-quantity="${product.id}" data-change="1" aria-label="Increase quantity">+</button></div><button class="remove-link" data-remove="${product.id}">Remove</button></div><span class="cart-line-price">${money(product.price * quantity)}</span></div>`).join('');
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  footer.innerHTML = `<div class="cart-total"><span>Total</span><strong>${money(total)}</strong></div><button class="button button-dark full-width" id="checkout-button">Continue to checkout</button>`;
  $$('[data-quantity]').forEach((button) => button.addEventListener('click', () => changeQuantity(button.dataset.quantity, Number(button.dataset.change))));
  $$('[data-remove]').forEach((button) => button.addEventListener('click', () => confirmAction('Remove this fragrance?', 'It will be removed from your shopping bag.', () => removeFromCart(button.dataset.remove))));
  $('#checkout-button').addEventListener('click', startCheckout);
}
function changeQuantity(id, change) { const item = state.cart.find((entry) => entry.id === id); if (!item) return; item.quantity += change; if (item.quantity < 1) item.quantity = 1; saveCart(); updateCartCount(); renderCart(); showToast('Bag updated successfully.', 'info'); }
function removeFromCart(id) { state.cart = state.cart.filter((item) => item.id !== id); saveCart(); updateCartCount(); renderCart(); showToast('Item removed from your bag.', 'info'); }
function toggleCart(open) { $('#cart-drawer').classList.toggle('open', open); $('#cart-drawer').setAttribute('aria-hidden', String(!open)); $('#drawer-backdrop').hidden = !open; if (open) $('#close-cart').focus(); }
function confirmAction(title, message, action) { $('#confirmation-title').textContent = title; $('#confirmation-message').textContent = message; $('#confirmation-modal').hidden = false; const confirm = $('#confirmation-confirm'); confirm.onclick = () => { $('#confirmation-modal').hidden = true; action(); }; $('#confirmation-cancel').onclick = () => { $('#confirmation-modal').hidden = true; }; confirm.focus(); }
function updateProgress(step) { state.checkoutStep = step; $$('.progress-step').forEach((element) => { const current = Number(element.dataset.step); element.classList.toggle('active', current === step); element.classList.toggle('complete', current < step); }); $('.progress-line span').style.width = `${(step - 1) * 33.33}%`; }
function summaryMarkup() { const items = cartDetails(); const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0); return `<h2>Your order</h2>${items.map(({ product, quantity }) => `<div class="summary-line"><span>${product.name} × ${quantity}</span><strong>${money(product.price * quantity)}</strong></div>`).join('')}<div class="summary-line"><span>Delivery</span><strong>${total >= 150 ? 'Complimentary' : money(12)}</strong></div><div class="summary-line summary-total"><span>Total</span><strong>${money(total >= 150 ? total : total + 12)}</strong></div>`; }
function startCheckout() { if (!state.cart.length) return; toggleCart(false); $('#checkout-view').hidden = false; document.querySelector('main').hidden = true; $('.site-header').hidden = true; $('.footer').hidden = true; updateProgress(2); renderCheckoutStep(); window.scrollTo(0, 0); }
function renderCheckoutStep() {
  $('#order-summary').innerHTML = summaryMarkup(); const main = $('#checkout-main');
  if (state.checkoutStep === 2) main.innerHTML = `<h1>Shipping information</h1><p>Where should we send your carefully wrapped fragrance?</p><form class="checkout-form" id="shipping-form"><div class="form-field"><label for="first-name">First name</label><input id="first-name" name="first-name" required></div><div class="form-field"><label for="last-name">Last name</label><input id="last-name" name="last-name" required></div><div class="form-field full"><label for="address">Address</label><input id="address" name="address" required></div><div class="form-field"><label for="city">City</label><input id="city" name="city" required></div><div class="form-field"><label for="postal">Postal code</label><input id="postal" name="postal" required></div><div class="form-field full"><label for="email">Email address</label><input id="email" name="email" type="email" required></div><button class="button button-dark" type="submit">Review order <span>→</span></button></form>`;
  if (state.checkoutStep === 3) main.innerHTML = `<h1>Review your order</h1><p>Please confirm your details before placing your order. You will not be charged in this demonstration.</p><div class="review-card"><p><strong>Shipping to</strong><br>${state.shipping.firstName} ${state.shipping.lastName}<br>${state.shipping.address}<br>${state.shipping.city}, ${state.shipping.postal}</p><p><strong>Email</strong><br>${state.shipping.email}</p></div><button class="button button-dark" id="place-order">Place order <span>→</span></button>`;
  if (state.checkoutStep === 4) main.innerHTML = `<div class="success-screen"><div class="confirm-mark">✓</div><h1>Order confirmed.</h1><p>Thank you for choosing Aurelia. A confirmation has been sent to your inbox.</p><a href="#shop" class="button button-dark" id="continue-shopping">Continue shopping</a></div>`;
  if (state.checkoutStep === 2) $('#shipping-form').addEventListener('submit', (event) => { event.preventDefault(); if (!event.target.checkValidity()) { event.target.reportValidity(); return; } const form = new FormData(event.target); state.shipping = { firstName: form.get('first-name'), lastName: form.get('last-name'), address: form.get('address'), city: form.get('city'), postal: form.get('postal'), email: form.get('email') }; updateProgress(3); renderCheckoutStep(); });
  if (state.checkoutStep === 3) $('#place-order').addEventListener('click', () => confirmAction('Place your order?', 'This demonstration order will be finalized without payment.', () => { state.cart = []; saveCart(); updateCartCount(); updateProgress(4); renderCheckoutStep(); showToast('Order placed successfully!'); }));
  if (state.checkoutStep === 4) $('#continue-shopping').addEventListener('click', closeCheckout);
}
function closeCheckout(event) { if (event) event.preventDefault(); $('#checkout-view').hidden = true; document.querySelector('main').hidden = false; $('.site-header').hidden = false; $('.footer').hidden = false; window.location.hash = 'shop'; }
async function loadProducts() {
  try { const response = await fetch('data/products.json'); if (!response.ok) throw new Error(`Catalog request failed with ${response.status}`); state.products = await response.json(); renderProducts(); renderCart(); updateCartCount(); }
  catch (error) { $('#product-grid').innerHTML = '<div class="empty-state"><div class="empty-icon">!</div><h3>Catalog unavailable</h3><p>Please run this site through a local web server and try again.</p></div>'; showToast('We could not load the fragrance catalog.', 'error'); console.error(error); }
}
function bindEvents() {
  $('#search-input').addEventListener('input', (event) => { state.search = event.target.value; $('#clear-search').hidden = !state.search; renderProducts(); });
  $('#clear-search').addEventListener('click', () => { $('#search-input').value = ''; state.search = ''; $('#clear-search').hidden = true; renderProducts(); $('#search-input').focus(); });
  $$('.filter-button').forEach((button) => button.addEventListener('click', () => { $$('.filter-button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); state.category = button.dataset.category; renderProducts(); }));
  $('#sort-select').addEventListener('change', (event) => { state.sort = event.target.value; renderProducts(); });
  $('#reset-filters').addEventListener('click', () => { state.category = 'All'; state.search = ''; $('#search-input').value = ''; $$('.filter-button').forEach((item) => item.classList.toggle('active', item.dataset.category === 'All')); renderProducts(); });
  $$('.collection-card').forEach((card) => card.addEventListener('click', () => { $('#shop').scrollIntoView(); $(`[data-category="${card.dataset.collection}"]`).click(); }));
  $('#cart-button').addEventListener('click', () => toggleCart(true)); $('#floating-bag').addEventListener('click', () => toggleCart(true)); $('#close-cart').addEventListener('click', () => toggleCart(false)); $('#drawer-backdrop').addEventListener('click', () => toggleCart(false));
  $('#modal-add-button').addEventListener('click', () => { addToCart(state.selectedProduct.id, Number($('#modal-quantity').value)); closeModal(); });
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal)); $('#product-modal').addEventListener('click', (event) => { if (event.target === $('#product-modal')) closeModal(); });
  $('#header-search-button').addEventListener('click', () => { $('#shop').scrollIntoView(); setTimeout(() => $('#search-input').focus(), 400); });
  $('#menu-toggle').addEventListener('click', () => { const links = $('#nav-links'); const isOpen = links.classList.toggle('open'); $('#menu-toggle').setAttribute('aria-expanded', String(isOpen)); });
  $('#back-to-shop').addEventListener('click', closeCheckout);
}
bindEvents(); loadProducts();
