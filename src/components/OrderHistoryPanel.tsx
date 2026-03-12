import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Calendar, CreditCard, Loader2, MapPin, Package, Truck, X } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type DashboardRole = 'customer' | 'rwa';

type OrderSummary = {
  id: number;
  total_price: number;
  order_status: string;
  payment_method: string;
  payment_method_label?: string;
  payment_status: string;
  created_at: string;
  items_list: string;
  can_cancel?: boolean;
  can_pay_online?: boolean;
};

type OrderDetail = OrderSummary & {
  address: {
    recipient_name: string;
    phone_number: string;
    house_number: string;
    street: string;
    area: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: Array<{
    product_id: string;
    title: string;
    quantity: number;
    price: number;
    line_total: number;
  }>;
  tracking_partner: string;
  tracking_number: string;
  timeline: Array<{ label: string; state: 'completed' | 'current' | 'pending' | 'cancelled' }>;
};

type OrderHistoryPanelProps = {
  role: DashboardRole;
  orders: OrderSummary[];
  token: string | null;
  onRefreshOrders: () => Promise<void>;
};

const cancellationReasons = [
  'Ordered by mistake',
  'Found cheaper elsewhere',
  'Delivery time too long',
  'Changed my mind',
  'Duplicate order',
  'Other',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const loadRazorpayScript = async () => {
  if (window.Razorpay) return true;

  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function OrderHistoryPanel({ role, orders, token, onRefreshOrders }: OrderHistoryPanelProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [isPayingOnline, setIsPayingOnline] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderSummary | null>(null);
  const [cancelReason, setCancelReason] = useState(cancellationReasons[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const sortedOrders = useMemo(() => [...orders].sort((first, second) => new Date(second.created_at).getTime() - new Date(first.created_at).getTime()), [orders]);

  const fetchOrderDetail = async (orderId: number) => {
    if (!token) return;
    setSelectedOrderId(orderId);
    setIsLoadingOrder(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ tone: 'error', text: data.error || 'Unable to load order details.' });
        return;
      }
      setSelectedOrder(data);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const handlePayOnline = async (order: OrderSummary) => {
    if (!token) return;
    setIsPayingOnline(order.id);
    try {
      const isReady = await loadRazorpayScript();
      if (!isReady) {
        setFeedback({ tone: 'error', text: 'Unable to load online payments right now.' });
        return;
      }

      const orderResponse = await fetch(`/api/orders/${order.id}/pay-online/create-order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const razorpayOrder = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        setFeedback({ tone: 'error', text: razorpayOrder.error || 'This order cannot be converted right now.' });
        return;
      }

      const options = {
        key: 'rzp_test_dummy_id',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'FASHIONest',
        description: `Order #${order.id}`,
        order_id: razorpayOrder.id,
        handler: async (response: any) => {
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify(response),
          });
          const verifyData = await verifyResponse.json().catch(() => ({}));
          if (!verifyResponse.ok || verifyData.status !== 'success') {
            setFeedback({ tone: 'error', text: 'Payment verification failed.' });
            return;
          }

          const updateResponse = await fetch(`/api/orders/${order.id}/pay-online`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify(response),
          });
          const updateData = await updateResponse.json().catch(() => ({}));
          if (!updateResponse.ok) {
            setFeedback({ tone: 'error', text: updateData.error || 'Unable to update the payment status.' });
            return;
          }

          setFeedback({ tone: 'success', text: 'Payment Status: Paid Online' });
          setSelectedOrder(updateData.order || null);
          await onRefreshOrders();
        },
        modal: {
          ondismiss: () => setIsPayingOnline(null),
        },
        theme: { color: '#E11D48' },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } finally {
      setIsPayingOnline(null);
    }
  };

  const handleCancelOrder = async () => {
    if (!token || !cancelTarget) return;
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/orders/${cancelTarget.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ reason: cancelReason, otherReason: cancelNote }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({ tone: 'error', text: data.error || 'Unable to cancel this order right now.' });
        return;
      }
      setFeedback({ tone: 'success', text: data.message || 'Your order has been cancelled successfully.' });
      setCancelTarget(null);
      setCancelReason(cancellationReasons[0]);
      setCancelNote('');
      if (selectedOrder?.id === cancelTarget.id) {
        setSelectedOrder(data.order || null);
      }
      await onRefreshOrders();
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Orders</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-950">{role === 'rwa' ? 'Your apartment orders' : 'Your order history'}</h2>
        <p className="mt-2 text-sm text-slate-500">Track statuses, review addresses, convert COD orders to prepaid, and cancel eligible orders before they ship.</p>
      </div>

      {feedback ? <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${feedback.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{feedback.text}</div> : null}

      {sortedOrders.length === 0 ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">No orders yet.</div> : <div className="space-y-5">{sortedOrders.map((order) => <article key={order.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-3"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Order #{order.id}</p><h3 className="mt-2 text-xl font-bold text-slate-950">Date: {formatDate(order.created_at)}</h3><p className="mt-1 text-sm text-slate-500">Status: {order.order_status}</p></div><div><p className="text-sm font-semibold text-slate-700">Items:</p><p className="mt-1 text-sm text-slate-500">{order.items_list}</p></div></div><div className="lg:text-right"><p className="text-sm font-medium text-slate-500">Amount</p><p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(order.total_price)}</p><p className="mt-2 text-sm text-slate-500">{order.payment_method_label || (order.payment_method === 'COD' ? 'Cash on Delivery' : 'UPI / Card / Netbanking')}</p></div></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => void fetchOrderDetail(order.id)} className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600">View Details</button>{order.can_pay_online ? <button type="button" onClick={() => void handlePayOnline(order)} disabled={isPayingOnline === order.id} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">{isPayingOnline === order.id ? 'Opening payment...' : 'Pay Online Now'}</button> : null}{order.can_cancel ? <button type="button" onClick={() => setCancelTarget(order)} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100">Cancel Order</button> : null}</div></article>)}</div>}

      <AnimatePresence>
        {selectedOrderId ? (
          <>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" onClick={() => { setSelectedOrderId(null); setSelectedOrder(null); }} className="fixed inset-0 z-[110] bg-slate-950/55" />
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} className="fixed left-1/2 top-1/2 z-[120] h-[85vh] w-[min(94vw,980px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[32px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)] lg:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Order details</p>
                  <h3 className="mt-2 text-3xl font-black text-slate-950">Order #{selectedOrderId}</h3>
                  <p className="mt-1 text-sm text-slate-500">Placed on: {selectedOrder ? formatDate(selectedOrder.created_at) : ''}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">Status: {selectedOrder?.order_status || 'Loading...'}</p>
                </div>
                <button type="button" onClick={() => { setSelectedOrderId(null); setSelectedOrder(null); }} className="rounded-full border border-slate-200 p-2 text-slate-500"><X size={18} /></button>
              </div>

              {isLoadingOrder || !selectedOrder ? <div className="flex items-center gap-3 px-1 py-10 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Loading order details...</div> : <div className="grid gap-6 pt-6 lg:grid-cols-[1.1fr_0.9fr]"><section className="space-y-6"><div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-2 text-slate-950"><MapPin size={18} className="text-rose-600" /><h4 className="text-base font-bold">Delivery Address</h4></div><div className="mt-4 space-y-1 text-sm text-slate-600"><p className="font-semibold text-slate-950">{selectedOrder.address.recipient_name}</p><p>{selectedOrder.address.house_number}</p><p>{selectedOrder.address.street}</p><p>{selectedOrder.address.area}</p><p>{selectedOrder.address.city} - {selectedOrder.address.postal_code}</p><p>{selectedOrder.address.state}</p><p>Phone: {selectedOrder.address.phone_number}</p></div></div><div className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-slate-950"><CreditCard size={18} className="text-rose-600" /><h4 className="text-base font-bold">Payment Method</h4></div><div className="mt-4 text-sm text-slate-600"><p className="font-semibold text-slate-950">{selectedOrder.payment_method === 'COD' ? 'Cash on Delivery' : 'UPI / Card / Netbanking'}</p><p className="mt-1">Payment Status: {selectedOrder.payment_status}</p></div>{selectedOrder.can_pay_online ? <button type="button" onClick={() => void handlePayOnline(selectedOrder)} disabled={isPayingOnline === selectedOrder.id} className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600">{isPayingOnline === selectedOrder.id ? 'Opening payment...' : 'Pay Online Now'}<ArrowRight size={14} /></button> : null}</div><div className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-slate-950"><Package size={18} className="text-rose-600" /><h4 className="text-base font-bold">Items</h4></div><div className="mt-4 grid gap-3">{selectedOrder.items.map((item) => <div key={`${selectedOrder.id}-${item.product_id}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-950">{item.title}</p><p className="mt-1 text-slate-500">Qty {item.quantity}</p></div><p className="font-semibold text-slate-950">{formatCurrency(item.line_total)}</p></div></div>)}</div></div></section><section className="space-y-6"><div className="rounded-[28px] border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-slate-950"><Truck size={18} className="text-rose-600" /><h4 className="text-base font-bold">Delivery Updates</h4></div><div className="mt-4 space-y-4">{selectedOrder.timeline.map((step) => <div key={step.label} className="flex items-start gap-3"><div className={`mt-1 h-3 w-3 rounded-full ${step.state === 'completed' ? 'bg-emerald-500' : step.state === 'current' ? 'bg-rose-600' : step.state === 'cancelled' ? 'bg-slate-300' : 'bg-slate-200'}`} /><div><p className="font-semibold text-slate-950">{step.label}</p><p className="text-sm text-slate-500">{step.state === 'current' ? 'In progress' : step.state === 'completed' ? 'Completed' : step.state === 'cancelled' ? 'Not applicable after cancellation' : 'Pending'}</p></div></div>)}</div><div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600"><p>Tracking partner: {selectedOrder.tracking_partner}</p><p className="mt-1">Tracking number: {selectedOrder.tracking_number}</p></div></div>{selectedOrder.can_cancel ? <button type="button" onClick={() => setCancelTarget(selectedOrder)} className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">Cancel Order</button> : null}</section></div>}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cancelTarget ? (
          <>
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" onClick={() => setCancelTarget(null)} className="fixed inset-0 z-[130] bg-slate-950/55" />
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.98 }} className="fixed left-1/2 top-1/2 z-[140] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Cancel order</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">Order #{cancelTarget.id}</h3>
                  <p className="mt-1 text-sm text-slate-500">Choose a reason so we can update the order correctly.</p>
                </div>
                <button type="button" onClick={() => setCancelTarget(null)} className="rounded-full border border-slate-200 p-2 text-slate-500"><X size={18} /></button>
              </div>
              <div className="mt-5 space-y-4">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Reason</span>
                  <select value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white">{cancellationReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select>
                </label>
                {cancelReason === 'Other' ? <label><span className="mb-2 block text-sm font-semibold text-slate-700">Tell us more</span><textarea value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" placeholder="Type your cancellation note" /></label> : null}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setCancelTarget(null)} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Keep order</button>
                  <button type="button" onClick={() => void handleCancelOrder()} disabled={isCancelling} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70">{isCancelling ? <Loader2 size={16} className="animate-spin" /> : null}{isCancelling ? 'Cancelling...' : 'Confirm cancellation'}</button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
