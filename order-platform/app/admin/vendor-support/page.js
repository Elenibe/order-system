'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Send, AlertCircle } from 'lucide-react';

export default function VendorSupport() {
  const router = useRouter();
  const [adminData, setAdminData] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const session = getSession('admin');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setAdminData(session);
    loadConversations();
  }, [router]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select(`
          *,
          vendors (
            id,
            company_name,
            email,
            contact_person
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by vendor and get latest message
      const grouped = {};
      (data || []).forEach(msg => {
        const vendorId = msg.vendor_id;
        if (!grouped[vendorId]) {
          grouped[vendorId] = {
            vendor: msg.vendors,
            lastMessage: msg,
            unreadCount: msg.sender_type === 'vendor' && !msg.is_read ? 1 : 0,
            messageId: msg.id
          };
        } else if (msg.sender_type === 'vendor' && !msg.is_read) {
          grouped[vendorId].unreadCount += 1;
        }
      });

      setConversations(Object.values(grouped));
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const loadMessages = async (vendorId) => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      await supabase
        .from('admin_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('vendor_id', vendorId)
        .eq('sender_type', 'vendor')
        .eq('is_read', false);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedVendor) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          vendor_id: selectedVendor,
          subject: messages[0]?.subject || 'Response',
          message_text: reply,
          sender_type: 'admin'
        });

      if (error) throw error;
      setReply('');
      await loadMessages(selectedVendor);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout userType="admin" userData={adminData}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Support</h1>
          <p className="text-gray-600 mt-1">Respond to vendor issues and questions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Conversations</h2>
              <p className="text-xs text-gray-600">{conversations.length} vendors</p>
            </div>
            
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>No support requests yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.vendor.id}
                    onClick={() => {
                      setSelectedVendor(conv.vendor.id);
                      loadMessages(conv.vendor.id);
                    }}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition ${
                      selectedVendor === conv.vendor.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {conv.vendor.company_name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {conv.lastMessage.message_text.substring(0, 40)}...
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="lg:col-span-2">
            {selectedVendor ? (
              <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-blue-50">
                  <h2 className="font-semibold text-gray-900">
                    {conversations.find(c => c.vendor.id === selectedVendor)?.vendor.company_name}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Subject: {messages[0]?.subject}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_type === 'admin'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-xs font-medium mb-1 opacity-75">
                          {msg.sender_type === 'admin' ? 'You' : 'Vendor'}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t border-gray-200 bg-white space-y-3">
                  <div className="flex space-x-2">
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Type your response... (Shift+Enter for new line)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows="3"
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || !reply.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow h-[600px] flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}