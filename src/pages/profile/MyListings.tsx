import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Package, Pencil, CheckCircle2, Plus, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { SellItemModal } from '@/components/SellItemModal';
import { formatRupee } from '@/lib/formatRupee';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
                .update({ status: 'sold' })
                .eq('id', productId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-listings'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['my-listings-preview'] });
            toast.success('Item marked as sold');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update item');
        },
    });

    const handleEdit = (product: Product) => {
        setProductToEdit(product);
        setEditModalOpen(true);
    };

    const handleSellNew = () => {
        setProductToEdit(null);
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

    const activeListings = products?.filter(p => p.status !== 'sold') || [];
    const soldListings = products?.filter(p => p.status === 'sold') || [];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background">
            <Navbar />

            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Listings</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your inventory and track your sales</p>
                    </div>
                    <Button
                        onClick={handleSellNew}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium shrink-0"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        List New Item
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="active" className="w-full">
                        <TabsList className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 mb-6 w-full justify-start h-12 p-1 rounded-xl">
                            <TabsTrigger
                                value="active"
                                className="px-6 h-full rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none font-medium text-slate-600 dark:text-slate-400 transition-all"
                            >
                                <Package className="h-4 w-4 mr-2" />
                                Active Listings ({activeListings.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="sold"
                                className="px-6 h-full rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none font-medium text-slate-600 dark:text-slate-400 transition-all"
                            >
                                <Tag className="h-4 w-4 mr-2" />
                                Past Sales ({soldListings.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="active" className="mt-0">
                            {activeListings.length > 0 ? (
                                <div className="grid gap-4">
                                    {activeListings.map((product) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center gap-4 p-4 bg-white dark:bg-[#161B22] rounded-xl border border-gray-200 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-900/50 hover:shadow-sm transition-all shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                                        >
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    className="w-20 h-20 object-cover rounded-lg bg-gray-50 dark:bg-[#0d1117] border border-gray-100 dark:border-gray-800"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-100 dark:bg-[#0d1117] rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-800">
                                                    <Package className="h-8 w-8 text-gray-300" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-1">
                                                    <h3 className="font-semibold text-slate-900 dark:text-white truncate text-lg">{product.title}</h3>
                                                </div>
                                                <p className="text-emerald-600 font-bold text-lg">{formatRupee(product.price)}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.status === 'active' || product.status === 'available'
                                                    ? 'bg-green-50 text-green-600'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {product.status === 'active' || product.status === 'available' ? 'Active' : product.status || 'Active'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleEdit(product)}
                                                    className="h-9 w-9 border-slate-200 text-slate-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                    title="Edit Item"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            disabled={deleteMutation.isPending}
                                                            className="h-9 w-9 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                                                            title="Mark as Sold"
                                                        >
                                                            {deleteMutation.isPending ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Mark as Sold?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will mark your item as sold and remove it from the public marketplace.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => deleteMutation.mutate(product.id)}
                                                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                            >
                                                                Yes, Mark as Sold
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No active listings</h3>
                                    <p className="text-gray-500 mt-1 mb-6">Ready to sell? List your first item now.</p>
                                    <Button onClick={handleSellNew} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <Plus className="h-4 w-4 mr-2" />
                                        List Item
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="sold" className="mt-0">
                            {soldListings.length > 0 ? (
                                <div className="grid gap-4">
                                    {soldListings.map((product) => (
                                        <div
                                            key={product.id}
                                            className="flex items-center gap-4 p-4 bg-slate-50/50 dark:bg-[rgba(22,27,34,0.5)] rounded-xl border border-gray-200 dark:border-gray-800 opacity-75 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all"
                                        >
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    className="w-20 h-20 object-cover rounded-lg bg-gray-100 mix-blend-multiply"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                                                    <Package className="h-8 w-8 text-gray-300" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 truncate text-lg line-through decoration-slate-400 decoration-2">{product.title}</h3>
                                                <p className="text-slate-500 font-medium">{formatRupee(product.price)}</p>
                                                <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                                                    SOLD
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                                    <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No sold items yet</h3>
                                    <p className="text-gray-500 mt-1">Items you mark as sold will appear here.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </main>

            <SellItemModal
                open={editModalOpen}
                onOpenChange={handleEditModalClose}
                productToEdit={productToEdit}
            />
        </div>
    );
}
