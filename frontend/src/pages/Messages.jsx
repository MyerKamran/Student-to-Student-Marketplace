import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { listMyMessages, markMessageRead, sendMessage } from '../api/messagesClient';
import { useAuth } from '../context/AuthContext';
import { ToastContainer } from '../components/Toast';

function Messages() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [draft, setDraft] = useState('');
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = 'success') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }
  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function refresh() {
    setLoading(true);
    try {
      const resp = await listMyMessages();
      setRows(resp.rows || []);
    } catch (e) {
      addToast(e.message || 'Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conversations = useMemo(() => {
    const m = new Map();
    for (const msg of rows) {
      const me = Number(currentUser?.id);
      const senderId = Number(msg.sender_id);
      const receiverId = Number(msg.receiver_id);
      const otherId = senderId === me ? receiverId : senderId;
      const otherName = senderId === me ? msg.receiver_name : msg.sender_name;
      const prev = m.get(otherId);
      if (!prev || new Date(msg.sent_at).getTime() > new Date(prev.last.sent_at).getTime()) {
        m.set(otherId, { otherId, otherName, last: msg });
      }
    }
    return Array.from(m.values()).sort((a, b) => new Date(b.last.sent_at) - new Date(a.last.sent_at));
  }, [rows, currentUser?.id]);

  const activeConversation = useMemo(
    () => conversations.find((c) => Number(c.otherId) === Number(selectedUserId)) || conversations[0] || null,
    [conversations, selectedUserId]
  );

  const activeMessages = useMemo(() => {
    if (!activeConversation) return [];
    const me = Number(currentUser?.id);
    return rows
      .filter((msg) => {
        const senderId = Number(msg.sender_id);
        const receiverId = Number(msg.receiver_id);
        return (
          (senderId === me && receiverId === Number(activeConversation.otherId)) ||
          (senderId === Number(activeConversation.otherId) && receiverId === me)
        );
      })
      .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
  }, [rows, activeConversation, currentUser?.id]);

  useEffect(() => {
    if (!activeConversation) return;
    setSelectedUserId(activeConversation.otherId);
  }, [activeConversation?.otherId]);

  useEffect(() => {
    const me = Number(currentUser?.id);
    const unread = activeMessages.filter((m) => Number(m.receiver_id) === me && !m.is_read);
    if (!unread.length) return;
    for (const m of unread) {
      void markMessageRead(m.message_id);
    }
  }, [activeMessages, currentUser?.id]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || !activeConversation) return;
    try {
      await sendMessage({ receiverId: activeConversation.otherId, productId: null, content });
      setDraft('');
      await refresh();
    } catch (e) {
      addToast(e.message || 'Failed to send', 'error');
    }
  }

  return (
    <main className="pt-20 pb-16 px-4 page-enter">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <MessageCircle size={20} className="text-indigo-600" />
          Messages
        </h1>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[520px]">
          <div className="border-r border-gray-100">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-bold text-gray-900">Conversations</div>
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No messages yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {conversations.map((c) => (
                  <button
                    key={c.otherId}
                    onClick={() => setSelectedUserId(c.otherId)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      Number(activeConversation?.otherId) === Number(c.otherId) ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">{c.otherName}</div>
                    <div className="text-xs text-gray-500 line-clamp-1 mt-1">{c.last.content}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex flex-col">
            {!activeConversation ? (
              <div className="p-6 text-sm text-gray-500">Select a conversation.</div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-bold text-gray-900">{activeConversation.otherName}</div>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {activeMessages.map((m) => {
                    const mine = Number(m.sender_id) === Number(currentUser?.id);
                    return (
                      <div key={m.message_id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                          mine ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
                        }`}>
                          <div>{m.content}</div>
                          <div className={`text-[10px] mt-1 ${mine ? 'text-indigo-100' : 'text-gray-500'}`}>
                            {new Date(m.sent_at).toLocaleString('en-PK')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                  >
                    <span className="inline-flex items-center gap-2"><Send size={14} /> Send</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}

export default Messages;

