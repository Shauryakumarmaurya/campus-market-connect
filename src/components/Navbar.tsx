import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, Store } from 'lucide-react';
import { SellItemModal } from './SellItemModal';
import { useNavigate } from 'react-router-dom';

export function Navbar() {
  const { user, signOut } = useAuth();
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Store className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">CampusMart</span>
            </a>

            {user && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setSellModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Sell Item
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <SellItemModal open={sellModalOpen} onOpenChange={setSellModalOpen} />
    </>
  );
}
