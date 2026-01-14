import { cn } from '@/lib/utils';

const categories = [
  { id: 'all', label: 'All', color: 'bg-secondary text-secondary-foreground' },
  { id: 'Books', label: 'Books', color: 'bg-category-books/10 text-category-books hover:bg-category-books/20' },
  { id: 'Electronics', label: 'Electronics', color: 'bg-category-electronics/10 text-category-electronics hover:bg-category-electronics/20' },
  { id: 'Lab Coat', label: 'Lab Coat', color: 'bg-category-labcoat/10 text-category-labcoat hover:bg-category-labcoat/20' },
  { id: 'Cycle', label: 'Cycle', color: 'bg-category-cycle/10 text-category-cycle hover:bg-category-cycle/20' },
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
            selected === category.id
              ? category.id === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : category.color.replace('/10', '/100').replace('text-category', 'text-primary-foreground')
              : category.color
          )}
          style={
            selected === category.id && category.id !== 'all'
              ? { backgroundColor: `hsl(var(--category-${category.id.toLowerCase().replace(' ', '')}))`, color: 'white' }
              : {}
          }
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
