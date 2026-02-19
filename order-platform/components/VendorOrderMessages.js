import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function VendorOrderMessages({ order, vendorId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadMessages();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    
    return () => clearInterval(interval);
  }, [order.id]);

  const loadMessages = async () => {
    try {
      if (!order?.id) {
        console.log('No order ID provided');
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error.message || error);
        setMessages([]);
        setLoading(false);
        return;
      }

      setMessages(data || []);
      
      // Mark vendor's messages (customer responses) as read
      await supabase
        .from('order_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('order_id', order.id)
        .eq('sender_type', 'customer')
        .eq('is_read', false);

      // Reset unread count
      await supabase
        .from('orders')
        .update({ unread_vendor_messages: 0 })
        .eq('id', order.id);

      setLoading(false);
    } catch (error) {
      console.error('Error loading messages:', error.message || error);
      setMessages([]);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/vendor/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          vendorId: vendorId,
          message: newMessage
        })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        await loadMessages(); // Reload to show the new message
      } else {
        alert('Failed to send message: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
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

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-purple-50">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Order #{order.order_number}</h2>
              <p className="text-sm text-gray-600">
                Customer: {order.customers?.full_name || order.customers?.company_name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadMessages}
              className="text-purple-600 hover:text-purple-700 p-2"
              title="Refresh messages"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Order Details Quick View */}
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-700">
            <strong>Product Request:</strong> {order.product_description?.substring(0, 100)}
            {order.product_description?.length > 100 ? '...' : ''}
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="h-12 w-12 mb-2 text-gray-300" />
              <p>No messages yet</p>
              <p className="text-sm">Send a question to the customer</p>
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
                        {msg.sender_type === 'vendor' ? 'You' : 'Customer'}
                      </span>
                      <Clock className="h-3 w-3 opacity-70" />
                      <span className="text-xs opacity-70">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                    {!msg.is_read && msg.sender_type === 'customer' && (
                      <span className="text-xs italic opacity-70 mt-1 block">● New</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
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
              placeholder="Ask the customer a question... (e.g., 'What length of cable do you need?')"
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
            💡 Press Enter to send, Shift+Enter for new line • Auto-refreshes every 3 seconds
          </p>
        </div>

        {/* Quick Questions */}
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'What is the quantity you need?',
              'What size/dimensions?',
              'Do you have a brand preference?',
              'When do you need this delivered?',
              'Any specific quality requirements?'
            ].map((question) => (
              <button
                key={question}
                onClick={() => setNewMessage(question)}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}