// Toast — bottom-right toast notification with auto-dismiss
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={18} className="text-green-600" />,
  error: <XCircle size={18} className="text-red-600" />,
  info: <Info size={18} className="text-blue-600" />,
};

const bgColors = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
};

function Toast({ message, type = 'info', onClose }) {
  const [exiting, setExiting] = useState(false);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg
        ${bgColors[type]} ${exiting ? 'toast-exit' : 'toast-enter'}`}
    >
      {icons[type]}
      <span className="text-sm font-medium text-gray-800">{message}</span>
      <button
        onClick={() => { setExiting(true); setTimeout(onClose, 300); }}
        className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ToastContainer — fixed container holding multiple toasts
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

export default Toast;
