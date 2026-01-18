import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';
import { CategoryFilter } from '@/components/CategoryFilter';
import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { CategorySection } from '@/components/CategorySection';
import { ProductDetailsModal } from '@/components/ProductDetailsModal';
import { Button } from '@/components/ui/button';
import { Plus, Search, ChevronRight, Package, ShieldCheck, MessageSquare, MapPin, Book, Laptop, Bike, FlaskConical, MoreHorizontal } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { formatRupee } from '@/lib/formatRupee';

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  seller_id: string;
  status?: string | null;
  created_at?: string | null;
  profiles?: {
    full_name: string;
    hostel_name: string;
    phone_number: string;
  };
}

const categoryCards = [
  { id: 'Books', label: 'Books & Notes', icon: Book, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  { id: 'Electronics', label: 'Electronics', icon: Laptop, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
  { id: 'Cycle', label: 'Cycles', icon: Bike, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
  { id: 'Lab Coat', label: 'Lab Essentials', icon: FlaskConical, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  { id: 'Other', label: 'Other', icon: MoreHorizontal, color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
];

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch user's own listings
  const { data: myListings, isLoading: myListingsLoading } = useQuery({
    queryKey: ['my-listings-preview', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, profiles (full_name, hostel_name, phone_number)`)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!user,
  });

  // Fetch marketplace products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, profiles (full_name, hostel_name, phone_number)`)
        .eq('status', 'active')
        .lt('report_count', 10)
        .order('created_at', { ascending: false });

      if (user) query = query.neq('seller_id', user.id);
      if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
      if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    enabled: true,
  });

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setDetailsOpen(true);
  };

  const handleSellClick = () => {
    if (!user) {
      navigate('/auth', { state: { from: location.pathname } });
      return;
    }
    document.querySelector<HTMLButtonElement>('[data-sell-button]')?.click();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const showCategorizedView = selectedCategory === 'all' && searchQuery === '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-white to-slate-50 dark:from-[#0B0F1A] dark:to-background border-b border-gray-100 dark:border-gray-800">
          <div className="container mx-auto px-4 py-12 md:py-16">
            {/* Headline */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-3">
                The Marketplace for{' '}
                <span className="text-emerald-600">IIT Delhi</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Buy trusted items from seniors or sell your old gear in seconds.
              </p>
            </div>

            {/* Large Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search for books, cycles, electronics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 shadow-lg shadow-gray-200/50 dark:shadow-none transition-all"
                />
              </div>
            </div>

            {/* Dual CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                onClick={handleSellClick}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none w-full sm:w-auto"
              >
                <Plus className="h-5 w-5 mr-2" />
                Sell an Item
              </Button>
              <Button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' });
                }}
                variant="outline"
                size="lg"
                className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-slate-700 dark:text-slate-300 font-semibold px-8 py-6 text-base rounded-xl w-full sm:w-auto"
              >
                <Search className="h-5 w-5 mr-2" />
                Browse All Deals
              </Button>
            </div>

            {/* How it Works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-[#161B22] rounded-xl p-5 border border-gray-200 dark:border-gray-800 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Verified Students</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Login with IITD Webmail</p>
              </div>
              <Link to="/messages" className="bg-white dark:bg-[#161B22] rounded-xl p-5 border border-gray-200 dark:border-gray-800 text-center cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Secure Chat</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">No phone numbers shared</p>
              </Link>
              <div className="bg-white dark:bg-[#161B22] rounded-xl p-5 border border-gray-200 dark:border-gray-800 text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Campus Meetup</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Exchange in your hostel</p>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Category Cards */}
        <section className="container mx-auto px-4 py-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Shop by Category</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {categoryCards.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 dark:border-gray-800 transition-all hover:shadow-md hover:-translate-y-0.5 ${selectedCategory === cat.id
                    ? 'ring-2 ring-emerald-500 border-emerald-500'
                    : 'bg-white dark:bg-[#161B22]'
                    }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${cat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* My Listings Section */}
        {user && !myListingsLoading && myListings && myListings.length > 0 && (
          <section className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                My Active Listings
              </h2>
              <Link
                to="/profile/listings"
                className="text-sm text-primary dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                Manage All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
              {myListings.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="flex-shrink-0 flex items-center gap-3 p-3 bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-xl hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer min-w-[200px]"
                >
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-primary font-bold text-sm">{formatRupee(product.price)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Marketplace Section */}
        <section id="marketplace" className="container mx-auto px-4 py-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Marketplace</h2>

          {/* Sticky Category Filter Bar */}
          <div className="sticky top-[60px] z-10 bg-white/95 dark:bg-[#0B0F1A]/95 backdrop-blur-sm py-4 -mx-4 px-4 border-b border-gray-100 dark:border-gray-800 mb-5">
            <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
          </div>

          {showCategorizedView ? (
            <div className="space-y-2">
              <CategorySection title="🆕 Fresh Arrivals" onViewAll={undefined} onProductClick={handleProductClick} limit={6} />
              <CategorySection title="📚 Books & Notes" categoryFilter="Books" onViewAll={() => setSelectedCategory('Books')} onProductClick={handleProductClick} limit={20} />
              <CategorySection title="📱 Electronics & Gadgets" categoryFilter="Electronics" onViewAll={() => setSelectedCategory('Electronics')} onProductClick={handleProductClick} limit={20} />
              <CategorySection title="🥼 Hostel Essentials" categoryFilter="Lab Coat" onViewAll={() => setSelectedCategory('Lab Coat')} onProductClick={handleProductClick} limit={20} />
              <CategorySection title="🚲 Cycles" categoryFilter="Cycle" onViewAll={() => setSelectedCategory('Cycle')} onProductClick={handleProductClick} limit={20} />
              <CategorySection title="📦 Other Essentials" categoryFilter="Other" onViewAll={() => setSelectedCategory('Other')} onProductClick={handleProductClick} limit={20} />
            </div>
          ) : (
            <>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products && products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      title={product.title}
                      price={product.price}
                      imageUrl={product.image_url}
                      hostelName={product.profiles?.hostel_name || 'Unknown'}
                      category={product.category}
                      sellerId={product.seller_id}
                      createdAt={product.created_at}
                      onClick={() => handleProductClick(product)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  onClearFilters={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                />
              )}
            </>
          )}
        </section>
      </main>

      <ProductDetailsModal product={selectedProduct} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div>
  );
}
