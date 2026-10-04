# DRIVEKIT store

Магазин без покупецьких акаунтів: каталог, категорії, кошик у браузері, checkout,
Нова пошта / Укрпошта, Telegram-сповіщення та захищена адмін-панель.

## Що реалізовано

- каталог і фільтри за категоріями;
- кошик у `localStorage`, зміна кількості й серверний перерахунок вартості;
- оформлення: ПІБ, телефон, перевізник і адреса;
- офіційний API Нової пошти: пошук міста й вибір відділення/поштомата;
- проста адреса для Укрпошти;
- Telegram-сповіщення та резервне збереження замовлень у Supabase;
- прихований вхід у футері та окрема адмін-панель;
- створення, редагування й видалення категорій і товарів;
- ціна, стара ціна, залишок, активність, порядок і категорія товару;
- завантаження JPG/PNG/WEBP до Supabase Storage;
- `HttpOnly`, `SameSite=Strict`, підписана адмін-сесія та обмеження спроб входу.

## 1. Supabase

1. Створіть проєкт у Supabase.
2. Відкрийте SQL Editor.
3. Виконайте весь файл `supabase-schema.sql`.
4. У Project Settings → API скопіюйте Project URL та `service_role` key.

`service_role` — секретний ключ. Він має бути лише у Vercel Environment Variables.
Його не можна додавати у браузерний JavaScript або Git.

## 2. Нова пошта

Створіть API key у бізнес-кабінеті Нової пошти. Сайт звертається до офіційного
endpoint `https://api.novaposhta.ua/v2.0/json/` тільки через Vercel Function,
тому ключ не потрапляє у браузер.

## 3. Vercel Environment Variables

У Vercel → Project → Settings → Environment Variables додайте:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
NOVA_POSHTA_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_LOGIN
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

Для `ADMIN_PASSWORD` використайте унікальний довгий пароль. Для
`ADMIN_SESSION_SECRET` — випадковий рядок щонайменше з 32 символів.
Приклад назв без реальних секретів є у `.env.example`.

Після додавання змінних зробіть новий Deploy.

## 4. Вхід в адмінку

У правому нижньому куті футера є малопомітна службова точка. Вона відкриває
`/admin-login.html`. Приховане посилання — лише зручність, не механізм безпеки;
всі `/api/admin/*` endpoints перевіряють захищену сесію.

## 5. Локальний запуск

Статичну частину можна переглянути будь-яким HTTP server, наприклад:

```powershell
python -m http.server 4173
```

Vercel Functions локально потребують Vercel CLI та локального `.env.local`.
`.env.local` і всі `.env.*` (крім `.env.example`) ігноруються Git.

## Перевірки

```powershell
node --check app.js
node --check admin.js
node tests/smoke.js
```

## Перед рекламою

- перевипустити раніше опублікований Telegram bot token;
- підтвердити право використання фото постачальника;
- додати реальні умови оплати, доставки, гарантії та повернення;
- додати дані продавця і політику конфіденційності;
- виконати тестове замовлення окремо Новою поштою й Укрпоштою;
- перевірити каталог і checkout на реальному телефоні.
