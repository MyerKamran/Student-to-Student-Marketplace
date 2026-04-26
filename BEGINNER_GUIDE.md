# CampusMarket Beginner Guide

This file gives you a quick map of the project in simple words.

## 1) Big Picture

- Frontend: React + Vite (`src/`)
- Backend API: Express (`server/index.js`)
- Database: Neon Postgres (via `pg` pool in `server/db.js`)
- Auth: Google login -> session cookie

Flow:
1. User does action in UI
2. Frontend calls `/api/...`
3. Backend runs SQL query
4. Backend returns JSON
5. UI updates

---

## 2) Frontend Map (where to start)

- Routes are in `src/App.jsx`
- Pages live in `src/pages/`
- Reusable UI components live in `src/components/`
- API wrappers live in `src/api/`

### Important pages
- `Listings.jsx` -> all products
- `ListingDetail.jsx` -> one product detail
- `PostListing.jsx` / `EditListing.jsx` -> seller forms
- `Cart.jsx` -> cart + checkout
- `Orders.jsx` -> buyer/seller order actions
- `Messages.jsx` -> conversations
- `Dashboard.jsx` -> seller overview

---

## 3) Backend Map (single file)

All endpoints are in `server/index.js`.

Sections:
- Auth endpoints: `/api/auth/*`
- Products endpoints: `/api/products*`
- Cart + checkout: `/api/cart*`, `/api/orders/checkout`
- Orders management: `/api/my/orders`, `/api/orders/:id/cancel`, `/api/orders/:id/complete`
- Messages + notifications: `/api/messages`, `/api/my/messages`, `/api/notifications`
- Reviews: `/api/products/:id/reviews`

Tip: Read the file section-by-section, not top-to-bottom in one go.

---

## 4) API helpers (easy pattern)

All frontend API files now use one shared helper:

- `src/api/httpClient.js` -> `requestJson(path, options)`

So each API file only keeps feature-specific functions.  
Example: `src/api/cartClient.js` only has cart functions.

---

## 5) Useful SQL patterns already used

- `JOIN` and `LEFT JOIN` for combining tables
- `LEFT JOIN LATERAL` for "pick one best image"
- `EXISTS (...)` subquery for "is product currently ordered?"
- `WITH ...` CTE for combining buyer and seller order views
- `ON CONFLICT DO UPDATE` for upsert (cart/reviews)
- Transactions (`BEGIN/COMMIT/ROLLBACK`) for checkout and order actions

---

## 6) How to debug safely

1. Reproduce issue from UI
2. Check browser network tab (which `/api` call failed)
3. Check backend terminal error
4. Open matching endpoint in `server/index.js`
5. Verify SQL and returned shape
6. Verify frontend page expects same JSON keys

---

## 7) Running project

Use one command:

`npm run dev`

If ports are already busy, stop old node/vite terminals first.

