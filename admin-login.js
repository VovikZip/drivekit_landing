const form = document.querySelector('#loginForm');
const status = document.querySelector('#loginStatus');

fetch('/api/admin/session').then(response => {
  if (response.ok) location.replace('./admin.html');
}).catch(() => {});

form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = '';
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Перевіряємо…';
  const data = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Не вдалося увійти');
    location.replace('./admin.html');
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
    button.textContent = 'Увійти';
  }
});
