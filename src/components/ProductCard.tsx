import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  imageUrl: string | null;
  hostelName: string;
  category: string;
  onClick: () => void;
}

const categoryColors: Record<string, string> = {
  'Books': 'bg-category-books',
  'Electronics': 'bg-category-electronics',
  'Lab Coat': 'bg-category-labcoat',
  'Cycle': 'bg-category-cycle',
};

export function ProductCard({ title, price, imageUrl, hostelName, category, onClick }: ProductCardProps) {
  return (
    <div
      onClick={onClick}
      className="masonry-item bg-card rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer animate-fade-in group"
    >
      <div className="relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">No image</span>
          </div>
        )}
        <div className={cn(
          'absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium text-primary-foreground',
          categoryColors[category] || 'bg-muted'
        )}>
          {category}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-lg font-bold text-primary mb-2">₹{price}</p>
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <MapPin className="h-3 w-3" />
          <span>{hostelName}</span>
        </div>
      </div>
    </div>
  );
}
