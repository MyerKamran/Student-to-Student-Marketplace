// ListingCard — displays a single listing with image, badges, price and seller info
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin } from 'lucide-react';
import { conditionColors, categoryColors } from '../data/mockData';
import { useFavorites } from '../context/FavoritesContext';

// Returns initials from full name (e.g. "Ahmed Khan" -> "AK")
function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Formats date string to readable format
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ListingCard({ id, image, title, price, condition, category, sellerName, campus, date, saved: initialSaved }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isSaved, setIsSaved] = useState(initialSaved || false);
  const resolvedSaved = isFavorite(id) || isSaved;

  function toggleSave(e) {
    e.preventDefault(); // Prevent card navigation
    e.stopPropagation();
    const next = toggleFavorite({ id, image, title, price, condition, category, sellerName, campus, date });
    setIsSaved(next);
  }

  return (
    <Link to={`/listings/${id}`} className="block group">
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-md hover:scale-105
        transition-all duration-200 overflow-hidden cursor-pointer">

        {/* Image section */}
        <div className="relative">
          <img
            src={image}
            alt={title}
            className="w-full h-48 object-cover rounded-t-2xl"
            onError={(e) => { e.target.src = 'https://placehold.co/400x300/F3F4F6/9CA3AF?text=No+Image'; }}
          />
          {/* Heart save button */}
          <button
            onClick={toggleSave}
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5
              shadow-sm hover:scale-110 transition-all duration-200"
            aria-label={resolvedSaved ? 'Unsave listing' : 'Save listing'}
          >
            <Heart
              size={16}
              className={resolvedSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'}
            />
          </button>
        </div>

        {/* Card body */}
        <div className="p-4">
          {/* Badges row */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[category] || 'bg-gray-100 text-gray-700'}`}>
              {category}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${conditionColors[condition] || 'bg-gray-100 text-gray-700'}`}>
              {condition}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 mt-2 text-sm leading-snug">
            {title}
          </h3>

          {/* Price */}
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            PKR {price.toLocaleString()}
          </p>

          {/* Seller and campus row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-700 text-xs font-bold">{getInitials(sellerName)}</span>
              </div>
              <span className="text-xs text-gray-600 font-medium">{sellerName}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <MapPin size={11} />
              <span className="text-xs">{campus}</span>
            </div>
          </div>

          {/* Date */}
          <p className="text-xs text-gray-400 mt-2">{formatDate(date)}</p>
        </div>
      </div>
    </Link>
  );
}

export default ListingCard;
