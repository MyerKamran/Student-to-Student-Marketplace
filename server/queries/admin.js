export function qAdminOverviewUsersCount() {
  return `select count(*) as count from users;`;
}

export function qAdminOverviewProductsCount() {
  return `select count(*) as count from products;`;
}

export function qAdminUsersList() {
  return `
    select user_id, full_name, email, campus, role, is_active, created_at
    from users
    order by created_at desc, user_id desc
    limit 500;
  `;
}

export function qAdminSetUserActive() {
  return `
    update users
    set is_active = $2
    where user_id = $1;
  `;
}

export function qAdminSoftRemoveUser() {
  return `
    update users
    set
      is_active = false,
      full_name = '[Removed User]',
      google_id = null,
      avatar_url = null,
      password = null,
      email = concat('removed+', user_id, '@removed.local')
    where user_id = $1;
  `;
}

export function qAdminDisableProductsBySeller() {
  return `
    update products
    set is_available = false, stock_qty = 0
    where seller_id = $1;
  `;
}

export function qAdminProductsList() {
  return `
    select p.product_id, p.title, p.price, p.is_available, p.stock_qty, p.created_at,
           u.user_id as seller_id, u.full_name as seller_name
    from products p
    left join users u on u.user_id = p.seller_id
    order by p.created_at desc, p.product_id desc
    limit 1000;
  `;
}

export function qAdminSoftRemoveProduct() {
  return `
    update products
    set is_available = false, stock_qty = 0
    where product_id = $1;
  `;
}

export function qAdminDeleteCartItemsForProduct() {
  return `delete from cart_items where product_id = $1;`;
}

