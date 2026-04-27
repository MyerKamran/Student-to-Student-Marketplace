import { useEffect, useMemo, useState } from 'react';
import { X, Send } from 'lucide-react';

function MessageModal({
  open,
  title = 'Send message',
  placeholder = 'Type your message…',
  initialMessage = '',
  onClose,
  onSend,
}) {
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const canSend = useMemo(() => String(message).trim().length > 0 && !sending, [message, sending]);

  useEffect(() => {
    if (open) setMessage(initialMessage || '');
  }, [open, initialMessage]);

  useEffect(() => {
    function onKeyDown(e) {
      if (!open) return;
      if (e.key === 'Escape') onClose?.();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (canSend) {
          e.preventDefault();
          void handleSend();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canSend, message]);

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend?.(String(message).trim());
      onClose?.();
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close message dialog"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="p-5">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none
              focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
          />

          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <span>Tip: press Ctrl+Enter to send</span>
            <span>{String(message).trim().length}/500</span>
          </div>

          <button
            type="button"
            disabled={!canSend}
            onClick={() => void handleSend()}
            className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm
              hover:bg-indigo-700 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            <Send size={16} />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MessageModal;

