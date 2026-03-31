import { X, MapPin, User, Phone, Calendar } from 'lucide-react';
import type { ListingWithProfile } from '../lib/database.types';

interface ListingModalProps {
  listing: ListingWithProfile;
  onClose: () => void;
}

export function ListingModal({ listing, onClose }: ListingModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{listing.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="aspect-video overflow-hidden rounded-xl bg-gray-100 mb-6">
            <img
              src={listing.image_url}
              alt={listing.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=1200&h=675&fit=crop';
              }}
            />
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="text-4xl font-bold text-blue-600">
              ${listing.price}
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {listing.category}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {listing.condition}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{listing.description}</p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>
            <div className="space-y-3">
              <div className="flex items-center text-gray-700">
                <User size={20} className="mr-3 text-gray-400" />
                <span className="font-medium">{listing.profiles.full_name}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <MapPin size={20} className="mr-3 text-gray-400" />
                <span>{listing.location}</span>
              </div>
              {listing.profiles.phone && (
                <div className="flex items-center text-gray-700">
                  <Phone size={20} className="mr-3 text-gray-400" />
                  <span>{listing.profiles.phone}</span>
                </div>
              )}
              <div className="flex items-center text-gray-700">
                <Calendar size={20} className="mr-3 text-gray-400" />
                <span>Posted on {formatDate(listing.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
