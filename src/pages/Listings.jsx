// Listings page — browse all listings with search, filter and sort
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import ListingCard from '../components/ListingCard';
import SkeletonCard from '../components/SkeletonCard';
import SearchBar from '../components/SearchBar';
import { listProducts } from '../api/productsClient';

const ALL_CATEGORIES = ['All', 'Books', 'Notes', 'Electronics', 'Stationery', 'Lab Equipment', 'Other'];
const ALL_CONDITIONS = ['All', 'New', 'Good', 'Fair', 'Poor'];
const SORT_OPTIONS = ['Newest', 'Price: Low to High', 'Price: High to Low'];

function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [condition, setCondition] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [listings, setListings] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await listProducts({
          limit: 200,
        });
        if (!alive) return;
        setListings(resp.rows || []);
      } catch {
        if (alive) setListings([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Sync category from URL params
  useEffect(() => {
    const urlCat = searchParams.get('category');
    if (urlCat) setCategory(urlCat);
  }, [searchParams]);

  const hasActiveFilters = category !== 'All' || condition !== 'All' || search !== '';

  function clearFilters() {
    setSearch('');
    setCategory('All');
    setCondition('All');
    setSort('Newest');
    setSearchParams({});
  }

  function removeFilter(filterName) {
    if (filterName === 'category') { setCategory('All'); setSearchParams({}); }
    if (filterName === 'condition') setCondition('All');
    if (filterName === 'search') setSearch('');
  }

  // Filter logic
  let filtered = listings.filter((item) => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || item.category === category;
    const normalizedSelectedCondition = condition === 'Like New' ? 'Good' : condition;
    const matchCondition = normalizedSelectedCondition === 'All' || item.condition === normalizedSelectedCondition;
    return matchSearch && matchCategory && matchCondition;
  });

  // Sort logic
  if (sort === 'Price: Low to High') filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === 'Price: High to Low') filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sort === 'Newest') filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <main className="pt-20 pb-16 px-4 page-enter">
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Listings</h1>
          <span className="bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded-full">
            {listings.length}
          </span>
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search books, notes, equipment..." />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-gray-500">
            <SlidersHorizontal size={16} />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setSearchParams(e.target.value !== 'All' ? { category: e.target.value } : {}); }}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {ALL_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {SORT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm
                hover:bg-red-50 transition-all flex items-center gap-1"
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {search && (
              <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                Search: "{search}"
                <button onClick={() => removeFilter('search')}><X size={12} /></button>
              </span>
            )}
            {category !== 'All' && (
              <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                {category}
                <button onClick={() => removeFilter('category')}><X size={12} /></button>
              </span>
            )}
            {condition !== 'All' && (
              <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                {condition}
                <button onClick={() => removeFilter('condition')}><X size={12} /></button>
              </span>
            )}
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-6">
            Showing <span className="font-semibold text-gray-800">{filtered.length}</span> of{' '}
            <span className="font-semibold text-gray-800">{listings.length}</span> listings
          </p>
        )}

        {/* Listings grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4">🔍</span>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No listings found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search term</p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium
                hover:bg-indigo-700 transition-all duration-200"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((listing) => (
              <ListingCard key={listing.id} {...listing} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default Listings;
