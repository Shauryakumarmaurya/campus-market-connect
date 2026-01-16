import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Store, Package, ShoppingCart, UserPen, LogOut, Heart } from 'lucide-react';
import { SellItemModal } from './SellItemModal';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { cartCount } = useCart();
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Glassmorphism Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/70 dark:bg-[#0B0F1A]/80 backdrop-blur-xl border-b border-emerald-100/50 dark:border-emerald-900/30 transition-all duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">NextBatch</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Wishlist Icon */}
                <Link
                  to="/profile/wishlist"
                  className="relative p-2 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Wishlist"
                >
                  <Heart className="h-6 w-6" />
                </Link>

                {/* Cart Icon with Badge */}
                <Link
                  to="/profile/cart"
                  className="relative p-2 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  title="Cart"
                >
                  <ShoppingCart className="h-6 w-6" />
                  {/* Notification Badge - only show if count > 0 */}
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>

                <Button
                  onClick={() => {
                    if (!user) {
                      navigate('/auth', { state: { from: location.pathname } });
                      return;
                    }
                    setSellModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 ml-1"
                  data-sell-button
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Sell Item
                </Button>

                {/* Theme Toggle */}
                <ThemeToggle />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ml-2">
                      <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity border-2 border-emerald-100">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile/listings" className="flex items-center cursor-pointer">
                        <Package className="h-4 w-4 mr-2" />
                        My Listings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile/cart" className="flex items-center cursor-pointer">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        My Cart
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile/edit" className="flex items-center cursor-pointer">
                        <UserPen className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/auth">
                  <Button variant="ghost" className="text-slate-600 hover:text-emerald-600 hover:bg-emerald-50">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <SellItemModal open={sellModalOpen} onOpenChange={setSellModalOpen} />
    </>
  );
}
