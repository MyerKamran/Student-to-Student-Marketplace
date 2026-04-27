export function qMyProducts() {
  return `
    select p.product_id, p.title, p.description, p.price, p.condition, p.stock_qty, p.is_available, p.campus, p.created_at,
           coalesce((select sum(oi.quantity) from order_items oi join orders o on o.order_id = oi.order_id where oi.product_id = p.product_id and o.status in ('pending','confirmed','completed')), 0) as sold_qty,
           coalesce((select sum(oi.quantity * oi.unit_price) from order_items oi join orders o on o.order_id = oi.order_id where oi.product_id = p.product_id and o.status in ('pending','confirmed','completed')), 0) as earned,
           coalesce((select count(*) from order_items oi join orders o on o.order_id = oi.order_id where oi.product_id = p.product_id and o.status in ('pending','confirmed')), 0) as open_orders,
           u.full_name as seller_name, c.name as category,
           (select pi.image_url from product_images pi where pi.product_id = p.product_id order by pi.is_primary desc, pi.image_id asc limit 1) as image_url
    from products p
    join users u on u.user_id = p.seller_id
    left join categories c on c.category_id = p.category_id
    where p.seller_id = $1
      and not (
        p.is_available = false
        and coalesce(p.stock_qty, 0) = 0
        and coalesce((select sum(oi.quantity) from order_items oi join orders o on o.order_id = oi.order_id where oi.product_id = p.product_id and o.status in ('pending','confirmed','completed')), 0) = 0
      )
    order by p.created_at desc;
  `;
}

