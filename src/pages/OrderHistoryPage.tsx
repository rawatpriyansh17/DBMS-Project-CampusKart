import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package, Calendar, DollarSign, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import type { OrderWithItems } from '../lib/database.types';

export function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            listings (
              id,
              title,
              price,
              image_url,
              category,
              condition,
              location
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as OrderWithItems[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order History</h1>
          <p className="text-gray-600">View all your past purchases and orders</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Package className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-600">You haven't placed any orders yet. Start shopping to see them here!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                  }
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="text-sm text-gray-600">Order ID: {order.id.slice(0, 8)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-gray-400" />
                        <span className="text-lg font-semibold text-blue-600">
                          ${order.total_amount.toFixed(2)}
                        </span>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-2">
                      {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>

                  <div className="ml-4">
                    {expandedOrderId === order.id ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </div>
                </button>

                {expandedOrderId === order.id && (
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Order Items</h4>
                    <div className="space-y-4">
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 p-4 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={item.listings.image_url}
                              alt={item.listings.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=200&h=200&fit=crop';
                              }}
                            />
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h5 className="font-semibold text-gray-900 mb-1">
                                {item.listings.title}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {item.listings.category} • {item.listings.condition}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <MapPin size={14} />
                                {item.listings.location}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Qty: <span className="font-semibold">{item.quantity}</span>
                              </span>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">
                                  ${item.unit_price.toFixed(2)} × {item.quantity}
                                </p>
                                <p className="text-lg font-semibold text-blue-600">
                                  ${item.total_price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Order Total</p>
                        <p className="text-2xl font-bold text-blue-600">
                          ${order.total_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
