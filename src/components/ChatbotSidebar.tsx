import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface ProfileSummary {
  full_name: string | null;
  location: string | null;
}

interface ListingSummary {
  title: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  status: string;
  created_at: string;
}

interface CartSummary {
  quantity: number;
}

interface OrderSummary {
  total_amount: number;
  status: string;
  created_at: string;
}

const LEGACY_REPLY_SIGNATURE =
  "That's a great question! I'm here to help with CampusKart features";

const isLegacyCloudReply = (reply: string) =>
  reply.includes(LEGACY_REPLY_SIGNATURE);

async function getMarketplaceContextForPrompt() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User is not signed in');
  }

  const [profileResult, listingsResult, cartResult, ordersResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, location')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('listings')
      .select('title, price, category, condition, location, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('carts').select('quantity').eq('user_id', user.id),
    supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const profileData = (profileResult.data as ProfileSummary | null) ?? null;
  const activeListings = (listingsResult.data as ListingSummary[] | null) ?? [];
  const cartItems = (cartResult.data as CartSummary[] | null) ?? [];
  const userOrders = (ordersResult.data as OrderSummary[] | null) ?? [];

  const categorySummary = activeListings.reduce<Record<string, number>>((acc, listing) => {
    acc[listing.category] = (acc[listing.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    user: {
      id: user.id,
      full_name: profileData?.full_name ?? null,
      location: profileData?.location ?? null,
      cart_items_count: cartItems.reduce((sum, row) => sum + row.quantity, 0),
      recent_orders_count: userOrders.length,
    },
    listings: {
      active_count: activeListings.length,
      categories: categorySummary,
      latest: activeListings.slice(0, 8),
    },
    recent_orders: userOrders,
    warnings: [
      profileResult.error?.message,
      listingsResult.error?.message,
      cartResult.error?.message,
      ordersResult.error?.message,
    ].filter(Boolean),
  };
}

async function getGeminiReplyFromBrowser(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY for frontend Gemini fallback.');
  }

  const marketplaceContext = await getMarketplaceContextForPrompt();
  const recentConversation = history
    .slice(-8)
    .map((item) => `${item.role}: ${item.content}`)
    .join('\n');

  const prompt = `You are CampusKart assistant for a college marketplace.

Use the database context below to answer accurately.
If user asks for data that is not in the context, say you do not have enough data.
Keep responses concise, practical, and student-friendly.

DATABASE CONTEXT (JSON):
${JSON.stringify(marketplaceContext)}

RECENT CHAT HISTORY:
${recentConversation || '(no prior context)'}

USER MESSAGE:
${message}`;

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    const rawError = await response.text();
    throw new Error(`Gemini fallback failed (${response.status}): ${rawError}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const reply = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('\n')
    .trim();

  if (!reply) {
    throw new Error('Gemini returned an empty response.');
  }

  return reply;
}

export function ChatbotSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content:
        'Hi! 👋 I\'m your CampusKart assistant. I can help you find items, answer questions about how to use the platform, or provide recommendations. What can I help you with?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    const history = [...messages, userMessage]
      .slice(-8)
      .map((message) => ({
        role: message.type,
        content: message.content,
      }));

    try {
      let assistantReply = '';

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: userMessage.content,
          history,
        },
      });

      if (error) {
        throw error;
      }

      assistantReply = data?.reply?.trim() ?? '';

      if (!assistantReply || isLegacyCloudReply(assistantReply)) {
        assistantReply = await getGeminiReplyFromBrowser(userMessage.content, history);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: assistantReply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);

      try {
        const fallbackReply = await getGeminiReplyFromBrowser(
          userMessage.content,
          history
        );

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fallbackReply,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (fallbackError) {
        console.error('Gemini fallback error:', fallbackError);

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content:
            'Chat is using an outdated cloud function and Gemini fallback is unavailable. Add VITE_GEMINI_API_KEY to .env for local fallback, or deploy the updated Supabase chat function.',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} />
          <h3 className="font-semibold">CampusKart Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-blue-700 p-1 rounded transition-colors"
            aria-label="Minimize chat"
          >
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-blue-700 p-1 rounded transition-colors"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <span
                    className={`text-xs mt-1 block ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 border border-gray-200 rounded-lg rounded-bl-none p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !inputValue.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
