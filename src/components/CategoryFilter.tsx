import { cn } from '@/lib/utils';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'Books', label: 'Books' },
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Lab Coat', label: 'Lab Coat' },
  { id: 'Cycle', label: 'Cycle' },
  { id: 'Other', label: 'Other' },
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
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          )}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
