const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];

const topbar = qs('.topbar');
window.addEventListener('scroll', () => topbar.classList.toggle('scrolled', window.scrollY > 18), {passive:true});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {threshold:.12});
qsa('.reveal').forEach(el => observer.observe(el));

const featureImage = qs('#featureImage');
function switchImage(url) {
  if (!featureImage || !url) return;
  featureImage.classList.add('switching');
  setTimeout(() => {
    featureImage.src = url;
    featureImage.classList.remove('switching');
  }, 130);
}
qsa('.thumb').forEach(btn => {
  btn.addEventListener('click', () => {
    qsa('.thumb').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchImage(btn.dataset.img);
  });
});
qsa('.feature-row').forEach(btn => {
  btn.addEventListener('click', () => {
    qsa('.feature-row').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchImage(btn.dataset.img);
  });
});

const stage = qs('.js-parallax');
if (stage && window.matchMedia('(pointer:fine)').matches) {
  stage.addEventListener('mousemove', e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width - .5;
    const y = (e.clientY-r.top)/r.height - .5;
    stage.style.transform = `perspective(1000px) rotateY(${x*4}deg) rotateX(${-y*3}deg)`;
  });
  stage.addEventListener('mouseleave', () => stage.style.transform = '');
}

qsa('img[data-fallback]').forEach(img => {
  img.addEventListener('error', () => {
    if (img.dataset.fallback && img.src !== img.dataset.fallback) img.src = img.dataset.fallback;
  });
});

const FALLBACK_PRODUCT = {
  id: 'drivekit-gl-965a',
  name: 'DRIVEKIT GL-965A 4-в-1',
  price: 2190,
  description: 'Пускозарядний пристрій, компресор до 150 PSI, Power Bank та LED-ліхтар.',
  category_id: 'auto-help',
  category: {id: 'auto-help', name: 'Автодопомога', slug: 'auto-help'},
  image_url: 'https://drops.in.ua/img/p/132259953/0.webp',
  stock: 20,
  active: true
};

const store = {
  products: [FALLBACK_PRODUCT],
  categories: [{id: 'auto-help', name: 'Автодопомога', slug: 'auto-help'}],
  activeCategory: 'all',
  cart: loadCart()
};

const money = value => `${Number(value || 0).toLocaleString('uk-UA')} ₴`;
const cartModal = qs('#cartModal');
const checkoutModal = qs('#checkoutModal');
const cartItems = qs('#cartItems');
const cartEmpty = qs('#cartEmpty');
const cartFooter = qs('#cartFooter');
const form = qs('#orderForm');
const status = qs('#formStatus');
const submit = qs('#submitOrder');
const phoneInput = qs('input[name="phone"]');

