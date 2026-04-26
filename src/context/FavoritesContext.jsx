import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

function keyForUser(userId) {
  return `campusmarket:favorites:${userId || 'guest'}`;
}

function readFavorites(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }) {
  const { currentUser, isLoggedIn } = useAuth();
  const storageKey = keyForUser(currentUser?.id);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!isLoggedIn) {
      setFavorites([]);
      return;
    }
    setFavorites(readFavorites(storageKey));
  }, [storageKey, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    window.localStorage.setItem(storageKey, JSON.stringify(favorites));
  }, [favorites, storageKey, isLoggedIn]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => String(f.id))), [favorites]);

  function isFavorite(id) {
    return favoriteIds.has(String(id));
  }

  function toggleFavorite(item) {
    if (!item?.id) return false;
    const exists = favoriteIds.has(String(item.id));
    if (exists) {
      setFavorites((prev) => prev.filter((p) => String(p.id) !== String(item.id)));
      return false;
    }
    setFavorites((prev) => [item, ...prev.filter((p) => String(p.id) !== String(item.id))]);
    return true;
  }

  function removeFavorite(id) {
    setFavorites((prev) => prev.filter((p) => String(p.id) !== String(id)));
  }

  const value = useMemo(() => ({
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
  }), [favorites, favoriteIds]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}

