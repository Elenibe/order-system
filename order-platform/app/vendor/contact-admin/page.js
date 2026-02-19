'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Send, X, RefreshCw, AlertCircle } from 'lucide-react';

export default function ContactAdmin() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const session = getSession('vendor');
    if (!session) {
      router.push('/vendor/login');
      return;
    }
    setUserData(session);
    loadMessages(session.id);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (vendorId) => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
      } else {
        setMessages(data || []);
        
        // Mark vendor's unread messages as read
        await supabase
          .from('admin_messages')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('vendor_id', vendorId)
          .eq('sender_type', 'admin')
          .eq('is_read', false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // Subject is only required for first message
    if (messages.length === 0 && !messageSubject.trim()) {
      alert('Please enter a subject for your issue');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          vendor_id: userData.id,
          subject: messageSubject || 'Follow-up',
          message_text: newMessage,
          sender_type: 'vendor'
        });

      if (error) throw error;

      setNewMessage('');
      if (messages.length === 0) setMessageSubject('');
      await loadMessages(userData.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="vendor" userData={userData}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contact Admin</h1>
          <p className="text-gray-600 mt-1">Get help with issues or ask questions about your account</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-purple-50">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Support Conversation</h2>
            </div>
            {messages.length > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Subject: {messages[0].subject}
              </p>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertCircle className="h-12 w-12 mb-2 text-gray-300" />
                <p className="font-medium">No messages yet</p>
                <p className="text-sm">Describe your issue below and we'll help you</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'vendor' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_type === 'vendor'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">
                          {msg.sender_type === 'vendor' ? 'You' : '👨‍💼 Admin'}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white space-y-3">
            {messages.length === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Subject
                </label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="e.g., Payment not received, Product issue, Account problem..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            )}

            <div>
              <div className="flex space-x-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Describe your issue or question... (Shift+Enter for new line)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  rows="3"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send className="h-5 w-5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>

        {/* Quick Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Common Issues?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Payment not received → Check your bank account in settings</li>
            <li>• Customer complaints → Use order messages for resolution</li>
            <li>• Product updates → Go to My Products page</li>
            <li>• Account verification → Contact us here</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}