function loadCart() {
  try {
    const value = JSON.parse(localStorage.getItem('drivekit_cart') || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function saveCart() {
  localStorage.setItem('drivekit_cart', JSON.stringify(store.cart));
  renderCart();
}

function productById(id) {
  return store.products.find(product => String(product.id) === String(id));
}

function cartDetails() {
  return store.cart.map(item => ({...item, product: productById(item.id)})).filter(item => item.product);
}

function cartTotalValue() {
  return cartDetails().reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
}

function addToCart(id, open = true) {
  const product = productById(id);
  if (!product || Number(product.stock) < 1) return;
  const existing = store.cart.find(item => String(item.id) === String(id));
  if (existing) existing.quantity = Math.min(Number(product.stock), existing.quantity + 1);
  else store.cart.push({id: String(id), quantity: 1});
  saveCart();
  if (open && !cartModal.open) cartModal.showModal();
}

function setQuantity(id, nextQuantity) {
  const product = productById(id);
  if (!product) return;
  if (nextQuantity <= 0) store.cart = store.cart.filter(item => String(item.id) !== String(id));
  else {
    const item = store.cart.find(entry => String(entry.id) === String(id));
    if (item) item.quantity = Math.min(Number(product.stock), nextQuantity);
  }
  saveCart();
}

function renderCart() {
  const details = cartDetails();
  const count = details.reduce((sum, item) => sum + item.quantity, 0);
  qs('#cartCount').textContent = count;
  cartEmpty.hidden = details.length > 0;
  cartFooter.hidden = details.length === 0;
  cartItems.innerHTML = details.map(({product, quantity}) => `
    <article class="cart-item">
      <img src="${escapeHtml(product.image_url)}" alt="">
      <div class="cart-item-copy">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${money(product.price)}</span>
        <div class="quantity-control">
          <button type="button" data-cart-action="minus" data-id="${escapeHtml(product.id)}" aria-label="Зменшити">−</button>
          <b>${quantity}</b>
          <button type="button" data-cart-action="plus" data-id="${escapeHtml(product.id)}" aria-label="Збільшити">+</button>
          <button class="remove-item" type="button" data-cart-action="remove" data-id="${escapeHtml(product.id)}">Видалити</button>
        </div>
      </div>
    </article>`).join('');
  qs('#cartTotal').textContent = money(cartTotalValue());
  qs('#checkoutTotal').textContent = money(cartTotalValue());
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function renderCategories() {
  qs('#categoryTabs').innerHTML = [
    {id: 'all', name: 'Усі товари'},
    ...store.categories
  ].map(category => `<button class="category-tab ${store.activeCategory === String(category.id) ? 'active' : ''}" type="button" data-category="${escapeHtml(category.id)}">${escapeHtml(category.name)}</button>`).join('');
}

function renderProducts() {
  const products = store.activeCategory === 'all'
    ? store.products
    : store.products.filter(product => String(product.category_id) === store.activeCategory);
  qs('#productGrid').innerHTML = products.length ? products.map(product => `
    <article class="product-card">
      <div class="product-card-image"><img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy"></div>
      <div class="product-card-body">
        <small>${escapeHtml(product.category?.name || 'DRIVEKIT')}</small>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description || '')}</p>
        <div class="product-card-bottom">
          <strong>${money(product.price)}</strong>
          <button class="btn" type="button" data-add-cart="${escapeHtml(product.id)}" ${Number(product.stock) < 1 ? 'disabled' : ''}>
            ${Number(product.stock) < 1 ? 'Немає в наявності' : 'У кошик'}
          </button>
        </div>
      </div>
    </article>`).join('') : '<div class="catalog-loading">У цій категорії поки немає товарів.</div>';
}

async function loadCatalog() {
  try {
    const [productsResponse, categoriesResponse] = await Promise.all([
      fetch('/api/products'), fetch('/api/categories')
    ]);
    if (!productsResponse.ok || !categoriesResponse.ok) throw new Error('Catalog request failed');
    const productsData = await productsResponse.json();
    const categoriesData = await categoriesResponse.json();
    store.products = productsData.products?.length ? productsData.products : [FALLBACK_PRODUCT];
    store.categories = categoriesData.categories?.length ? categoriesData.categories : store.categories;
    store.cart = store.cart.filter(item => productById(item.id));
  } catch (error) {
    console.warn('Using fallback catalog', error);
  }
  renderCategories();
  renderProducts();
  saveCart();
}

document.addEventListener('click', event => {
  const addButton = event.target.closest('[data-add-cart]');
  if (addButton) addToCart(addButton.dataset.addCart);

  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) {
    store.activeCategory = categoryButton.dataset.category;
    renderCategories();
    renderProducts();
  }

  const actionButton = event.target.closest('[data-cart-action]');
  if (actionButton) {
    const item = store.cart.find(entry => String(entry.id) === actionButton.dataset.id);
    if (!item) return;
    const action = actionButton.dataset.cartAction;
    setQuantity(item.id, action === 'plus' ? item.quantity + 1 : action === 'minus' ? item.quantity - 1 : 0);
  }

  const closeButton = event.target.closest('[data-close]');
  if (closeButton) qs(`#${closeButton.dataset.close}`)?.close();
});

qsa('.js-order').forEach(button => button.addEventListener('click', () => addToCart(FALLBACK_PRODUCT.id)));
qs('#openCart').addEventListener('click', () => cartModal.showModal());
qs('#startCheckout').addEventListener('click', () => {
  if (!cartDetails().length) return;
  cartModal.close();
  qs('#checkoutTotal').textContent = money(cartTotalValue());
  checkoutModal.showModal();
  setTimeout(() => qs('input[name="customerName"]')?.focus(), 0);
});

[cartModal, checkoutModal].forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));

phoneInput.addEventListener('input', () => {
  let digits = phoneInput.value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `38${digits}`;
  phoneInput.value = digits ? `+${digits.slice(0, 15)}` : '';
});

qsa('input[name="carrier"]').forEach(input => input.addEventListener('change', () => {
  const nova = qs('input[name="carrier"]:checked').value === 'nova';
  qs('#novaFields').hidden = !nova;
  qs('#ukrFields').hidden = nova;
}));

let cityTimer;
qs('#novaCity').addEventListener('input', event => {
  qs('#novaCityRef').value = '';
  qs('#novaWarehouse').innerHTML = '<option value="">Спочатку оберіть місто</option>';
  qs('#novaWarehouse').disabled = true;
  clearTimeout(cityTimer);
  const query = event.target.value.trim();
  if (query.length < 2) {
    qs('#citySuggestions').innerHTML = '';
    return;
  }
  cityTimer = setTimeout(() => searchCities(query), 350);
});

async function novaRequest(payload) {
  const response = await fetch('/api/shipping/nova-poshta', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Nova Poshta request failed');
  return data.items || [];
}

async function searchCities(query) {
  const suggestions = qs('#citySuggestions');
  suggestions.innerHTML = '<div class="suggestion-note">Шукаємо…</div>';
  try {
    const cities = await novaRequest({action: 'cities', query});
    suggestions.innerHTML = cities.map(city => `<button type="button" data-city-ref="${escapeHtml(city.ref)}" data-city-label="${escapeHtml(city.label)}">${escapeHtml(city.label)}</button>`).join('') || '<div class="suggestion-note">Нічого не знайдено</div>';
  } catch (error) {
    suggestions.innerHTML = `<div class="suggestion-note">${escapeHtml(error.message)}</div>`;
  }
}

qs('#citySuggestions').addEventListener('click', async event => {
  const button = event.target.closest('[data-city-ref]');
  if (!button) return;
  qs('#novaCity').value = button.dataset.cityLabel;
  qs('#novaCityRef').value = button.dataset.cityRef;
  qs('#citySuggestions').innerHTML = '';
  const select = qs('#novaWarehouse');
  select.disabled = true;
  select.innerHTML = '<option value="">Завантажуємо відділення…</option>';
  try {
    const warehouses = await novaRequest({action: 'warehouses', cityRef: button.dataset.cityRef});
    select.innerHTML = '<option value="">Оберіть відділення</option>' + warehouses.map(item => `<option value="${escapeHtml(item.label)}">${escapeHtml(item.label)}</option>`).join('');
    select.disabled = false;
  } catch (error) {
    select.innerHTML = `<option value="">${escapeHtml(error.message)}</option>`;
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = '';
  const fd = new FormData(form);
  const phoneDigits = String(fd.get('phone') || '').replace(/\D/g, '');
  const carrier = String(fd.get('carrier') || 'nova');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    status.textContent = 'Перевірте номер телефону.';
    phoneInput.focus();
    return;
  }
  if (carrier === 'nova' && (!qs('#novaCityRef').value || !qs('#novaWarehouse').value)) {
    status.textContent = 'Оберіть місто та відділення зі списку.';
    return;
  }
  if (carrier === 'ukr' && qs('#ukrAddress').value.trim().length < 8) {
    status.textContent = 'Вкажіть повну адресу доставки Укрпоштою.';
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Оформлюємо…';
  const params = new URLSearchParams(location.search);
  const submittedTotal = cartTotalValue();
  try {
    const response = await fetch('/api/order', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        customerName: fd.get('customerName'),
        phone: fd.get('phone'),
        company: fd.get('company'),
        delivery: {
          carrier,
          city: qs('#novaCity').value,
          cityRef: qs('#novaCityRef').value,
          warehouse: qs('#novaWarehouse').value,
          address: qs('#ukrAddress').value
        },
        items: store.cart.map(item => ({id: item.id, quantity: item.quantity})),
        source: params.get('utm_source') || '',
        campaign: params.get('utm_campaign') || ''
      })
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || 'Не вдалося оформити замовлення'), {status: response.status});

    store.cart = [];
    saveCart();
    form.reset();
    qs('#novaFields').hidden = false;
    qs('#ukrFields').hidden = true;
    status.textContent = 'Готово! Замовлення прийнято. Ми зв’яжемося з вами.';
    submit.textContent = 'Замовлення прийнято ✓';
    try { if (typeof fbq === 'function') fbq('track', 'Purchase', {value: submittedTotal, currency: 'UAH'}); } catch (_) {}
    setTimeout(() => checkoutModal.close(), 2200);
  } catch (error) {
    console.error(error);
    status.textContent = error.status === 429 ? 'Забагато спроб. Зачекайте хвилину.' : error.message;
  } finally {
    setTimeout(() => {
      submit.disabled = false;
      submit.textContent = 'Підтвердити замовлення';
    }, 2300);
  }
});

renderCart();
renderCategories();
renderProducts();
loadCatalog();
