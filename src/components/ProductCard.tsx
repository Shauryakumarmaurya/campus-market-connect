import { useState, useEffect } from 'react';
import { MapPin, Package, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { formatRupee } from '@/lib/formatRupee';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  imageUrl: string | null;
  hostelName: string;
  category: string;
  sellerId: string;
  createdAt?: string | null;
  onClick: () => void;
}

// Helper to get saved items from localStorage
const getSavedItems = (): string[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('savedItems');
  return saved ? JSON.parse(saved) : [];
};

// Helper to save items to localStorage
const setSavedItems = (items: string[]) => {
  localStorage.setItem('savedItems', JSON.stringify(items));
};

export function ProductCard({ id, title, price, imageUrl, hostelName, category, sellerId, createdAt, onClick }: ProductCardProps) {
  const { user } = useAuth();
  const isOwner = user?.id === sellerId;
  const [isSaved, setIsSaved] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if product is saved on mount
  useEffect(() => {
    const savedItems = getSavedItems();
    setIsSaved(savedItems.includes(id));
  }, [id]);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    // Toggle saved state
    const savedItems = getSavedItems();

    if (isSaved) {
      // Remove from saved
      const newItems = savedItems.filter((itemId) => itemId !== id);
      setSavedItems(newItems);
      setIsSaved(false);
      console.log('Removed from wishlist:', id);
    } else {
      // Add to saved
      setSavedItems([...savedItems, id]);
      setIsSaved(true);
      console.log('Added to wishlist:', id);
    }
  };

  const getRelativeTime = () => {
    if (!createdAt) return null;
    try {
      return `Listed ${formatDistanceToNow(new Date(createdAt), { addSuffix: false })} ago`;
    } catch {
      return null;
    }
  };

  const relativeTime = getRelativeTime();

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
    >
      {/* Fixed Height Image Container */}
      <div className="relative h-48 w-full bg-slate-50">
        {imageUrl ? (
          <div className="absolute inset-0 p-4 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-12 w-12 text-slate-300" />
          </div>
        )}

        {/* Heart Button - Top Right (always visible, not for owners) */}
        {!isOwner && (
          <button
            onClick={handleSaveToggle}
            className={cn(
              'absolute top-2 right-2 z-10 p-2 rounded-full bg-white shadow-md transition-all duration-200 hover:scale-110',
              isAnimating && 'animate-bounce-scale'
            )}
          >
            <Heart
              className={cn(
                'h-5 w-5 transition-colors duration-200',
                isSaved ? 'fill-pink-500 text-pink-500' : 'text-gray-400'
              )}
            />
          </button>
        )}

        {/* Category Badge - Bottom Right */}
        <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
          {category}
        </div>

        {/* Owner Badge - Top Left */}
        {isOwner && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
            YOUR LISTING
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 leading-tight">
          {title}
        </h3>
        <p className="text-xl font-bold text-emerald-700 mb-2">{formatRupee(price)}</p>
        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
          <MapPin className="h-3.5 w-3.5" />
          <span>{hostelName}</span>
        </div>
        {relativeTime && (
          <p className="text-xs text-slate-400 mt-2">{relativeTime}</p>
        )}
      </div>
    </div>
  );
}
