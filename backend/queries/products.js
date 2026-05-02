export function qMyProducts() {
  return `
    select
      p.product_id,p.title,p.description,p.price,p.condition,p.stock_qty,p.is_available,p.campus,
      p.created_at,s.sold_qty,s.earned,s.open_orders,u.full_name as seller_name,c.name as category,
      img.image_url
    from products p
    join users u on u.user_id = p.seller_id
    left join categories c on c.category_id = p.category_id
    left join product_order_stats s on s.product_id = p.product_id
    left join product_primary_images img on img.product_id = p.product_id
    where p.seller_id = $1
      and (
        p.is_available = true
        or p.stock_qty > 0
        or s.sold_qty > 0
      )
    order by p.created_at desc;
  `;
}
