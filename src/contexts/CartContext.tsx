import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
    id: string;
    title: string;
    price: number;
    imageUrl: string | null;
    category: string;
    sellerName?: string;
    hostelName?: string;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: CartItem) => void;
    removeFromCart: (id: string) => void;
    cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    // 1. Initialize State
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    // 2. Load Data (Run ONLY once on mount)
    useEffect(() => {
        const savedCart = localStorage.getItem('cartItems');
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart);
                setCartItems(parsed);
                console.log("Cart Loaded from Storage:", parsed);
            } catch (e) {
                console.error("Cart Storage Corrupt", e);
            }
        }
    }, []);

    // 3. Save Data (Run whenever cart changes)
    useEffect(() => {
        if (cartItems.length > 0) {
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
        }
    }, [cartItems]);

    // 4. Add to Cart Function
    const addToCart = (product: CartItem) => {
        setCartItems((prev) => {
            // Prevent duplicates
            if (prev.find(item => item.id === product.id)) {
                console.log("Item already in cart:", product.id);
                return prev;
            }
            console.log("Adding to cart:", product);
            return [...prev, product];
        });
    };

    // 5. Remove Function
    const removeFromCart = (id: string) => {
        setCartItems(prev => {
            const newCart = prev.filter(item => item.id !== id);
            localStorage.setItem('cartItems', JSON.stringify(newCart)); // Force save immediately
            console.log("Removed from cart:", id);
            return newCart;
        });
    };

    const cartCount = cartItems.length;

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, cartCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
