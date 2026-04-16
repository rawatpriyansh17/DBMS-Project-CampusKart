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
  description?: string;
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

interface CartListingSummary {
  title: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  status: string;
}

interface CartWithListingSummary {
  quantity: number;
  listings: CartListingSummary | null;
}

interface OrderSummary {
  id: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
}

interface OrderItemListingSummary {
  title: string;
  category: string;
  condition: string;
  location: string;
}

interface OrderItemSummary {
  order_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  listings: OrderItemListingSummary | null;
}

const MIN_LOADER_MS = 850;

const LEGACY_REPLY_SIGNATURE =
  "That's a great question! I'm here to help with CampusKart features";

const isLegacyCloudReply = (reply: string) =>
  reply.includes(LEGACY_REPLY_SIGNATURE);

const isListingDetailsIntent = (message: string) => {
  const lower = message.toLowerCase();
  const hasListingWord =
    lower.includes('listed') ||
    lower.includes('listing') ||
    lower.includes('items') ||
    lower.includes('products');

  const hasDetailsWord =
    lower.includes('detail') ||
    lower.includes('all') ||
    lower.includes('complete') ||
    lower.includes('everything') ||
    lower.includes('what items');

  return hasListingWord && hasDetailsWord;
};

const isCartDetailsIntent = (message: string) => {
  const lower = message.toLowerCase();
  const hasCartWord =
    lower.includes('cart') ||
    lower.includes('in my cart') ||
    lower.includes('my cart');

  const hasDetailsWord =
    lower.includes('detail') ||
    lower.includes('all') ||
    lower.includes('what') ||
    lower.includes('show') ||
    lower.includes('items');

  return hasCartWord && hasDetailsWord;
};

const isOrderDetailsIntent = (message: string) => {
  const lower = message.toLowerCase();
  const hasOrderWord =
    lower.includes('order') ||
    lower.includes('orders') ||
    lower.includes('history') ||
    lower.includes('purchases');

  const hasDetailsWord =
    lower.includes('detail') ||
    lower.includes('all') ||
    lower.includes('what') ||
    lower.includes('show') ||
    lower.includes('recent');

  return hasOrderWord && hasDetailsWord;
};

const isProfileDetailsIntent = (message: string) => {
  const lower = message.toLowerCase();
  const hasProfileWord =
    lower.includes('profile') ||
    lower.includes('account') ||
    lower.includes('my info') ||
    lower.includes('my details');

  const hasDetailsWord =
    lower.includes('detail') ||
    lower.includes('show') ||
    lower.includes('summary') ||
    lower.includes('info') ||
    lower.includes('data');

  return hasProfileWord && hasDetailsWord;
};

const formatPrice = (value: number) => {
  if (!Number.isFinite(value)) return 'N/A';
  return `INR ${value}`;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User is not signed in');
  }

  return user.id;
}

async function getFullListingsReply() {
  const { data, error } = await supabase
    .from('listings')
    .select('title, description, price, category, condition, location, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Unable to load listings: ${error.message}`);
  }

  const listings = (data as ListingSummary[] | null) ?? [];

  if (listings.length === 0) {
    return 'There are currently no active listings on CampusKart.';
  }

  const lines: string[] = [
    `Great question. I found ${listings.length} active listing${listings.length === 1 ? '' : 's'} on CampusKart.`,
    'Here are the complete details:',
    '',
  ];

  listings.forEach((item, index) => {
    lines.push(`${index + 1}) ${item.title}`);
    lines.push(`   - Price: ${formatPrice(item.price)}`);
    lines.push(`   - Category: ${item.category}`);
    lines.push(`   - Condition: ${item.condition}`);
    lines.push(`   - Location: ${item.location}`);
    if (item.description && item.description.trim()) {
      lines.push(`   - Description: ${item.description.trim()}`);
    }
    lines.push('');
  });

  lines.push('That is the full set of active listings currently visible on the platform.');
  lines.push('If you want, I can also group these by category or suggest top picks by budget.');

  return lines.join('\n').trim();
}

