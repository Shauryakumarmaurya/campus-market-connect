import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, Package, Heart, Clock } from 'lucide-react';
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

const getSavedItems = (): string[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('savedItems');
  return saved ? JSON.parse(saved) : [];
};

const setSavedItems = (items: string[]) => {
  localStorage.setItem('savedItems', JSON.stringify(items));
};

export function ProductCard({ id, title, price, imageUrl, hostelName, category, sellerId, createdAt, onClick }: ProductCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOwner = user?.id === sellerId;
  const [isSaved, setIsSaved] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const savedItems = getSavedItems();
    setIsSaved(savedItems.includes(id));
  }, [id]);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error("Please login to save items");
      navigate('/auth', { state: { from: location.pathname } });
      return;
    }

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    const savedItems = getSavedItems();
    if (isSaved) {
      setSavedItems(savedItems.filter((itemId) => itemId !== id));
      setIsSaved(false);
    } else {
      setSavedItems([...savedItems, id]);
      setIsSaved(true);
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
    // FORCED LIGHT MODE: Always white card regardless of theme
    <div
      onClick={onClick}
      className="group relative bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-[0_2px_15px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 flex flex-col h-full border border-gray-100"
    >
      {/* Image Container */}
      <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
        {imageUrl ? (
          <div className="absolute inset-0 p-3 flex items-center justify-center">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-10 w-10 text-slate-300" />
          </div>
        )}

        {/* UNIVERSAL HOVER OVERLAY - z-10 */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-10">
          <span className="bg-white text-black px-5 py-2 rounded-lg font-semibold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200 hover:bg-gray-100">
            View & Chat
          </span>
        </div>

        {/* Heart Button - z-20 (above overlay) */}
        {!isOwner && (
          <button
            onClick={handleSaveToggle}
            className={cn(
              'absolute top-2 right-2 z-20 p-2 rounded-full bg-white/95 shadow-md transition-all duration-200 hover:scale-110',
              isAnimating && 'animate-bounce-scale'
            )}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors duration-200',
                isSaved ? 'fill-pink-500 text-pink-500' : 'text-gray-400'
              )}
            />
          </button>
        )}

        {/* Category Badge - Bottom Right */}
        <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-white/95 text-slate-700 shadow-sm border border-slate-100">
          {category}
        </div>
      </div>

      {/* Card Content - Compact for 6-column grid */}
      <div className="p-3 flex flex-col flex-grow">
        {/* Title - Always dark text */}
        <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-1.5 leading-tight">
          {title}
        </h3>

        {/* Branded Price */}
        <p className="text-lg font-bold text-primary mb-2">
          {formatRupee(price)}
        </p>

        {/* Metadata Badges */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {/* Location Badge - Brand Color */}
          <div className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="truncate max-w-[60px]">{hostelName}</span>
          </div>

          {/* Time Badge */}
          {relativeTime && (
            <div className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              <Clock className="h-3 w-3 mr-1" />
              <span className="truncate">{relativeTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
