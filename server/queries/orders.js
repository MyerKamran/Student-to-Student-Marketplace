export function qMyOrdersAsBuyer() {
  return `
    select o.order_id, 'buyer' as perspective, o.status,
           coalesce(to_jsonb(o)->>'order_date', to_jsonb(o)->>'placement_date', to_jsonb(o)->>'created_at') as placed_at,
           o.total_amount as total_amount,
           count(oi.order_item_id) as items_count,
           min(p.product_id) as product_id,
           min(p.seller_id) as counterpart_id,
           min(us.full_name) as counterpart_name
    from orders o
    join order_items oi on oi.order_id = o.order_id
    join products p on p.product_id = oi.product_id
    join users us on us.user_id = p.seller_id
    where o.buyer_id = $1
    group by o.order_id
    order by placed_at desc, o.order_id desc
    limit 200;
  `;
}

export function qMyOrdersAsSeller() {
  return `
    select o.order_id, 'seller' as perspective, o.status,
           coalesce(to_jsonb(o)->>'order_date', to_jsonb(o)->>'placement_date', to_jsonb(o)->>'created_at') as placed_at,
           sum(oi.quantity * oi.unit_price) as total_amount,
           count(oi.order_item_id) as items_count,
           min(p.product_id) as product_id,
           o.buyer_id as counterpart_id,
           min(ub.full_name) as counterpart_name
    from orders o
    join order_items oi on oi.order_id = o.order_id
    join products p on p.product_id = oi.product_id
    join users ub on ub.user_id = o.buyer_id
    where p.seller_id = $1
    group by o.order_id, o.buyer_id
    order by placed_at desc, o.order_id desc
    limit 200;
  `;
}