async function getFullCartReply() {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('carts')
    .select(
      'quantity, listings(title, price, category, condition, location, status)'
    )
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Unable to load cart items: ${error.message}`);
  }

  const cartItems = (data as CartWithListingSummary[] | null) ?? [];

  if (cartItems.length === 0) {
    return 'Your cart is currently empty. Add items from the search page and I can summarize them here.';
  }

  let grandTotal = 0;
  const lines: string[] = [
    `You currently have ${cartItems.length} cart line item${cartItems.length === 1 ? '' : 's'}.`,
    'Here is the complete cart summary:',
    '',
  ];

  cartItems.forEach((item, index) => {
    const listing = item.listings;
    if (!listing) return;

    const lineTotal = listing.price * item.quantity;
    grandTotal += lineTotal;

    lines.push(`${index + 1}) ${listing.title}`);
    lines.push(`   - Quantity: ${item.quantity}`);
    lines.push(`   - Unit Price: ${formatPrice(listing.price)}`);
    lines.push(`   - Line Total: ${formatPrice(lineTotal)}`);
    lines.push(`   - Category: ${listing.category}`);
    lines.push(`   - Condition: ${listing.condition}`);
    lines.push(`   - Location: ${listing.location}`);
    lines.push('');
  });

  lines.push(`Estimated cart total: ${formatPrice(grandTotal)}`);
  lines.push('I can also suggest the best value items in your cart if you want.');

  return lines.join('\n').trim();
}

async function getFullOrdersReply() {
  const userId = await getCurrentUserId();

  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('id, total_amount, status, payment_method, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (ordersError) {
    throw new Error(`Unable to load orders: ${ordersError.message}`);
  }

  const orders = (ordersData as OrderSummary[] | null) ?? [];

  if (orders.length === 0) {
    return 'You do not have any orders yet.';
  }

  const orderIds = orders.map((order) => order.id);
  const { data: orderItemsData, error: orderItemsError } = await supabase
    .from('order_items')
    .select(
      'order_id, quantity, unit_price, total_price, listings(title, category, condition, location)'
    )
    .in('order_id', orderIds);

  if (orderItemsError) {
    throw new Error(`Unable to load order items: ${orderItemsError.message}`);
  }

  const orderItems = (orderItemsData as OrderItemSummary[] | null) ?? [];
  const itemsByOrder = new Map<string, OrderItemSummary[]>();

  orderItems.forEach((item) => {
    const existing = itemsByOrder.get(item.order_id) ?? [];
    existing.push(item);
    itemsByOrder.set(item.order_id, existing);
  });

  const lines: string[] = [
    `You have ${orders.length} recent order${orders.length === 1 ? '' : 's'}.`,
    'Here is your detailed order history:',
    '',
  ];

  orders.forEach((order, index) => {
    const items = itemsByOrder.get(order.id) ?? [];

    lines.push(`${index + 1}) Order ${order.id.slice(0, 8)} (${order.status})`);
    lines.push(`   - Date: ${new Date(order.created_at).toLocaleString()}`);
    lines.push(`   - Payment Method: ${order.payment_method ?? 'N/A'}`);
    lines.push(`   - Total Amount: ${formatPrice(order.total_amount)}`);

    if (items.length > 0) {
      lines.push('   - Items:');
      items.forEach((item, itemIndex) => {
        const listing = item.listings;
        if (!listing) return;
        lines.push(`     ${itemIndex + 1}. ${listing.title}`);
        lines.push(`        Quantity: ${item.quantity}`);
        lines.push(`        Unit Price: ${formatPrice(item.unit_price)}`);
        lines.push(`        Line Total: ${formatPrice(item.total_price)}`);
        lines.push(`        Category: ${listing.category}`);
      });
    }

    lines.push('');
  });

  lines.push('That is your full recent order breakdown.');

  return lines.join('\n').trim();
}

async function getFullProfileReply() {
  const userId = await getCurrentUserId();

  const [profileResult, listingsCountResult, activeListingsCountResult, ordersCountResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, location, phone, created_at')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

  if (profileResult.error) {
    throw new Error(`Unable to load profile: ${profileResult.error.message}`);
  }

  const profile = profileResult.data as
    | {
        full_name: string | null;
        location: string | null;
        phone: string | null;
        created_at: string;
      }
    | null;

  if (!profile) {
    return 'Your profile was not found. Please update your profile details from the Profile page.';
  }

  const lines: string[] = [
    'Here is your profile summary:',
    '',
    `1) Name: ${profile.full_name ?? 'N/A'}`,
    `   - Location: ${profile.location ?? 'N/A'}`,
    `   - Phone: ${profile.phone ?? 'Not added'}`,
    `   - Member Since: ${new Date(profile.created_at).toLocaleDateString()}`,
    '',
    '2) Marketplace Activity',
    `   - Total Listings Posted: ${listingsCountResult.count ?? 0}`,
    `   - Active Listings: ${activeListingsCountResult.count ?? 0}`,
    `   - Total Orders: ${ordersCountResult.count ?? 0}`,
    '',
    'If you want, I can also show your active listings next.',
  ];

  return lines.join('\n').trim();
}

const normalizeAssistantReply = (rawReply: string) => {
  let text = rawReply.replace(/\r\n/g, '\n').trim();

  // Remove markdown artifacts so the chat UI always shows clean plain text.
  text = text.replace(/```[\s\S]*?```/g, '').trim();
  text = text.replace(/^\s*[*-]\s+/gm, '- ');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');

  // Convert inline bullet artifacts like " * Price:" into readable lines.
  text = text.replace(/\s\*\s+/g, '\n- ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
};

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
Output must be plain text only.
Do not use markdown formatting symbols like **, *, _, #, or backticks.
If listing items, use simple numbered or hyphen lists in plain text.
Always complete your answer and end with a full sentence.
When the user asks for item/listing details, use this style:
1) Item title
  - Price: ...
  - Category: ...
  - Condition: ...
  - Location: ...
  - Description: ... (if available)
Include every available item from context when user asks for all items.

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
          maxOutputTokens: 900,
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

  return normalizeAssistantReply(reply);
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

    const loadingStartedAt = Date.now();
    const waitForMinimumLoader = async () => {
      const elapsed = Date.now() - loadingStartedAt;
      const remaining = MIN_LOADER_MS - elapsed;
      if (remaining > 0) {
        await sleep(remaining);
      }
    };

    try {
      if (isListingDetailsIntent(userMessage.content)) {
        const fullListingsReply = await getFullListingsReply();
        await waitForMinimumLoader();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fullListingsReply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }

      if (isCartDetailsIntent(userMessage.content)) {
        const fullCartReply = await getFullCartReply();
        await waitForMinimumLoader();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fullCartReply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }

      if (isOrderDetailsIntent(userMessage.content)) {
        const fullOrdersReply = await getFullOrdersReply();
        await waitForMinimumLoader();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fullOrdersReply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }

      if (isProfileDetailsIntent(userMessage.content)) {
        const fullProfileReply = await getFullProfileReply();
        await waitForMinimumLoader();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: fullProfileReply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }
    } catch (listingError) {
      console.error('Listing details helper error:', listingError);
    }

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

      assistantReply = normalizeAssistantReply(data?.reply?.trim() ?? '');

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
          content: normalizeAssistantReply(fallbackReply),
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
      await waitForMinimumLoader();
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
