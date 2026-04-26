export function qReviewsForProduct() {
  return `
    select r.review_id, r.rating, r.comment, r.created_at,
           u.user_id as reviewer_id, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar_url
    from reviews r
    join users u on u.user_id = r.reviewer_id
    where r.product_id = $1
    order by r.created_at desc
    limit 200;
  `;
}

export function qReviewSummaryForProduct() {
  return `
    select coalesce(avg(rating),0) as avg_rating, count(*) as count
    from reviews
    where product_id = $1;
  `;
}

export function qProductOwnerId() {
  return `select seller_id from products where product_id = $1 limit 1;`;
}

export function qUpsertReview() {
  return `
    insert into reviews (product_id, reviewer_id, rating, comment)
    values ($1, $2, $3, $4)
    on conflict (product_id, reviewer_id) do update
    set rating = excluded.rating, comment = excluded.comment, created_at = now()
    returning review_id;
  `;
}

