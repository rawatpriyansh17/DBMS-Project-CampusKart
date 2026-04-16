import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { ListingModal } from '../components/ListingModal';
import {
  User,
  MapPin,
  Phone,
  CreditCard as Edit2,
  Save,
  Trash2,
  Package,
  Pencil,
  X,
} from 'lucide-react';
import type {
  Database,
  ListingWithProfile,
  OrderWithItems,
} from '../lib/database.types';

const CATEGORIES = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Sports', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [listings, setListings] = useState<ListingWithProfile[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingWithProfile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'orders'>('listings');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingListing, setIsEditingListing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [listingActionLoading, setListingActionLoading] = useState(false);
  const [listingEditError, setListingEditError] = useState('');
  const [editData, setEditData] = useState({
    full_name: profile?.full_name || '',
    location: profile?.location || '',
    phone: profile?.phone || '',
  });
  const [listingEditData, setListingEditData] = useState({
    title: '',
    description: '',
    price: '',
    category: CATEGORIES[0],
    condition: CONDITIONS[2],
    image_url: '',
    location: '',
    status: 'active',
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
    if (!user) return;

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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as OrderWithItems[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchUserListings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles (*)
        `)
        .eq('user_id', user.id)
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
      const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {
        full_name: editData.full_name,
        location: editData.location,
        phone: editData.phone || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase
        .from('profiles') as any)
        .update(profileUpdate)
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

  const handleStartEditListing = (listing: ListingWithProfile) => {
    setListingEditError('');
    setEditingListingId(listing.id);
    setListingEditData({
      title: listing.title,
      description: listing.description,
      price: listing.price.toString(),
      category: listing.category,
      condition: listing.condition,
      image_url: listing.image_url,
      location: listing.location,
      status: listing.status,
    });
    setIsEditingListing(true);
  };

  const handleUpdateListing = async () => {
    if (!user || !editingListingId) return;

    const parsedPrice = parseFloat(listingEditData.price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setListingEditError('Please enter a valid non-negative price.');
      return;
    }

    setListingActionLoading(true);
    setListingEditError('');

    try {
      const listingUpdate: Database['public']['Tables']['listings']['Update'] = {
        title: listingEditData.title.trim(),
        description: listingEditData.description.trim(),
        price: parsedPrice,
        category: listingEditData.category,
        condition: listingEditData.condition,
        image_url:
          listingEditData.image_url.trim() ||
          'https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=800&h=600&fit=crop',
        location: listingEditData.location.trim(),
        status: listingEditData.status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase
        .from('listings') as any)
        .update(listingUpdate)
        .eq('id', editingListingId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserListings();

      if (selectedListing?.id === editingListingId) {
        setSelectedListing(null);
      }

      setIsEditingListing(false);
      setEditingListingId(null);
    } catch (error) {
      console.error('Error updating listing:', error);
      setListingEditError('Failed to update listing. Please try again.');
    } finally {
      setListingActionLoading(false);
    }
  };

  const handleMarkAsSold = async (listingId: string) => {
    try {
      const soldUpdate: Database['public']['Tables']['listings']['Update'] = {
        status: 'sold',
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase
        .from('listings') as any)
        .update(soldUpdate)
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
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-600">Manage your account and listings</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isAdmin
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {isAdmin ? 'Admin' : 'User'}
                  </span>
                </div>
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Access Level</h3>
          {isAdmin ? (
            <div className="text-sm text-gray-700 space-y-1">
              <p>Role: Admin</p>
              <p>Can view and manage all users' marketplace data through RLS admin policies.</p>
              <p>Can perform all normal user actions (buy, sell, cart, orders, profile updates).</p>
            </div>
          ) : (
            <div className="text-sm text-gray-700 space-y-1">
              <p>Role: User</p>
              <p>Can view active listings and fully manage own listings.</p>
              <p>Can only access own cart, own orders, and own profile data.</p>
            </div>
          )}
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditListing(listing);
                        }}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        aria-label="Edit listing"
                        title="Edit listing"
                      >
                        <Pencil size={16} />
                      </button>
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

      {isEditingListing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Listing</h2>
              <button
                onClick={() => {
                  setIsEditingListing(false);
                  setEditingListingId(null);
                  setListingEditError('');
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close edit listing modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={listingEditData.title}
                  onChange={(e) =>
                    setListingEditData({ ...listingEditData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={listingEditData.description}
                  onChange={(e) =>
                    setListingEditData({ ...listingEditData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={listingEditData.price}
                    onChange={(e) =>
                      setListingEditData({ ...listingEditData, price: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={listingEditData.location}
                    onChange={(e) =>
                      setListingEditData({ ...listingEditData, location: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={listingEditData.category}
                    onChange={(e) =>
                      setListingEditData({ ...listingEditData, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select
                    value={listingEditData.condition}
                    onChange={(e) =>
                      setListingEditData({ ...listingEditData, condition: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {CONDITIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={listingEditData.status}
                    onChange={(e) =>
                      setListingEditData({ ...listingEditData, status: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="sold">Sold</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={listingEditData.image_url}
                  onChange={(e) =>
                    setListingEditData({ ...listingEditData, image_url: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {listingEditError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {listingEditError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsEditingListing(false);
                  setEditingListingId(null);
                  setListingEditError('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateListing}
                disabled={listingActionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {listingActionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
