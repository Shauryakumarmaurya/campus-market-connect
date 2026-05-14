import { Link } from 'react-router-dom';
import { ArchiveRestore, ChevronRight, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrphanedImages } from '@/hooks/use-orphaned-images';
import { useAuth } from '@/contexts/AuthContext';

const DISMISS_KEY = 'restore-banner-dismissed-at';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

export function RestoreListingsBanner() {
  const { user } = useAuth();
  const { orphanCount } = useOrphanedImages();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) {
      setDismissed(false);
      return;
    }
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    setDismissed(elapsed < DISMISS_DURATION_MS);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  if (!user || orphanCount === 0 || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-900/40">
      <div className="container mx-auto px-4 py-3">
        <Link
          to="/profile/restore"
          className="flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <ArchiveRestore className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 truncate">
                You have {orphanCount} unfinished listing{orphanCount === 1 ? '' : 's'} to restore
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 truncate">
                Quickly add a title and price to bring your old listings back online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:inline-flex items-center text-sm font-medium text-amber-700 dark:text-amber-300 group-hover:text-amber-900 dark:group-hover:text-amber-100">
              Restore now
              <ChevronRight className="h-4 w-4 ml-0.5 transition-transform group-hover:translate-x-0.5" />
            </span>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              aria-label="Dismiss for 24 hours"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Link>
      </div>
    </div>
  );
}
