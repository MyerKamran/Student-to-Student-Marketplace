export function qCartIdByUser() {
  return `
    select cart_id
    from carts
    where user_id = $1
    limit 1;
  `;
}

export function qCartItemsByCartId() {
  return `
    select ci.cart_item_id,ci.quantity,ci.added_at,p.product_id,p.title,p.price,p.stock_qty,p.is_available,
    u.full_name as seller_name,c.name as category,img.image_url
    from cart_items ci
    join products p on p.product_id = ci.product_id
    join users u on u.user_id = p.seller_id
    left join categories c on c.category_id = p.category_id
    left join product_primary_images img on img.product_id = p.product_id
    where ci.cart_id = $1
    order by ci.added_at desc;
  `;
}

export function qProductBasicForCart() {
  return `
    select seller_id, is_available, stock_qty
    from products
    where product_id = $1
    limit 1;
  `;
}

export function qIsProductLockedByOpenOrder() {
  return `
    select o.order_id
    from order_items oi
    join orders o on o.order_id = oi.order_id
    where oi.product_id = $1
      and o.status in ('pending', 'confirmed')
    limit 1;
  `;
}

export function qUpsertCartItem() {
  return `
    insert into cart_items (cart_id, product_id, quantity)
    values ($1, $2, $3)
    on conflict (cart_id, product_id) do update
    set quantity = cart_items.quantity + excluded.quantity;
  `;
}

export function qUpdateCartItemQty() {
  return `
    update cart_items
    set quantity = $1
    where cart_item_id = $2
      and cart_id = $3;
  `;
}

export function qDeleteCartItem() {
  return `
    delete from cart_items
    where cart_item_id = $1
      and cart_id = $2;
  `;
}

export function qCheckoutItemsForUpdate() {
  return `
    selectci.cart_item_id,ci.product_id,ci.quantity,p.price,p.stock_qty,p.is_available
    from cart_items ci
    join products p on p.product_id = ci.product_id
    where ci.cart_id = $1 for update;
  `;
}

export function qInsertOrder() {
  return `
    insert into orders (buyer_id, total_amount, status)
    values ($1, $2, 'pending')
    returning order_id;
  `;
}

export function qInsertOrderItem() {
  return `
    insert into order_items (order_id, product_id, quantity, unit_price)
    values ($1, $2, $3, $4);
  `;
}

export function qClearCartItems() {
  return `
    delete from cart_items
    where cart_id = $1;
  `;
}
