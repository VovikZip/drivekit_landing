const state = {products: [], categories: []};
const qs = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const money = value => `${Number(value || 0).toLocaleString('uk-UA')} ₴`;

async function api(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    location.replace('./admin-login.html');
    throw new Error('Unauthorized');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Помилка запиту');
  return data;
}

function showStatus(message, error = false) {
  const element = qs('#adminStatus');
  element.textContent = message;
  element.classList.toggle('error', error);
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => element.textContent = '', 3500);
}

async function loadData() {
  try {
    const [products, categories] = await Promise.all([
      api('/api/admin/products'), api('/api/admin/categories')
    ]);
    state.products = products.products || [];
    state.categories = categories.categories || [];
    renderProducts();
    renderCategories();
    renderCategoryOptions();
  } catch (error) {
    if (error.message !== 'Unauthorized') showStatus(error.message, true);
  }
}

function renderProducts() {
  qs('#productsTable').innerHTML = state.products.length ? state.products.map(product => `
    <tr>
      <td><div class="admin-product"><img src="${escapeHtml(product.image_url)}" alt=""><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.slug)}</small></div></div></td>
      <td>${escapeHtml(product.category?.name || '—')}</td>
      <td>${money(product.price)}</td>
      <td>${Number(product.stock)}</td>
      <td><span class="status-pill ${product.active ? 'active' : ''}">${product.active ? 'Активний' : 'Прихований'}</span></td>
      <td><div class="row-actions"><button type="button" data-edit-product="${product.id}">Редагувати</button><button class="danger" type="button" data-delete-product="${product.id}">Видалити</button></div></td>
    </tr>`).join('') : '<tr><td colspan="6">Товарів ще немає.</td></tr>';
}

function renderCategories() {
  qs('#categoryList').innerHTML = state.categories.map(category => `
    <div><span><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.slug)}</small></span><span class="row-actions"><button type="button" data-edit-category="${category.id}">Редагувати</button><button class="danger" type="button" data-delete-category="${category.id}">Видалити</button></span></div>`).join('') || '<p>Категорій ще немає.</p>';
}

function renderCategoryOptions() {
  qs('#productCategory').innerHTML = '<option value="">Без категорії</option>' + state.categories.map(category => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join('');
}

function openProduct(product = null) {
  const form = qs('#productForm');
  form.reset();
  form.elements.id.value = product?.id || '';
  form.elements.name.value = product?.name || '';
  form.elements.price.value = product?.price ?? '';
  form.elements.compare_price.value = product?.compare_price ?? '';
  form.elements.category_id.value = product?.category_id || '';
  form.elements.stock.value = product?.stock ?? 0;
  form.elements.sort_order.value = product?.sort_order ?? 100;
  form.elements.active.checked = product ? Boolean(product.active) : true;
  form.elements.description.value = product?.description || '';
  form.elements.image_url.value = product?.image_url || '';
  qs('#productFormTitle').textContent = product ? 'Редагувати товар' : 'Новий товар';
  qs('#productStatus').textContent = '';
  qs('#productEditor').showModal();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.addEventListener('click', async event => {
  const editProduct = event.target.closest('[data-edit-product]');
  if (editProduct) openProduct(state.products.find(item => item.id === editProduct.dataset.editProduct));

  const deleteProduct = event.target.closest('[data-delete-product]');
  if (deleteProduct && confirm('Видалити цей товар?')) {
    try {
      await api('/api/admin/products', {method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:deleteProduct.dataset.deleteProduct})});
      showStatus('Товар видалено');
      await loadData();
    } catch (error) { showStatus(error.message, true); }
  }

  const editCategory = event.target.closest('[data-edit-category]');
  if (editCategory) {
    const category = state.categories.find(item => item.id === editCategory.dataset.editCategory);
    const form = qs('#categoryForm');
    form.elements.id.value = category.id;
    form.elements.name.value = category.name;
    form.elements.sort_order.value = category.sort_order;
    qs('#cancelCategory').hidden = false;
  }

  const deleteCategory = event.target.closest('[data-delete-category]');
  if (deleteCategory && confirm('Видалити категорію? Товари залишаться без категорії.')) {
    try {
      await api('/api/admin/categories', {method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:deleteCategory.dataset.deleteCategory})});
      showStatus('Категорію видалено');
      await loadData();
    } catch (error) { showStatus(error.message, true); }
  }

  const tab = event.target.closest('[data-admin-tab]');
  if (tab) {
    document.querySelectorAll('[data-admin-tab]').forEach(item => item.classList.toggle('active', item === tab));
    qs('#productsPanel').hidden = tab.dataset.adminTab !== 'products';
    qs('#categoriesPanel').hidden = tab.dataset.adminTab !== 'categories';
    qs('#newProduct').hidden = tab.dataset.adminTab !== 'products';
  }
});

qs('#newProduct').addEventListener('click', () => openProduct());
qs('#closeProductEditor').addEventListener('click', () => qs('#productEditor').close());
qs('#cancelProduct').addEventListener('click', () => qs('#productEditor').close());
qs('#cancelCategory').addEventListener('click', () => {
  qs('#categoryForm').reset();
  qs('#categoryForm').elements.id.value = '';
  qs('#cancelCategory').hidden = true;
});

qs('#productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = qs('#productStatus');
  button.disabled = true;
  status.textContent = 'Зберігаємо…';
  try {
    let imageUrl = form.elements.image_url.value;
    const file = form.elements.image_file.files[0];
    if (file) {
      const uploaded = await api('/api/admin/upload', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({mime:file.type,data:await fileToDataUrl(file)})
      });
      imageUrl = uploaded.url;
    }
    if (!imageUrl) throw new Error('Додайте фото або URL зображення');
    const data = Object.fromEntries(new FormData(form));
    data.image_url = imageUrl;
    data.active = form.elements.active.checked;
    const method = data.id ? 'PATCH' : 'POST';
    await api('/api/admin/products', {method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    qs('#productEditor').close();
    showStatus(data.id ? 'Товар оновлено' : 'Товар створено');
    await loadData();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

qs('#categoryForm').addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api('/api/admin/categories', {method:data.id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    event.currentTarget.reset();
    event.currentTarget.elements.id.value = '';
    qs('#cancelCategory').hidden = true;
    showStatus(data.id ? 'Категорію оновлено' : 'Категорію створено');
    await loadData();
  } catch (error) { showStatus(error.message, true); }
});

qs('#logout').addEventListener('click', async () => {
  await fetch('/api/admin/logout', {method:'POST'});
  location.replace('./admin-login.html');
});

api('/api/admin/session').then(loadData).catch(() => {});
