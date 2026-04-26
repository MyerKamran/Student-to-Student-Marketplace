export function qUserByEmailForGoogle() {
  return `
    select user_id, full_name, email, campus, avatar_url, role, is_active, created_at, google_id,
           nullif(coalesce(password, ''), '') as password_value
    from users
    where lower(email) = $1
    limit 1;
  `;
}

export function qInsertGoogleUser() {
  return `
    insert into users (full_name, email, google_id, avatar_url, is_active, password)
    values ($1, $2, $3, $4, true, null)
    returning user_id, full_name, email, campus, avatar_url, role, is_active, created_at;
  `;
}

export function qUpdateGoogleUserWithPassword() {
  return `
    update users
    set
      full_name = $2,
      google_id = $3,
      avatar_url = $4,
      is_active = true,
      password = $5
    where user_id = $1
    returning user_id, full_name, email, campus, avatar_url, role, is_active, created_at;
  `;
}

export function qUpdateGoogleUserNoPassword() {
  return `
    update users
    set
      full_name = $2,
      google_id = $3,
      avatar_url = $4,
      is_active = true
    where user_id = $1
    returning user_id, full_name, email, campus, avatar_url, role, is_active, created_at;
  `;
}

export function qEnsureCartForUser() {
  return `
    insert into carts (user_id)
    values ($1)
    on conflict (user_id) do nothing;
  `;
}

export function qRegisterUser() {
  return `
    insert into users (full_name, email, password, campus, is_active)
    values ($1, $2, $3, $4, true)
    on conflict (email) do nothing
    returning user_id, full_name, email, campus, avatar_url, role, is_active;
  `;
}

export function qLoginUserByEmail() {
  return `
    select user_id, full_name, email, campus, avatar_url, role, is_active,
           nullif(coalesce(password, ''), '') as password_value
    from users
    where lower(email) = $1
    limit 1;
  `;
}

export function qAuthMeUser() {
  return `
    select user_id, full_name, email, campus, avatar_url, role, is_active, occupation, phone_number, bio
    from users
    where user_id = $1
    limit 1;
  `;
}

export function qMyProfile() {
  return `
    select user_id, full_name, email, campus, avatar_url, role,
           coalesce(to_jsonb(users)->>'occupation', 'Student') as occupation,
           to_jsonb(users)->>'phone_number' as phone_number,
           to_jsonb(users)->>'bio' as bio
    from users
    where user_id = $1
    limit 1;
  `;
}

export function qUpdateMyProfile() {
  return `
    update users
    set
      full_name = coalesce($2, full_name),
      campus = coalesce($3, campus),
      occupation = coalesce($4, occupation),
      phone_number = $5,
      bio = $6,
      avatar_url = coalesce($7, avatar_url)
    where user_id = $1
    returning user_id, full_name, email, campus, avatar_url, role, occupation, phone_number, bio;
  `;
}

