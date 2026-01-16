import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailsModal } from '@/components/ProductDetailsModal';
import { Loader2, Heart } from 'lucide-react';

interface Product {
    id: string;
    title: string;
    description: string | null;
    price: number;
    category: string;
    image_url: string | null;
    seller_id: string;
    created_at: string | null;
    profiles?: {
        full_name: string;
        hostel_name: string;
        phone_number: string;
    };
}

export default function MyWishlist() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    // Load wishlist items from localStorage and fetch from Supabase
    useEffect(() => {
        const loadWishlist = async () => {
            // Step A: Read IDs from localStorage
            const saved = localStorage.getItem('savedItems');
            const savedIds: string[] = saved ? JSON.parse(saved) : [];

            console.log('Saved IDs from localStorage:', savedIds);

            // If empty, show empty state
            if (savedIds.length === 0) {
                setProducts([]);
                setIsLoading(false);
                return;
            }

            // Step B: Fetch product data from Supabase
            try {
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
                    .in('id', savedIds);

                if (error) throw error;

                console.log('Fetched products:', data);
                setProducts(data as Product[]);
            } catch (error) {
                console.error('Error fetching wishlist products:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadWishlist();
    }, []);

    // Re-fetch when localStorage changes (e.g., item removed)
    const refreshWishlist = async () => {
        setIsLoading(true);
        const saved = localStorage.getItem('savedItems');
        const savedIds: string[] = saved ? JSON.parse(saved) : [];

        if (savedIds.length === 0) {
            setProducts([]);
            setIsLoading(false);
            return;
        }

        const { data } = await supabase
            .from('products')
            .select(`*, profiles (full_name, hostel_name, phone_number)`)
            .in('id', savedIds);

        setProducts(data as Product[] || []);
        setIsLoading(false);
    };

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

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Wishlist</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Items you've watching</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                ) : products.length > 0 ? (
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
                    <div className="text-center py-16">
                        <Heart className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500 dark:text-slate-300 text-lg">Your wishlist is empty</p>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                            Tap the heart on any product to save it here
                        </p>
                    </div>
                )}
            </main>

            <ProductDetailsModal
                product={selectedProduct}
                open={detailsOpen}
                onOpenChange={(open) => {
                    setDetailsOpen(open);
                    if (!open) {
                        // Refresh when modal closes in case item was removed
                        refreshWishlist();
                    }
                }}
            />
        </div>
    );
}
