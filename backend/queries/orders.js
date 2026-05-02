export function qMyOrdersAsBuyer() {
  return `
    SELECT o.order_id, 'buyer' AS perspective, o.status, o.placed_at,
           o.total_amount, COUNT(oi.order_item_id) AS items_count
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    WHERE o.buyer_id = $1
    GROUP BY o.order_id
    ORDER BY o.placed_at DESC LIMIT 200;
  `;
}

export function qMyOrdersAsSeller() {
  return `
    SELECT o.order_id, 'seller' AS perspective, o.status, o.placed_at,
           SUM(oi.quantity * oi.unit_price) AS total_amount,
           COUNT(oi.order_item_id) AS items_count,
           o.buyer_id AS counterpart_id, ub.full_name AS counterpart_name
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN products p ON p.product_id = oi.product_id
    JOIN users ub ON ub.user_id = o.buyer_id
    WHERE p.seller_id = $1
    GROUP BY o.order_id, o.status, o.placed_at, o.buyer_id, ub.full_name
    ORDER BY o.placed_at DESC LIMIT 200;
  `;
}