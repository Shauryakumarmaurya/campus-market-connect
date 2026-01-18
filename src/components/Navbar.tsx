import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Store, Package, ShoppingCart, UserPen, LogOut, Heart, Menu, X, MessageSquare, LifeBuoy } from 'lucide-react';
import { SellItemModal } from './SellItemModal';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { cartCount } = useCart();
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) return;

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase.channel('nav-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        fetchUnread
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <>
      {/* Glassmorphism Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/70 dark:bg-[#0B0F1A]/80 backdrop-blur-xl border-b border-emerald-100/50 dark:border-emerald-900/30 transition-all duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">NextBatch</span>
            </Link>

            {/* Desktop Navigation */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                {/* Wishlist Icon */}
                <Link
                  to="/profile/wishlist"
                  className="relative p-2 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  title="Wishlist"
                >
                  <Heart className="h-6 w-6" />
                </Link>

                {/* Messages Icon */}
                <Link
                  to="/messages"
                  className="relative p-2 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  title="Messages"
                >
                  <MessageSquare className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center border-2 border-white dark:border-[#0B0F1A]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Cart Icon with Badge */}
                <Link
                  to="/profile/cart"
                  className="relative p-2 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  title="Cart"
                >
                  <ShoppingCart className="h-6 w-6" />
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
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 flex items-center gap-3 rounded-t-sm">
                      <Avatar className="h-8 w-8 border border-emerald-100">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium text-xs">
                          {getInitials(profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm truncate text-slate-900 dark:text-white">
                          {profile?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {profile?.email}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link to="/profile/listings" className="flex items-center cursor-pointer">
                        <Store className="h-4 w-4 mr-2" />
                        My Listings
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link to="/profile/wishlist" className="flex items-center cursor-pointer">
                        <Heart className="h-4 w-4 mr-2" />
                        Saved Items
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
              <div className="hidden md:flex items-center gap-3">
                <ThemeToggle />
                <Link to="/auth">
                  <Button variant="ghost" className="text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-900/30">
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

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              {user && (
                <>
                  <Link
                    to="/messages"
                    className="relative p-2 rounded-full text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <MessageSquare className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[14px] flex items-center justify-center border-2 border-white dark:border-[#0B0F1A]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <ThemeToggle />
                  <Link
                    to="/profile/cart"
                    className="relative p-2 rounded-full text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {cartCount > 9 ? '9+' : cartCount}
                      </span>
                    )}
                  </Link>
                </>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-emerald-100/50 dark:border-emerald-900/30 bg-white/95 dark:bg-[#0B0F1A]/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-4 space-y-3">
              {user ? (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <Avatar className="h-10 w-10 border-2 border-emerald-100">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{profile?.full_name || 'User'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.email}</p>
                    </div>
                  </div>

                  {/* Sell Item Button */}
                  <Button
                    onClick={() => {
                      setSellModalOpen(true);
                      closeMobileMenu();
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Sell Item
                  </Button>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <Link
                      to="/profile/wishlist"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      <Heart className="h-5 w-5 text-emerald-600" />
                      Wishlist
                    </Link>

                    <Link
                      to="/profile/cart"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      <ShoppingCart className="h-5 w-5 text-emerald-600" />
                      My Cart
                    </Link>
                    <Link
                      to="/profile/listings"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      <Package className="h-5 w-5 text-emerald-600" />
                      My Listings
                    </Link>
                    <Link
                      to="/profile/edit"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      <UserPen className="h-5 w-5 text-emerald-600" />
                      Edit Profile
                    </Link>
                  </div>

                  {/* Theme Toggle & Logout */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <span className="text-sm">Theme</span>
                      {/* Theme toggle moved to header */}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Guest Navigation */}
                  <div className="flex items-center justify-between pb-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Theme</span>
                    <ThemeToggle />
                  </div>
                  <Link to="/auth" onClick={closeMobileMenu}>
                    <Button variant="outline" className="w-full mb-2">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={closeMobileMenu}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <SellItemModal open={sellModalOpen} onOpenChange={setSellModalOpen} />
    </>
  );
}
