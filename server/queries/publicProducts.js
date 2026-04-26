export function qPublicProductsList({ whereSql, orderBySql, limitSql }) {
  return `
    select
      p.product_id, p.seller_id, p.title, p.description, p.price, p.condition, p.stock_qty,
      coalesce(p.contact_preference, 'In-app Message') as contact_preference,
      p.campus, p.created_at,
      exists (
        select o2.order_id
        from order_items oi2
        join orders o2 on o2.order_id = oi2.order_id
        where oi2.product_id = p.product_id
          and o2.status in ('pending','confirmed')
      ) as is_ordered,
      u.full_name as seller_name,
      u.email as seller_email,
      coalesce(u.phone_number, '') as seller_phone_number,
      c.name as category,
      (select pi.image_url from product_images pi where pi.product_id = p.product_id order by pi.is_primary desc, pi.image_id asc limit 1) as image_url
    from products p
    join users u on u.user_id = p.seller_id
    left join categories c on c.category_id = p.category_id
    where ${whereSql}
    order by ${orderBySql}
    limit ${limitSql};
  `;
}

export function qPublicProductDetail() {
  return `
    select
      p.product_id, p.seller_id, p.title, p.description, p.price, p.condition, p.stock_qty,
      coalesce(p.contact_preference, 'In-app Message') as contact_preference,
      p.campus, p.created_at,
      exists (
        select o2.order_id
        from order_items oi2
        join orders o2 on o2.order_id = oi2.order_id
        where oi2.product_id = p.product_id
          and o2.status in ('pending','confirmed')
      ) as is_ordered,
      u.full_name as seller_name,
      u.email as seller_email,
      coalesce(u.phone_number, '') as seller_phone_number,
      c.name as category
    from products p
    join users u on u.user_id = p.seller_id
    left join categories c on c.category_id = p.category_id
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

