import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, ShoppingCart, Package, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ProductDetailsModal } from '@/components/ProductDetailsModal';

interface SavedItem {
    id: string;
    product_id: string;
    created_at: string;
    products: {
        id: string;
        title: string;
        description: string | null;
        price: number;
        image_url: string | null;
        category: string;
        status: string | null;
        seller_id: string;
        profiles: {
            full_name: string;
            hostel_name: string;
            phone_number: string;
        } | null;
    };
}

export default function MyCart() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedProduct, setSelectedProduct] = useState<SavedItem['products'] | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    const { data: savedItems, isLoading } = useQuery({
        queryKey: ['saved-items', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('saved_items')
                .select(`
          id,
          product_id,
          created_at,
          products (
            id,
            title,
            description,
            price,
            image_url,
            category,
            status,
            seller_id,
            profiles (
              full_name,
              hostel_name,
              phone_number
            )
          )
        `)
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            // Filter out items where product might be null (deleted)
            return (data as any[]).filter(item => item.products) as SavedItem[];
        },
        enabled: !!user,
    });

    const removeMutation = useMutation({
        mutationFn: async (savedItemId: string) => {
            const { error } = await supabase
                .from('saved_items')
                .delete()
                .eq('id', savedItemId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['saved-items'] });
            toast.success('Item removed from cart');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to remove item');
        },
    });

    const handleWhatsAppClick = (e: React.MouseEvent, product: SavedItem['products']) => {
        e.stopPropagation();
        if (product.profiles?.phone_number) {
            const phoneNumber = product.profiles.phone_number.replace(/[^0-9]/g, '');
            const message = encodeURIComponent(`Hi, I am interested in "${product.title}"`);
            window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
        } else {
            toast.error('Seller phone number not available');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="container mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">My Cart</h1>
                    <p className="text-muted-foreground mt-1">Items you've saved for later</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : savedItems && savedItems.length > 0 ? (
                    <div className="grid gap-4">
                        {savedItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border group hover:border-primary/50 transition-colors"
                            >
                                {/* Left: Clickable Image */}
                                <div
                                    className="cursor-pointer"
                                    onClick={() => setSelectedProduct(item.products)}
                                >
                                    {item.products.image_url ? (
                                        <img
                                            src={item.products.image_url}
                                            alt={item.products.title}
                                            className="w-20 h-20 object-cover rounded-lg hover:opacity-90 transition-opacity"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors">
                                            <Package className="h-8 w-8 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Middle: Clickable Info */}
                                <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => setSelectedProduct(item.products)}
                                >
                                    <h3 className="font-semibold text-foreground truncate hover:text-primary hover:underline transition-all">
                                        {item.products.title}
                                    </h3>
                                    <p className="text-primary font-bold">₹{item.products.price}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.products.profiles?.hostel_name || 'Unknown location'}
                                    </p>
                                </div>

                                {/* Right: Action Buttons */}
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                    <button
                                        onClick={(e) => handleWhatsAppClick(e, item.products)}
                                        className="bg-green-500 text-white text-xs px-3 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        Chat
                                    </button>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeMutation.mutate(item.id)}
                                        disabled={removeMutation.isPending}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                    >
                                        {removeMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg">Your cart is empty</p>
                        <p className="text-muted-foreground text-sm mt-1">
                            Save items from the marketplace to see them here
                        </p>
                    </div>
                )}
            </main>

            <ProductDetailsModal
                product={selectedProduct}
                open={!!selectedProduct}
                onOpenChange={(open) => !open && setSelectedProduct(null)}
            />
        </div>
    );
}
