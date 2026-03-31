import { MapPin, User } from 'lucide-react';
import type { ListingWithProfile } from '../lib/database.types';

interface ListingCardProps {
  listing: ListingWithProfile;
  onClick?: () => void;
}

export function ListingCard({ listing, onClick }: ListingCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
    >
      <div className="aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={listing.image_url}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=800&h=600&fit=crop';
          }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 flex-1">
            {listing.title}
          </h3>
          <span className="text-lg font-bold text-blue-600 ml-2">
            ${listing.price}
          </span>
        </div>

        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {listing.description}
        </p>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-500">
            <MapPin size={16} className="mr-1" />
            <span>{listing.location}</span>
          </div>

          <div className="flex items-center text-gray-500">
            <User size={16} className="mr-1" />
            <span>{listing.profiles.full_name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {listing.category}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {listing.condition}
          </span>
        </div>
      </div>
    </div>
  );
}
