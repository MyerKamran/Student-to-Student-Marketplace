export function qUnreadMessagesCount() {
  return `
    select count(*) as count
    from messages
    where receiver_id = $1
      and is_read = false;
  `;
}

export function qOpenOrdersCountForUser() {
  return `
    select count(distinct o.order_id) as count
    from orders o
    left join order_items oi on oi.order_id = o.order_id
    left join products p on p.product_id = oi.product_id
    where o.status in ('pending', 'confirmed')
      and (o.buyer_id = $1 or p.seller_id = $1);
  `;
}
