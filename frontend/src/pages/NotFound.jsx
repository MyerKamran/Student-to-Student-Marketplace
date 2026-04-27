// NotFound — 404 page with large indigo text and home navigation
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-4 page-enter">
      <h1 className="text-9xl font-bold text-indigo-600 mb-4">404</h1>
      <h2 className="text-3xl font-bold text-gray-900 mb-3">Page Not Found</h2>
      <p className="text-gray-500 mb-8 max-w-sm">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link
        to="/"
        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold
          hover:bg-indigo-700 active:scale-95 transition-all duration-200"
      >
        Go Back Home
      </Link>
    </main>
  );
}

export default NotFound;
