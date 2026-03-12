import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trash2, ShoppingBag, ArrowRight, CreditCard, Banknote, ChevronLeft, TicketPercent, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductImage from '../components/ProductImage';
import AddressPickerModal from '../components/AddressPickerModal';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

export default function Cart() {
  const {
    items,
    removeFromCart,
    updateQuantity,
    refreshCart,
    itemCount,
    summary,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { token, user, defaultAddress, setDefaultAddress } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const loadRazorpayScript = async () => {
    if (window.Razorpay) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createSystemOrder = async (paymentStatus: string, method: string, rzpOrderId?: string, rzpPaymentId?: string) => {
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        payment_method: method,
        payment_status: paymentStatus,
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        address_id: defaultAddress?.id,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      await refreshCart();
      navigate('/');
    } else {
      setCouponMessage({ tone: 'error', text: data.error || 'Failed to create order in system.' });
    }
    setIsProcessing(false);
  };

  const handleOnlinePayment = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      const isRazorpayReady = await loadRazorpayScript();
      if (!isRazorpayReady) {
        setCouponMessage({ tone: 'error', text: 'Unable to load the payment service right now.' });
        setIsProcessing(false);
        return;
      }
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ amount: summary.total }),
      });
      const razorpayOrder = await orderRes.json();

      const options = {
        key: 'rzp_test_dummy_id',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'FASHIONest',
        description: 'FASHIONest order',
        order_id: razorpayOrder.id,
        handler: async (response: any) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.status === 'success') {
            await createSystemOrder('Paid', 'ONLINE', response.razorpay_order_id, response.razorpay_payment_id);
          } else {
            setCouponMessage({ tone: 'error', text: 'Payment verification failed.' });
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#E11D48',
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (_error) {
      setCouponMessage({ tone: 'error', text: 'Failed to initiate payment.' });
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!defaultAddress) {
      setCouponMessage({ tone: 'error', text: 'Add a delivery address before checkout.' });
      setIsAddressModalOpen(true);
      return;
    }

    if (paymentMethod === 'ONLINE') {
      await handleOnlinePayment();
    } else {
      setIsProcessing(true);
      await createSystemOrder('Pending', 'COD');
    }
  };

  const handleApplyCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    setCouponMessage(null);
    setIsApplyingCoupon(true);

    const result = await applyCoupon(couponCode);
    if (result.ok) {
      setCouponMessage({ tone: 'success', text: 'Coupon applied successfully.' });
      setCouponCode('');
    } else {
      setCouponMessage({ tone: 'error', text: result.error || 'Unable to apply coupon right now.' });
    }

    setIsApplyingCoupon(false);
  };

  const handleRemoveCoupon = async () => {
    const result = await removeCoupon();
    if (result.ok) {
      setCouponMessage({ tone: 'success', text: 'Coupon removed from your bag.' });
    } else {
      setCouponMessage({ tone: 'error', text: result.error || 'Unable to remove coupon right now.' });
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex items-center gap-2 text-sm text-slate-400">
            <Link reloadDocument to="/" className="font-medium transition hover:text-slate-950">Home</Link>
            <span>/</span>
            <span className="font-medium text-slate-600">Shopping Bag</span>
          </nav>
          <Link reloadDocument to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950">
            <ChevronLeft size={16} />Back to home
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <ShoppingBag size={32} />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-slate-950">Your bag is empty</h1>
            <p className="mt-3 text-sm text-slate-500">Looks like you haven't added any items yet.</p>
            <Link reloadDocument to="/" className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-600">
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Bag</p>
              <h1 className="text-3xl font-bold text-slate-950">Shopping Bag ({itemCount})</h1>
              <p className="text-sm text-slate-500">Review your items, update quantities, and complete checkout.</p>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-950">
                    <MapPin size={18} className="text-rose-600" />
                    <h2 className="text-lg font-bold">Delivery Address</h2>
                  </div>
                  {defaultAddress ? (
                    <div className="mt-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-950">{defaultAddress.recipient_name}</p>
                      <p>{defaultAddress.full_address}</p>
                      <p className="mt-1">Phone: {defaultAddress.phone_number}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Select your delivery address before checkout.</p>
                  )}
                </div>
                <button type="button" onClick={() => setIsAddressModalOpen(true)} className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950">
                  {defaultAddress ? 'Change Address' : 'Add Address'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                {items.map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <ProductImage product={item} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="font-bold text-slate-950">{item.title}</h2>
                          <p className="text-sm text-slate-500">{item.fabric} / {item.color}</p>
                          {item.community_discount_applied ? (
                            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Community Discount Applied
                              <span>{item.community_discount_percentage}% off</span>
                            </p>
                          ) : null}
                        </div>
                        <button onClick={() => void removeFromCart(item.id)} className="p-2 text-slate-400 transition-colors hover:text-rose-600">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                          <button onClick={() => void updateQuantity(item.id, -1)} className="flex h-8 w-8 items-center justify-center font-bold text-slate-500 transition-colors hover:text-rose-600">-</button>
                          <span className="w-8 text-center font-bold text-slate-950">{item.quantity}</span>
                          <button onClick={() => void updateQuantity(item.id, 1)} className="flex h-8 w-8 items-center justify-center font-bold text-slate-500 transition-colors hover:text-rose-600">+</button>
                        </div>
                        <div className="text-right">
                          {item.community_discount_applied ? <p className="text-sm text-slate-400 line-through">{formatCurrency(item.line_subtotal || item.price * item.quantity)}</p> : null}
                          <p className="text-lg font-bold text-rose-600">{formatCurrency(item.line_total || item.price * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-rose-50 p-3 text-rose-600"><TicketPercent size={18} /></div>
                    <div>
                      <h3 className="text-base font-bold text-slate-950">Apply Coupon</h3>
                    </div>
                  </div>
                  <form onSubmit={handleApplyCoupon} className="mt-4 flex gap-3">
                    <input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white"
                    />
                    <button type="submit" disabled={isApplyingCoupon} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60">
                      {isApplyingCoupon ? 'Applying...' : 'Apply'}
                    </button>
                  </form>
                  {appliedCoupon ? (
                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-emerald-700">{appliedCoupon.coupon_code}</p>
                      </div>
                      <button type="button" onClick={() => void handleRemoveCoupon()} className="font-semibold text-rose-600">
                        Remove
                      </button>
                    </div>
                  ) : null}
                  {couponMessage ? <p className={`mt-4 text-sm font-medium ${couponMessage.tone === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{couponMessage.text}</p> : null}
                </div>

                <div className="sticky top-24 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-bold text-slate-950">Order Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Community Discount</span><span className="font-medium text-emerald-600">- {formatCurrency(summary.communityDiscount)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Coupon Discount</span><span className="font-medium text-emerald-600">- {formatCurrency(summary.couponDiscount)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Discounted Subtotal</span><span>{formatCurrency(summary.discountedSubtotal)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Tax (18%)</span><span>{formatCurrency(summary.tax)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>FASHIONest Delivery</span><span className="font-medium text-emerald-600">FREE</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-bold text-slate-950"><span>Total</span><span>{formatCurrency(summary.total)}</span></div>
                  </div>

                  <div className="mt-8 space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-900">Payment Method</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <button onClick={() => setPaymentMethod('ONLINE')} className={`flex items-center justify-between rounded-xl border-2 p-4 transition-all ${paymentMethod === 'ONLINE' ? 'border-rose-600 bg-rose-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center space-x-3"><div className={`rounded-lg p-2 ${paymentMethod === 'ONLINE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}><CreditCard size={18} /></div><div className="text-left"><p className="text-sm font-bold text-slate-900">Online Payment</p><p className="text-xs text-slate-500">UPI, Cards, Netbanking</p></div></div>
                        {paymentMethod === 'ONLINE' && <div className="h-2 w-2 rounded-full bg-rose-600" />}
                      </button>
                      <button onClick={() => setPaymentMethod('COD')} className={`flex items-center justify-between rounded-xl border-2 p-4 transition-all ${paymentMethod === 'COD' ? 'border-rose-600 bg-rose-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center space-x-3"><div className={`rounded-lg p-2 ${paymentMethod === 'COD' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Banknote size={18} /></div><div className="text-left"><p className="text-sm font-bold text-slate-900">Cash on Delivery</p><p className="text-xs text-slate-500">Pay when you receive</p></div></div>
                        {paymentMethod === 'COD' && <div className="h-2 w-2 rounded-full bg-rose-600" />}
                      </button>
                    </div>
                  </div>

                  <button onClick={handleCheckout} disabled={isProcessing} className="mt-6 flex w-full items-center justify-center space-x-2 rounded-xl bg-rose-600 py-4 font-bold text-white shadow-lg shadow-rose-100 transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {isProcessing ? (
                      <span className="flex items-center space-x-2"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="h-5 w-5 rounded-full border-2 border-white border-t-transparent" /><span>Processing...</span></span>
                    ) : (
                      <><span>{paymentMethod === 'ONLINE' ? 'Pay & Place Order' : 'Confirm Order (COD)'}</span><ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AddressPickerModal
        isOpen={isAddressModalOpen}
        token={token}
        userName={user?.name}
        userPhone={user?.phone}
        currentAddress={defaultAddress}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressChange={(address) => {
          setDefaultAddress(address);
          if (address) {
            setCouponMessage({ tone: 'success', text: 'Delivery address updated.' });
          }
          setIsAddressModalOpen(false);
        }}
      />
    </>
  );
}
