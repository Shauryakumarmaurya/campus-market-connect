import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Package, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { SellItemModal } from '@/components/SellItemModal';
import { formatRupee } from '@/lib/formatRupee';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Product {
    id: string;
    title: string;
    description: string | null;
    price: number;
    category: string;
    image_url: string | null;
    status: string | null;
    created_at: string | null;
}

export default function MyListings() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    const { data: products, isLoading } = useQuery({
        queryKey: ['my-listings', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('seller_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Product[];
        },
        enabled: !!user,
    });

    const deleteMutation = useMutation({
        mutationFn: async (productId: string) => {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-listings'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['my-listings-preview'] });
            toast.success('Item deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete item');
        },
    });

    const handleEdit = (product: Product) => {
        setProductToEdit(product);
        setEditModalOpen(true);
    };

    const handleEditModalClose = (open: boolean) => {
        setEditModalOpen(open);
        if (!open) {
            setProductToEdit(null);
        }
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
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="container mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
                    <p className="text-gray-500 mt-1">Manage your listed items</p>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : products && products.length > 0 ? (
                    <div className="grid gap-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                            >
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt={product.title}
                                        className="w-20 h-20 object-cover rounded-lg"
                                    />
                                ) : (
                                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Package className="h-8 w-8 text-gray-300" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                                    <p className="text-primary font-bold">{formatRupee(product.price)}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.status === 'available'
                                        ? 'bg-green-50 text-green-600'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {product.status === 'available' ? 'Active' : product.status || 'Active'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Edit Button */}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleEdit(product)}
                                        className="border-gray-200 hover:border-primary hover:text-primary"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>

                                    {/* Delete Button */}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                disabled={deleteMutation.isPending}
                                            >
                                                {deleteMutation.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete your listing.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => deleteMutation.mutate(product.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No listings yet</p>
                        <p className="text-gray-400 text-sm mt-1">
                            Start selling by clicking "Sell Item" in the navbar
                        </p>
                    </div>
                )}
            </main>

            {/* Edit Modal */}
            <SellItemModal
                open={editModalOpen}
                onOpenChange={handleEditModalClose}
                productToEdit={productToEdit}
            />
        </div>
    );
}
