export function qCategoriesList() {
  return `
    select category_id, name, description
    from categories
    order by name asc;
  `;
}

