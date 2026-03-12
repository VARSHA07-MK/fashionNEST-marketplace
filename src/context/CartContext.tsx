import React, { useEffect, useState, createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: number;
  title: string;
  price: number;
  image_url: string;
  quantity: number;
  name?: string;
  productId?: string;
  category?: string;
  subcategory?: string;
  fabric?: string;
  color?: string;
  occasion?: string;
  image?: string;
  stock?: number;
  description?: string;
  community_discount_percentage?: number;
  community_discount_amount?: number;
  community_discount_applied?: boolean;
  community_event_id?: number | null;
  line_subtotal?: number;
  line_total?: number;
}

export interface CartSummary {
  subtotal: number;
  communityDiscount: number;
  discountedSubtotalBeforeCoupon: number;
  couponDiscount: number;
  discountedSubtotal: number;
  tax: number;
  total: number;
}

export interface AppliedCoupon {
  coupon_code: string;
  discount_type: string;
  discount_value: number;
  user_type: string;
}

type CartProduct = Omit<CartItem, 'quantity'>;
type CartMutationResult = { ok: boolean; error?: string };

interface CartContextType {
  items: CartItem[];
  addToCart: (product: CartProduct) => Promise<CartMutationResult>;
  removeFromCart: (id: number) => Promise<CartMutationResult>;
  updateQuantity: (id: number, delta: number) => Promise<CartMutationResult>;
  clearCart: () => Promise<CartMutationResult>;
  refreshCart: () => Promise<void>;
  applyCoupon: (couponCode: string) => Promise<CartMutationResult>;
  removeCoupon: () => Promise<CartMutationResult>;
  total: number;
  itemCount: number;
  isInCart: (id: number) => boolean;
  getItemQuantity: (id: number) => number;
  summary: CartSummary;
  appliedCoupon: AppliedCoupon | null;
  isLoadingCart: boolean;
}

const emptySummary: CartSummary = {
  subtotal: 0,
  communityDiscount: 0,
  discountedSubtotalBeforeCoupon: 0,
  couponDiscount: 0,
  discountedSubtotal: 0,
  tax: 0,
  total: 0,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token, user, isLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(emptySummary);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [isLoadingCart, setIsLoadingCart] = useState(false);

  const syncCartState = (payload: any) => {
    setItems(Array.isArray(payload?.items) ? payload.items : []);
    setSummary(payload?.summary || emptySummary);
    setAppliedCoupon(payload?.appliedCoupon || null);
    setItemCount(Number(payload?.itemCount || 0));
  };

  const resetCartState = () => {
    setItems([]);
    setSummary(emptySummary);
    setAppliedCoupon(null);
    setItemCount(0);
  };

  const refreshCart = async () => {
    if (!token || !user) {
      resetCartState();
      return;
    }

    setIsLoadingCart(true);
    try {
      const response = await fetch('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        resetCartState();
        return;
      }

      syncCartState(await response.json());
    } catch {
      resetCartState();
    } finally {
      setIsLoadingCart(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      void refreshCart();
    }
  }, [token, user?.id, user?.role, isLoading]);

  const mutateCart = async (input: RequestInfo | URL, init?: RequestInit): Promise<CartMutationResult> => {
    if (!token || !user) {
      return { ok: false, error: 'Please log in to manage your bag.' };
    }

    try {
      const response = await fetch(input, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, error: data.error || 'Unable to update your bag right now.' };
      }

      syncCartState(data);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Unable to update your bag right now.' };
    }
  };

  const addToCart = async (product: CartProduct) => {
    return mutateCart('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId: product.productId || product.id, quantity: 1 }),
    });
  };

  const updateQuantity = async (id: number, delta: number) => {
    const existingQuantity = items.find((item) => item.id === id)?.quantity || 0;
    return mutateCart(`/api/cart/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: Math.max(0, existingQuantity + delta) }),
    });
  };

  const removeFromCart = async (id: number) => {
    return mutateCart(`/api/cart/items/${id}`, { method: 'DELETE' });
  };

  const clearCart = async () => {
    return mutateCart('/api/cart/clear', { method: 'DELETE' });
  };

  const applyCoupon = async (couponCode: string) => {
    return mutateCart('/api/cart/apply-coupon', {
      method: 'POST',
      body: JSON.stringify({ couponCode }),
    });
  };

  const removeCoupon = async () => {
    return mutateCart('/api/cart/coupon', { method: 'DELETE' });
  };

  const isInCart = (id: number) => items.some((item) => item.id === id);
  const getItemQuantity = (id: number) => items.find((item) => item.id === id)?.quantity || 0;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        applyCoupon,
        removeCoupon,
        total: summary.total,
        itemCount,
        isInCart,
        getItemQuantity,
        summary,
        appliedCoupon,
        isLoadingCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
