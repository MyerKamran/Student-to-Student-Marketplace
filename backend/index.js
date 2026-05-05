import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pool } from './db.js';
import { createAuthRoutes } from './routes/auth.js';
import { createAdminRoutes } from './routes/admin.js';
import { createCatalogRoutes } from './routes/catalog.js';
import { createMyProductsRoutes } from './routes/myProducts.js';
import { createCartOrdersRoutes } from './routes/cartOrders.js';
import { createMessagesRoutes } from './routes/messages.js';
import { createReviewsRoutes } from './routes/reviews.js';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

async function ensureOptionalColumns() {
  await pool.query(`
    alter table users add column if not exists occupation text default 'Student';
    alter table users add column if not exists phone_number text;
    alter table users add column if not exists bio text;
    alter table users add column if not exists password text;
    alter table users alter column password type text using password::text;
    alter table products add column if not exists contact_preference text default 'In-app Message';
  `);

  await pool.query(`
    create or replace view product_order_stats as
    select
      oi.product_id,
      sum(oi.quantity) filter (where o.status in ('pending','confirmed','completed')) as sold_qty,
      sum(oi.quantity * oi.unit_price) filter (where o.status in ('pending','confirmed','completed')) as earned,
      count(*) filter (where o.status in ('pending','confirmed')) as open_orders
    from order_items oi
    join orders o on o.order_id = oi.order_id
    group by oi.product_id;
  `);

  await pool.query(`
    create or replace view product_primary_images as
    select distinct on (pi.product_id)
      pi.product_id,
      pi.image_url
    from product_images pi
    order by pi.product_id, pi.is_primary desc, pi.image_id asc;
  `);

  await pool.query(`
   create or replace function prevent_negative_stock_qty()
returns trigger language plpgsql as $$
begin
    if new.stock_qty < 0 then
        raise exception 'stock_qty cannot be negative';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_prevent_negative_stock_qty on products;
create trigger trg_prevent_negative_stock_qty
before insert or update on products
for each row execute function prevent_negative_stock_qty();
  `);
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('select 1 as ok;');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

app.use('/api', createAuthRoutes());
app.use('/api', createAdminRoutes());
app.use('/api', createCatalogRoutes());
app.use('/api', createMyProductsRoutes());
app.use('/api', createCartOrdersRoutes());
app.use('/api', createMessagesRoutes());
app.use('/api', createReviewsRoutes());

const port = Number(process.env.PORT) || 8787;
if (!process.env.DATABASE_URL) {
  console.warn('Missing DATABASE_URL. Create a .env file (copy from .env.example).');
}
if (!process.env.JWT_SECRET) {
  console.warn('Missing JWT_SECRET. Add it to .env');
}
if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('Missing GOOGLE_CLIENT_ID. Add it to .env');
}

await ensureOptionalColumns();

const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

server.on('error', (err) => {
  console.error('API server error:', err);
});

process.stdin.resume();
