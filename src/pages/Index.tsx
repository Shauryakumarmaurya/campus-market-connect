import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';

import { ProductCard } from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { CategorySection } from '@/components/CategorySection';
import { ProductDetailsModal } from '@/components/ProductDetailsModal';
import { Button } from '@/components/ui/button';
import { Plus, Search, ChevronRight, Package, ShieldCheck, MessageSquare, MapPin, Book, Laptop, Bike, FlaskConical, MoreHorizontal, Store, LayoutGrid, Sparkles, Smartphone, BookOpen } from 'lucide-react';
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
  { id: 'all', label: 'View All', icon: LayoutGrid, color: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' },
  { id: 'Books', label: 'Books & Notes', icon: Book, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  { id: 'Electronics', label: 'Electronics', icon: Laptop, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
  { id: 'Cycle', label: 'Cycles', icon: Bike, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
  { id: 'Lab Coat', label: 'Lab Essentials', icon: FlaskConical, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  { id: 'Other', label: 'Other', icon: MoreHorizontal, color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
];

const categoryConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  Books: { label: 'Books & Notes', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-100' },
  Electronics: { label: 'Electronics & Gadgets', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-100' },
  Cycle: { label: 'Cycles', icon: Bike, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  'Lab Coat': { label: 'Lab Essentials', icon: FlaskConical, color: 'text-orange-600', bg: 'bg-orange-100' },
  Other: { label: 'Other Essentials', icon: Package, color: 'text-slate-600', bg: 'bg-slate-100' },
};

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { productId } = useParams<{ productId: string }>();
  const searchQuery = searchParams.get('search') || '';

  const [heroInput, setHeroInput] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    setHeroInput(searchQuery);
  }, [searchQuery]);

  // Auto-open product modal when productId is in URL
  useEffect(() => {
    if (productId) {
      // Fetch the product by ID and open modal
      const fetchAndOpenProduct = async () => {
        const { data, error } = await supabase
          .from('products')
          .select(`*, profiles:seller_id (full_name, hostel_name, phone_number)`)
          .eq('id', productId)
          .single();

        if (!error && data) {
          setSelectedProduct(data as Product);
          setDetailsOpen(true);
        }
      };
      fetchAndOpenProduct();
    }
  }, [productId]);

  const handleSearch = () => {
    if (heroInput.trim()) {
      setSearchParams({ search: heroInput.trim() });
      setSelectedCategory('all');
      const element = document.getElementById('marketplace');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Optional: clear search if input is empty
      searchParams.delete('search');
      setSearchParams(searchParams);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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

      <main className="space-y-6">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-white to-slate-50 dark:from-[#0B0F1A] dark:to-background border-b border-gray-100 dark:border-gray-800">
          <div className="container mx-auto px-4 py-8 pb-4">
            {/* Headline */}
            <div className="text-center mb-5">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-2">
                The Marketplace for{' '}
                <span className="text-emerald-600">IIT Delhi</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                The trusted platform where college students can buy and sell old items, gear, and essentials.
              </p>
            </div>

            {/* Large Search Bar */}
            <div className="max-w-2xl mx-auto mb-5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for books, cycles, electronics..."
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-6 pr-14 py-3 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 shadow-lg shadow-gray-200/50 dark:shadow-none transition-all"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-100 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-lg transition-colors duration-200"
                >
                  <Search className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Dual CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              {myListings && myListings.length > 0 ? (
                <Button
                  onClick={() => navigate('/profile/listings')}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none w-full sm:w-auto"
                >
                  <Store className="h-5 w-5 mr-2" />
                  Manage My Listings
                </Button>
              ) : (
                <Button
                  onClick={handleSellClick}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-6 text-base rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none w-full sm:w-auto"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Sell an Item
                </Button>
              )}
              <Button
                onClick={() => {
                  setSelectedCategory('all');
                  setHeroInput('');
                  setSearchParams({});
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


          </div>
        </section>

        {/* Visual Category Cards */}
        <section className="container mx-auto px-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categoryCards.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setHeroInput('');
                    setSearchParams({});
                    // Optional: scroll to marketplace if needed
                  }}
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


        {/* Marketplace Section */}
        <section id="marketplace" className="container mx-auto px-4 py-6">


          {showCategorizedView ? (
            <div className="space-y-8 md:space-y-12">
              <CategorySection
                title="Fresh Arrivals"
                icon={Sparkles}
                iconClassName="bg-emerald-100 dark:bg-emerald-900/30"
                iconColorClass="text-emerald-600 dark:text-emerald-400"
                onViewAll={undefined}
                onProductClick={handleProductClick}
                limit={6}
              />
              <CategorySection
                title="Books & Notes"
                categoryFilter="Books"
                icon={BookOpen}
                iconClassName="bg-blue-100 dark:bg-blue-900/30"
                iconColorClass="text-blue-600 dark:text-blue-400"
                onViewAll={() => {
                  setSelectedCategory('Books');
                  setHeroInput('');
                  setSearchParams({});
                }}
                onProductClick={handleProductClick}
                limit={20}
              />
              <CategorySection
                title="Electronics & Gadgets"
                categoryFilter="Electronics"
                icon={Smartphone}
                iconClassName="bg-purple-100 dark:bg-purple-900/30"
                iconColorClass="text-purple-600 dark:text-purple-400"
                onViewAll={() => {
                  setSelectedCategory('Electronics');
                  setHeroInput('');
                  setSearchParams({});
                }}
                onProductClick={handleProductClick}
                limit={20}
              />
              <CategorySection
                title="Lab Essentials"
                categoryFilter="Lab Coat"
                icon={FlaskConical}
                iconClassName="bg-orange-100 dark:bg-orange-900/30"
                iconColorClass="text-orange-600 dark:text-orange-400"
                onViewAll={() => {
                  setSelectedCategory('Lab Coat');
                  setHeroInput('');
                  setSearchParams({});
                }}
                onProductClick={handleProductClick}
                limit={20}
              />
              <CategorySection
                title="Cycles"
                categoryFilter="Cycle"
                icon={Bike}
                iconClassName="bg-emerald-100 dark:bg-emerald-900/30"
                iconColorClass="text-emerald-600 dark:text-emerald-400"
                onViewAll={() => {
                  setSelectedCategory('Cycle');
                  setHeroInput('');
                  setSearchParams({});
                }}
                onProductClick={handleProductClick}
                limit={20}
              />
              <CategorySection
                title="Other Essentials"
                categoryFilter="Other"
                icon={Package}
                iconClassName="bg-slate-100 dark:bg-slate-800"
                iconColorClass="text-slate-600 dark:text-slate-400"
                onViewAll={() => {
                  setSelectedCategory('Other');
                  setHeroInput('');
                  setSearchParams({});
                }}
                onProductClick={handleProductClick}
                limit={20}
              />
            </div>
          ) : (
            <>
              {selectedCategory !== 'all' && categoryConfig[selectedCategory] && (
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2.5 rounded-xl ${categoryConfig[selectedCategory].bg} dark:bg-opacity-20`}>
                    {/* Render the specific icon dynamically */}
                    {(() => {
                      const Icon = categoryConfig[selectedCategory].icon;
                      return <Icon className={`w-6 h-6 ${categoryConfig[selectedCategory].color} dark:text-white`} />;
                    })()}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {categoryConfig[selectedCategory].label}
                  </h2>
                </div>
              )}
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
                    setHeroInput('');
                    setSearchParams({});
                    setSelectedCategory('all');
                  }}
                />
              )}
            </>
          )}
        </section>
        </section>

        {/* How it Works - Moved to Bottom */}
        <section className="container mx-auto px-4 py-8 border-t border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#161B22] rounded-xl p-4 border border-gray-200 dark:border-gray-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-1">Verified Students</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Login with IITD Webmail</p>
            </div>
            <Link to="/messages" className="bg-white dark:bg-[#161B22] rounded-xl p-4 border border-gray-200 dark:border-gray-800 text-center cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-1">Secure Chat</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">No phone numbers shared</p>
            </Link>
            <div className="bg-white dark:bg-[#161B22] rounded-xl p-4 border border-gray-200 dark:border-gray-800 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
                <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-1">Campus Meetup</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Exchange in your hostel</p>
            </div>
          </div>
        </section>
      </main>

      <ProductDetailsModal product={selectedProduct} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </div >
  );
}
