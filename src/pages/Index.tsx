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
import { Plus, ChevronRight, Package } from 'lucide-react';
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

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Removed auth redirect for public access

  // Fetch user's own listings for the horizontal section
  const { data: myListings, isLoading: myListingsLoading } = useQuery({
    queryKey: ['my-listings-preview', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles (
            full_name,
            hostel_name,
            phone_number
          )
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!user,
  });

  // Fetch marketplace products (only when not on 'all' tab or when searching)
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles (
            full_name,
            hostel_name,
            phone_number
          )
        `)
        .eq('status', 'active')
        .lt('report_count', 10)
        .order('created_at', { ascending: false });

      // Exclude own posts only if user is logged in
      if (user) {
        query = query.neq('seller_id', user.id);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    // Fetch by default (public access)
    enabled: true,
  });

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setDetailsOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Removed null return for !user to allow public access

  // Check if we're on the "All" tab without search
  const showCategorizedView = selectedCategory === 'all' && searchQuery === '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Section 1: My Listings - Stat Cards */}
        {user && !myListingsLoading && myListings && myListings.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">My Active Listings</h2>
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
                  className="flex-shrink-0 flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer min-w-[200px]"
                >
                  {/* Small Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {product.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-primary font-bold text-sm">{formatRupee(product.price)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                        {product.status === 'available' ? 'Active' : product.status || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Hero Banner - Start Selling (only shown when user not logged in or has no listings) */}
        {(!user || (!myListingsLoading && (!myListings || myListings.length === 0))) && (
          <section className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-600 to-teal-500 shadow-lg shadow-emerald-200">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white rounded-full" />
            </div>

            <div className="relative px-6 py-8 md:px-8 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Pass it to the NextBatch. 🚀
                </h2>
                <p className="text-white/80 text-sm md:text-base max-w-md">
                  The trusted marketplace for students to buy and sell cycles, books, and electronics.
                </p>
              </div>
              <Button
                onClick={() => {
                  if (!user) {
                    navigate('/auth', { state: { from: location.pathname } });
                    return;
                  }
                  document.querySelector<HTMLButtonElement>('[data-sell-button]')?.click();
                }}
                className="bg-white text-emerald-700 hover:bg-white/90 font-bold px-6 py-5 text-base shadow-md w-full md:w-auto"
              >
                <Plus className="h-5 w-5 mr-2" />
                Sell Now
              </Button>
            </div>
          </section>
        )}

        {/* Section 2: Marketplace */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Marketplace</h2>

          {/* Sticky Category Filter Bar */}
          <div className="sticky top-[60px] z-10 bg-white/95 dark:bg-[#0B0F1A]/95 backdrop-blur-sm py-4 -mx-4 px-4 border-b border-gray-100 dark:border-gray-800 mb-5">
            <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
          </div>

          {showCategorizedView ? (
            // 'All' Tab - Categorized Horizontal Sections
            <div className="space-y-2">
              {/* Fresh Arrivals - Latest 6 from any category */}
              <CategorySection
                title="🆕 Fresh Arrivals"
                onViewAll={undefined}
                onProductClick={handleProductClick}
                limit={6}
              />

              {/* Books & Notes */}
              <CategorySection
                title="📚 Books & Notes"
                categoryFilter="Books"
                onViewAll={() => setSelectedCategory('Books')}
                onProductClick={handleProductClick}
                limit={20}
              />

              {/* Electronics */}
              <CategorySection
                title="📱 Electronics & Gadgets"
                categoryFilter="Electronics"
                onViewAll={() => setSelectedCategory('Electronics')}
                onProductClick={handleProductClick}
                limit={20}
              />

              {/* Lab Coats / Hostel Essentials */}
              <CategorySection
                title="🥼 Hostel Essentials"
                categoryFilter="Lab Coat"
                onViewAll={() => setSelectedCategory('Lab Coat')}
                onProductClick={handleProductClick}
                limit={20}
              />

              {/* Cycles */}
              <CategorySection
                title="🚲 Cycles"
                categoryFilter="Cycle"
                onViewAll={() => setSelectedCategory('Cycle')}
                onProductClick={handleProductClick}
                limit={20}
              />

              {/* Other Essentials */}
              <CategorySection
                title="📦 Other Essentials"
                categoryFilter="Other"
                onViewAll={() => setSelectedCategory('Other')}
                onProductClick={handleProductClick}
                limit={20}
              />
            </div>
          ) : (
            // Specific Category or Search - Grid View
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
                <EmptyState onClearFilters={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }} />
              )}
            </>
          )}
        </section>
      </main>

      <ProductDetailsModal
        product={selectedProduct}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
