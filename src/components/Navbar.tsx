import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingBag, ShoppingCart, Search, PlusCircle, Package, User, LogOut } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, profile, signOut } = useAuth();
  const { itemCount } = useCart();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => onNavigate('search')}
            className="flex items-center space-x-2 group"
          >
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-gray-900">CampusKart</span>
          </button>

          {user && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigate('search')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentPage === 'search'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Search size={20} />
                <span className="hidden sm:inline font-medium">Browse</span>
              </button>

              <button
                onClick={() => onNavigate('create')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentPage === 'create'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PlusCircle size={20} />
                <span className="hidden sm:inline font-medium">Sell</span>
              </button>

              <button
                onClick={() => onNavigate('cart')}
                className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentPage === 'cart'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-semibold w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
                <span className="hidden sm:inline font-medium">Cart</span>
              </button>

              <button
                onClick={() => onNavigate('orders')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentPage === 'orders'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Package size={20} />
                <span className="hidden sm:inline font-medium">Orders</span>
              </button>

              <button
                onClick={() => onNavigate('profile')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  currentPage === 'profile'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User size={20} />
                <span className="hidden sm:inline font-medium">{profile?.full_name || 'Profile'}</span>
              </button>

              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all ml-2"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
