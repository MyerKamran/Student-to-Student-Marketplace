export function qPublicProductsList() {
  return `
    select p.product_id, p.seller_id, p.title, p.description, p.price, p.condition, p.stock_qty, p.contact_preference, p.campus, p.created_at,
      (s.open_orders > 0) as is_ordered, u.full_name as seller_name, u.email as seller_email, u.phone_number as seller_phone_number, c.name as category, img.image_url
    from products p
    join users u on u.user_id = p.seller_id
    left join categories c on c.category_id = p.category_id
    left join product_order_stats s on s.product_id = p.product_id
    left join product_primary_images img on img.product_id = p.product_id
    where p.is_available = true
      and ($1 = '' or p.title ilike '%' || $1 || '%' or coalesce(p.description, '') ilike '%' || $1 || '%')
      and ($2 = '' or c.name = $2)
      and ($3 = '' or p.condition = $3)
    order by
      case when $4 = 'price_asc' then p.price end asc,
      case when $4 = 'price_desc' then p.price end desc,
      p.created_at desc
    limit $5;
  `;
}

export function qPublicProductDetail() {
  return `
    select p.product_id, p.seller_id, p.title, p.description, p.price, p.condition, p.stock_qty, p.contact_preference, p.campus, p.created_at,
      (s.open_orders > 0) as is_ordered, u.full_name as seller_name, u.email as seller_email, u.phone_number as seller_phone_number, c.name as category
    from products p
    join users u on u.user_id = p.seller_id
    left join categories c on c.category_id = p.category_id
    left join product_order_stats s on s.product_id = p.product_id
    where p.product_id = $1
    limit 1;
  `;
}

export function qProductImages() {
  return `
    select image_url
    from product_images
    where product_id = $1
      and image_url is not null
    order by is_primary desc, image_id asc;
  `;
}
