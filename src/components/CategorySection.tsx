import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight, ChevronLeft, Package, LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatRupee } from '@/lib/formatRupee';

interface Product {
    id: string;
    title: string;
    description: string | null;
    price: number;
    category: string;
    image_url: string | null;
    seller_id: string;
    created_at?: string | null;
    profiles?: {
        full_name: string;
        hostel_name: string;
        phone_number: string;
    };
}

interface CategorySectionProps {
    title: string;
    categoryFilter?: string;
    onViewAll?: () => void;
    onProductClick: (product: Product) => void;
    limit?: number;
    icon?: LucideIcon;
    iconClassName?: string;
    iconColorClass?: string;
}

export function CategorySection({
    title,
    categoryFilter,
    onViewAll,
    onProductClick,
    limit = 6,
    icon: Icon,
    iconClassName = "bg-emerald-100 dark:bg-emerald-900/30",
    iconColorClass = "text-emerald-600 dark:text-emerald-400"
}: CategorySectionProps) {
    const { user } = useAuth();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { data: products, isLoading } = useQuery({
        queryKey: ['category-section', categoryFilter, user?.id],
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
                .eq('status', 'available')
                .or('report_count.lt.10,report_count.is.null')

                .order('created_at', { ascending: false })
                .limit(limit);

            // Only exclude own products if logged in
            if (user) {
                query = query.neq('seller_id', user.id);
            }

            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Product[];
        },
        enabled: true,
    });

    const getRelativeTime = (createdAt: string | null | undefined) => {
        if (!createdAt) return null;
        try {
            return formatDistanceToNow(new Date(createdAt), { addSuffix: false }) + ' ago';
        } catch {
            return null;
        }
    };

    const scrollLeft = () => {
        console.log('Left Clicked');
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        } else {
            console.error('Ref is null');
        }
    };

    const scrollRight = () => {
        console.log('Right Clicked');
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        } else {
            console.error('Ref is null');
        }
    };

    // If no products, show the empty state message instead of hiding
    if (!isLoading && (!products || products.length === 0)) {
        return (
            <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                </div>
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#161B22] rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                    <Package className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No active listings in this category right now</p>
                </div>
            </section>
        );
    }

    return (
        <section>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {Icon && (
                        <div className={`p-2 rounded-lg ${iconClassName}`}>
                            <Icon className={`w-5 h-5 ${iconColorClass}`} />
                        </div>
                    )}
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                        View All
                        <ChevronRight className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Horizontal Scroll with Navigation */}
            <div className="relative group">
                {/* Left Arrow - Hidden on mobile */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollLeft();
                    }}
                    className="absolute -left-2 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white shadow-lg hidden md:flex items-center justify-center border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 cursor-pointer pointer-events-auto"
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>

                {/* Right Arrow - Hidden on mobile */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollRight();
                    }}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-white shadow-lg hidden md:flex items-center justify-center border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 cursor-pointer pointer-events-auto"
                    aria-label="Scroll right"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>

                {/* Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1"
                >
                    {isLoading ? (
                        // Skeleton loading
                        Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-48 bg-white rounded-xl overflow-hidden shadow-sm"
                            >
                                <div className="h-48 w-full bg-slate-100 animate-pulse" />
                                <div className="p-3">
                                    <div className="h-4 bg-slate-200 rounded animate-pulse mb-2" />
                                    <div className="h-5 bg-slate-200 rounded animate-pulse w-16" />
                                </div>
                            </div>
                        ))
                    ) : (
                        products?.map((product) => (
                            <div
                                key={product.id}
                                onClick={() => onProductClick(product)}
                                className="flex-shrink-0 w-48 bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                            >
                                {/* Fixed Height Image Container */}
                                <div className="relative h-48 w-full bg-slate-50">
                                    {product.image_url ? (
                                        <div className="absolute inset-0 p-4 flex items-center justify-center">
                                            <img
                                                src={product.image_url}
                                                alt={product.title}
                                                className="max-w-full max-h-full object-contain"
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Package className="h-10 w-10 text-slate-300" />
                                        </div>
                                    )}
                                </div>
                                {/* Content */}
                                <div className="p-3">
                                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-1 mb-1">
                                        {product.title}
                                    </h3>
                                    <p className="text-lg font-bold text-emerald-700">{formatRupee(product.price)}</p>
                                    {product.created_at && (
                                        <p className="text-xs text-slate-400 mt-1">{getRelativeTime(product.created_at)}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
