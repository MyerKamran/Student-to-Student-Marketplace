// Home page — hero, categories, recent listings, and how it works
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Search, Handshake } from 'lucide-react';
import ListingCard from '../components/ListingCard';
import SkeletonCard from '../components/SkeletonCard';
import CategoryCard from '../components/CategoryCard';
import { categories } from '../data/mockData';
import { listProducts } from '../api/productsClient';

const HOW_IT_WORKS = [
  { step: '01', Icon: Camera, title: 'Post Your Item', desc: 'List your books, notes or any academic item in minutes' },
  { step: '02', Icon: Search, title: 'Browse & Connect', desc: 'Find what you need and message the seller directly' },
  { step: '03', Icon: Handshake, title: 'Meet & Exchange', desc: 'Meet on campus and complete your exchange safely' },
];

function Home() {
  const [loading, setLoading] = useState(true);
  const [recentListings, setRecentListings] = useState([]);

  // Load recent real listings from API
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await listProducts({ limit: 6, sort: 'newest' });
        if (!alive) return;
        setRecentListings(resp.rows || []);
      } catch {
        if (!alive) return;
        setRecentListings([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main className="page-enter">

      {/* ─── Hero Section ─── */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 pt-32 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-4">
            Buy &amp; Sell Within <br />
            <span className="text-indigo-200">Your Campus</span>
          </h1>
          <p className="text-indigo-100 text-lg mb-8 max-w-xl mx-auto">
            Find affordable textbooks, notes and more from fellow students at your university.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/listings"
              className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-semibold
                hover:brightness-110 active:scale-95 transition-all duration-200 shadow-lg"
            >
              Browse Listings
            </Link>
            <Link
              to="/sell"
              className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-semibold
                hover:brightness-110 active:scale-95 transition-all duration-200 shadow-lg border border-indigo-400"
            >
              Start Selling
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-6 text-indigo-200 text-sm font-medium flex-wrap">
            <span>500+ Listings</span>
            <span className="text-indigo-400">|</span>
            <span>20+ Campuses</span>
            <span className="text-indigo-400">|</span>
            <span>1000+ Students</span>
          </div>
        </div>
      </section>

      {/* ─── Categories Section ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Browse by Category</h2>
          <Link to="/listings" className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
            See All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.label} icon={cat.icon} label={cat.label} color={cat.color} />
          ))}
        </div>
      </section>

      {/* ─── Recent Listings Section ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Recently Added</h2>
          <Link to="/listings" className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} {...listing} />
            ))}
          </div>
        )}
      </section>

      {/* ─── How It Works Section ─── */}
      <section className="bg-gray-50 border-t border-gray-200 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            How CampusMarket Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="relative flex flex-col items-center text-center p-6">
                {/* Background step number */}
                <span className="absolute top-0 left-1/2 -translate-x-1/2 text-8xl font-black text-indigo-50 select-none -z-0">
                  {item.step}
                </span>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl mb-4 bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <item.Icon size={28} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
