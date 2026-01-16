export function ProductCardSkeleton() {
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            {/* Fixed Height Image Skeleton */}
            <div className="h-48 w-full bg-slate-100 animate-pulse" />

            {/* Card Content Skeleton */}
            <div className="p-4">
                {/* Title */}
                <div className="h-4 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-4 bg-slate-200 rounded animate-pulse w-2/3 mb-3" />

                {/* Price */}
                <div className="h-6 bg-slate-200 rounded animate-pulse w-20 mb-3" />

                {/* Location */}
                <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 bg-slate-200 rounded-full animate-pulse" />
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-16" />
                </div>
            </div>
        </div>
    );
}
