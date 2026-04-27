// Footer — clean site footer with logo, quick links and copyright
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Top row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-indigo-600">
            <BookOpen size={20} />
            <span>CampusMarket</span>
          </Link>

          {/* Quick category links */}
          <div className="flex items-center gap-6">
            <Link to="/listings?category=Books" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              📚 Books
            </Link>
            <Link to="/listings?category=Notes" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              📝 Notes
            </Link>
            <Link to="/listings?category=Electronics" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
              💻 Electronics
            </Link>
          </div>

          {/* Post listing CTA */}
          <Link
            to="/sell"
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium
              hover:bg-indigo-700 transition-all duration-200"
          >
            + Post a Listing
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 mt-8 pt-6">
          <p className="text-center text-sm text-gray-400">
            © 2025 CampusMarket. Made for Pakistani students. 🇵🇰
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
