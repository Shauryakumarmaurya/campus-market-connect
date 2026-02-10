import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import MyListings from "./pages/profile/MyListings";
import MyCart from "./pages/profile/MyCart";
import MyWishlist from "./pages/profile/MyWishlist";
import EditProfile from "./pages/profile/EditProfile";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import ProfileCompletionModal from "./components/ProfileCompletionModal";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Analytics />
    <ThemeProvider defaultTheme="light" storageKey="campus-market-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ProfileCompletionModal />
            <CartProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/products/:productId" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/messages" element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                } />
                <Route path="/profile/listings" element={
                  <ProtectedRoute>
                    <MyListings />
                  </ProtectedRoute>
                } />
                <Route path="/profile/cart" element={
                  <ProtectedRoute>
                    <MyCart />
                  </ProtectedRoute>
                } />
                <Route path="/profile/wishlist" element={
                  <ProtectedRoute>
                    <MyWishlist />
                  </ProtectedRoute>
                } />
                <Route path="/profile/edit" element={
                  <ProtectedRoute>
                    <EditProfile />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
