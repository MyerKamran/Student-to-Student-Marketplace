-- Reviews table (minimal)
-- Run this in Neon SQL editor.

create table if not exists reviews (
  review_id bigserial primary key,
  product_id bigint not null references products(product_id) on delete cascade,
  reviewer_id bigint not null references users(user_id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  -- one review per user per product keeps it simple
  unique (product_id, reviewer_id)
);
