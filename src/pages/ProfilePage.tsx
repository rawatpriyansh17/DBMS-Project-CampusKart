import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { ListingModal } from '../components/ListingModal';
import { User, MapPin, Phone, CreditCard as Edit2, Save, Trash2, Package } from 'lucide-react';
import type { ListingWithProfile, OrderWithItems } from '../lib/database.types';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingWithProfile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'orders'>('listings');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || '',
    location: profile?.location || '',
    phone: profile?.phone || '',
  });

  useEffect(() => {
    if (profile) {
      setEditData({
        full_name: profile.full_name,
        location: profile.location,
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchUserListings();
      fetchUserOrders();
    }
  }, [user]);

  const fetchUserOrders = async () => {
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
    }
  };

  const fetchUserListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles (*)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data as ListingWithProfile[]);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          location: editData.location,
          phone: editData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase.from('listings').delete().eq('id', listingId);

      if (error) throw error;

      setListings(listings.filter((listing) => listing.id !== listingId));
      setSelectedListing(null);
    } catch (error) {
      console.error('Error deleting listing:', error);
    }
  };

  const handleMarkAsSold = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('id', listingId);

      if (error) throw error;

      await fetchUserListings();
    } catch (error) {
      console.error('Error updating listing:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-4 rounded-full mr-4">
                <User className="text-blue-600" size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-600">Manage your account and listings</p>
              </div>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 size={18} />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={18} />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      full_name: profile?.full_name || '',
                      location: profile?.location || '',
                      phone: profile?.phone || '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center text-gray-700">
                <User size={20} className="mr-3 text-gray-400" />
                <span className="font-medium">{profile?.full_name}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <MapPin size={20} className="mr-3 text-gray-400" />
                <span>{profile?.location}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center text-gray-700">
                  <Phone size={20} className="mr-3 text-gray-400" />
                  <span>{profile.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'listings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              My Listings ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'orders'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Order History ({orders.length})
            </button>
          </div>
        </div>

        {activeTab === 'listings' ? (
          <>
            {listings.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <User className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
                <p className="text-gray-600">Start selling by creating your first listing</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <div key={listing.id} className="relative">
                    <ListingCard listing={listing} onClick={() => setSelectedListing(listing)} />
                    <div className="absolute top-4 right-4 flex gap-2">
                      {listing.status === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsSold(listing.id);
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Mark Sold
                        </button>
                      )}
                      {listing.status === 'sold' && (
                        <span className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg">Sold</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteListing(listing.id);
                        }}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {orders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Package className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600">Start shopping to see your order history here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Order ID: {order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          ${order.total_amount.toFixed(2)}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm font-semibold text-gray-900 mb-3">
                        Items ({order.order_items.length})
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="text-sm text-gray-600">
                            <p className="font-medium text-gray-900">{item.listings.title}</p>
                            <p className="text-xs">
                              Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedListing && (
        <ListingModal listing={selectedListing} onClose={() => setSelectedListing(null)} />
      )}
    </div>
  );
}
