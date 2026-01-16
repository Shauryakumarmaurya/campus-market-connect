import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    onClearFilters: () => void;
}

export function EmptyState({ onClearFilters }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
                <SearchX className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No items found</h3>
            <p className="text-gray-500 text-center mb-6 max-w-sm">
                Try adjusting your search or category to find what you're looking for.
            </p>
            <Button
                variant="outline"
                onClick={onClearFilters}
                className="border-gray-300"
            >
                Clear Filters
            </Button>
        </div>
    );
}
