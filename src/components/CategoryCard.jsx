// CategoryCard — clickable category card that navigates to filtered listings
import { useNavigate } from 'react-router-dom';
import { BookCopy, NotebookPen, Laptop, Pencil, Microscope, Package } from 'lucide-react';

const CATEGORY_ICONS = {
  books: BookCopy,
  notes: NotebookPen,
  electronics: Laptop,
  stationery: Pencil,
  lab: Microscope,
  other: Package,
};

function CategoryCard({ icon, label, color }) {
  const navigate = useNavigate();
  const Icon = CATEGORY_ICONS[icon] || Package;

  function handleClick() {
    navigate(`/listings?category=${encodeURIComponent(label)}`);
  }

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border
        ${color} hover:scale-110 transition-all duration-200 cursor-pointer w-full
        shadow-sm hover:shadow-md`}
    >
      <Icon size={34} />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

export default CategoryCard;
