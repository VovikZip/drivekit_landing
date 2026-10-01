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

const modal = qs('#orderModal');
const nameInput = qs('input[name="name"]');
qsa('.js-order').forEach(btn => btn.addEventListener('click', () => {
  if (!modal.open) modal.showModal();
  setTimeout(() => nameInput?.focus(), 0);
}));
qs('#closeModal').addEventListener('click', () => modal.close());
modal.addEventListener('click', e => {
  const card = qs('.order-card');
  if (!card.contains(e.target)) modal.close();
});

const phoneInput = qs('input[name="phone"]');
phoneInput.addEventListener('input', () => {
  let digits = phoneInput.value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `38${digits}`;
  phoneInput.value = digits ? `+${digits.slice(0, 15)}` : '';
});

const form = qs('#orderForm');
const status = qs('#formStatus');
const submit = qs('#submitOrder');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.textContent = '';
  const fd = new FormData(form);
  const phone = String(fd.get('phone') || '');
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    status.textContent = 'Перевірте номер телефону.';
    phoneInput.focus();
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Відправляємо…';

  try {
    const params = new URLSearchParams(window.location.search);
    const payload = {
      name: fd.get('name'),
      phone: fd.get('phone'),
      city: fd.get('city'),
      product: fd.get('product'),
      price: fd.get('price'),
      company: fd.get('company'),
      source: params.get('utm_source') || '',
      campaign: params.get('utm_campaign') || '',
      pageUrl: window.location.href,
      referrer: document.referrer
    };

    const response = await fetch('/api/order', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = new Error('Order submit failed');
      error.status = response.status;
      throw error;
    }

    // Count a lead only after Telegram confirms delivery.
    try {
      if (typeof fbq === 'function') fbq('track', 'Lead');
    } catch (_) {}

    form.reset();
    status.textContent = 'Готово! Заявку надіслано. Ми зв’яжемося з вами.';
    submit.textContent = 'Заявку прийнято ✓';
    setTimeout(() => modal.close(), 1800);
  } catch (err) {
    console.error(err);
    status.textContent = err.status === 429
      ? 'Забагато спроб. Зачекайте хвилину й повторіть.'
      : 'Не вдалося відправити. Перевірте зв’язок і спробуйте ще раз.';
    submit.disabled = false;
    submit.textContent = 'Підтвердити замовлення';
    return;
  }

  setTimeout(() => {
    submit.disabled = false;
    submit.textContent = 'Підтвердити замовлення';
  }, 2200);
});
