import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Heart, Loader2, ShieldCheck, ShoppingCart, Star, Truck, Users } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductImage from '../components/ProductImage';

type Product = {
  id: number;
  productId: string;
  name?: string;
  title?: string;
  description?: string;
  category: string;
  subcategory: string;
  fabric: string;
  color: string;
  occasion: string;
  price: number;
  rating: number;
  stock: number;
  image?: string;
  image_url?: string;
};

type CommunityEvent = {
  id: number;
  event_id: number;
  product_id: number;
  event_title?: string;
  product_name: string;
  product_image?: string;
  society_name: string;
  minimum_quantity: number;
  minimum_participants?: number;
  current_participants: number;
  discount_percentage: number;
  event_deadline: string;
  end_date?: string;
  start_date?: string;
  event_duration_days?: number;
  status: string;
  remaining_time_label: string;
  progress_label: string;
  participants_needed?: number;
  participants_needed_label?: string;
  progress_percentage: number;
  joined: boolean;
  original_price: number;
  final_price: number;
};

type Participant = {
  id: number;
  customer_name: string;
  apartment_block?: string;
  joined_at: string;
};

type ReviewMessage = { tone: 'success' | 'error'; text: string } | null;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

function ProductRailCard({ product }: { product: Product }) {
  const productRouteId = product.productId || String(product.id);

  return (
    <Link to={`/product/${productRouteId}`} className="min-w-[220px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-[4/5] overflow-hidden bg-slate-100">
        <ProductImage product={product} alt={product.name || product.title || 'FASHIONest product'} className="h-full w-full object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{product.category}</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Star size={12} className="fill-current" />{product.rating.toFixed(1)}</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-950">{product.name || product.title}</h3>
        <p className="text-sm text-slate-500">{product.fabric} / {product.color}</p>
        <p className="text-base font-bold text-slate-950">{formatCurrency(product.price)}</p>
      </div>
    </Link>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, getItemQuantity, isInCart } = useCart();
  const { user, token } = useAuth();
  const addTimer = useRef<number | undefined>(undefined);
  const [product, setProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [saved, setSaved] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewMessage, setReviewMessage] = useState<ReviewMessage>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  const loadCommunityEvents = async (productDbId: number) => {
    if (!token || user?.role !== 'rwa') {
      setCommunityEvents([]);
      return;
    }

    const response = await fetch(`/api/group-buy/list?productId=${productDbId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setCommunityEvents(Array.isArray(data) ? data : []);
  };

  const loadParticipants = async (eventId: number) => {
    if (!token) return;
    const response = await fetch(`/api/group-buy/participants/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setParticipants(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const loadProductData = async () => {
      setIsLoadingProduct(true);
      try {
        const productsResponse = await fetch('/api/products');
        const productsData = await productsResponse.json();
        const catalogProducts = Array.isArray(productsData) ? productsData : [];
        setProducts(catalogProducts);

        const matchedProduct = catalogProducts.find((candidate: Product) => candidate.productId === id || String(candidate.id) === id);
        setProduct(matchedProduct || null);
        if (matchedProduct) {
          await loadCommunityEvents(matchedProduct.id);
        }
      } catch (error) {
        console.error('Failed to load product details:', error);
        setProducts([]);
        setProduct(null);
      } finally {
        setIsLoadingProduct(false);
      }
    };

    void loadProductData();
  }, [id, token, user?.role]);

  useEffect(() => () => window.clearTimeout(addTimer.current), []);

  const alreadyInBag = product ? isInCart(product.id) : false;
  const quantityInBag = product ? getItemQuantity(product.id) : 0;

  useEffect(() => {
    if (alreadyInBag) {
      addTimer.current = window.setTimeout(() => setIsAdding(false), 500);
      return () => window.clearTimeout(addTimer.current);
    }

    setIsAdding(false);
  }, [alreadyInBag]);

  const handleAddToBag = async () => {
    if (!product || alreadyInBag || isAdding) {
      return;
    }

    setIsAdding(true);
    const result = await addToCart(product);
    if (!result.ok) {
      setIsAdding(false);
      setReviewMessage({ tone: 'error', text: result.error || 'Unable to add this item to your bag right now.' });
    }
  };

  const openParticipants = async (eventDetails: CommunityEvent) => {
    setSelectedEvent(eventDetails);
    await loadParticipants(eventDetails.id);
  };

  const handleJoinCommunityDeal = async (eventId: number) => {
    if (!token) {
      navigate('/login');
      return;
    }

    const response = await fetch('/api/group-buy/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ event_id: eventId }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && product) {
      setReviewMessage({ tone: 'success', text: data.message || 'You joined the community deal.' });
      await loadCommunityEvents(product.id);
      return;
    }

    setReviewMessage({ tone: 'error', text: data.error || 'Unable to join this community deal right now.' });
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token || !product) {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setReviewMessage(null);

    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: product.productId || product.id, rating: Number(reviewRating), reviewText }),
    });
    const data = await response.json();

    if (response.ok) {
      setReviewText('');
      setReviewRating(5);
      setReviewMessage({ tone: 'success', text: 'Thanks for sharing your review.' });
    } else {
      setReviewMessage({ tone: 'error', text: data.error || 'Unable to submit your review right now.' });
    }

    setIsSubmitting(false);
  };

  if (isLoadingProduct) {
    return <div className="py-20 text-center text-slate-500">Loading product details...</div>;
  }

  if (!product) {
    return (
      <div className="space-y-4 py-20 text-center">
        <h1 className="text-3xl font-bold text-slate-950">Product not found</h1>
        <p className="text-sm text-slate-500">We could not find that style in the current FASHIONest catalog.</p>
        <Link to="/" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600">
          Back to home
        </Link>
      </div>
    );
  }

  const otherProducts = products.filter((candidate) => candidate.id !== product.id);
  const alsoViewed = [...otherProducts]
    .filter((candidate) => candidate.category === product.category || candidate.fabric === product.fabric)
    .sort((first, second) => {
      const firstScore = (first.category === product.category ? 3 : 0) + (first.fabric === product.fabric ? 2 : 0) - Math.abs(first.price - product.price) / 1000;
      const secondScore = (second.category === product.category ? 3 : 0) + (second.fabric === product.fabric ? 2 : 0) - Math.abs(second.price - product.price) / 1000;
      return secondScore - firstScore;
    })
    .slice(0, 8);
  const relatedProducts = [...otherProducts]
    .filter((candidate) => candidate.category === product.category)
    .sort((first, second) => (second.subcategory === product.subcategory ? 1 : 0) - (first.subcategory === product.subcategory ? 1 : 0) || second.rating - first.rating)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link to="/" className="font-medium transition hover:text-slate-950">Home</Link>
          <span>/</span>
          <span>{product.category}</span>
          <span>/</span>
          <span className="font-medium text-slate-600">{product.name || product.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"><ArrowLeft size={16} />Back</button>
          <Link to="/cart" className="text-sm font-semibold text-rose-600 transition hover:text-rose-700">Go to bag</Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-slate-200"><div className="aspect-[4/5] overflow-hidden bg-slate-100"><ProductImage product={product} alt={product.name || product.title || 'FASHIONest product'} className="h-full w-full object-cover" /></div></motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 rounded-[32px] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2"><div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{product.category}</div><div className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">{product.subcategory}</div></div>
            <h1 className="text-3xl font-bold text-slate-950">{product.name || product.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500"><div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700"><Star size={14} className="fill-current" />{product.rating?.toFixed(1) || '4.4'} rating</div><span>{product.fabric}</span><span>{product.color}</span><span>{product.stock} in stock</span></div>
            <p className="text-3xl font-black text-slate-950">{formatCurrency(product.price)}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Occasion</p><p className="mt-2 text-base font-semibold text-slate-950">{product.occasion}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Product ID</p><p className="mt-2 text-base font-semibold text-slate-950">{product.productId}</p></div></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Description</p><p className="mt-3 leading-7 text-slate-600">{product.description || 'A polished FASHIONest pick selected for festive wardrobes and everyday dressing.'}</p></div>

          <div className="space-y-3"><div className="flex flex-col gap-3 sm:flex-row"><motion.button type="button" onClick={() => void handleAddToBag()} disabled={alreadyInBag || isAdding} whileTap={alreadyInBag || isAdding ? undefined : { scale: 0.98 }} className={`flex-1 rounded-full px-5 py-4 text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed ${alreadyInBag ? 'bg-emerald-600 shadow-lg shadow-emerald-100' : isAdding ? 'bg-slate-800 shadow-lg shadow-slate-200' : 'bg-slate-950 hover:bg-rose-600'}`}><span className="inline-flex items-center gap-2">{isAdding ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Loader2 size={18} /></motion.span> : alreadyInBag ? <motion.span initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Check size={18} /></motion.span> : <ShoppingCart size={18} />}<span>{alreadyInBag ? 'Added' : isAdding ? 'Adding...' : 'Add to bag'}</span></span></motion.button><button type="button" onClick={() => setSaved((current) => !current)} className={`rounded-full border px-5 py-4 text-sm font-semibold transition ${saved ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-700 hover:border-slate-950 hover:text-slate-950'}`}><span className="inline-flex items-center gap-2"><Heart size={18} className={saved ? 'fill-current' : ''} />{saved ? 'Wishlisted' : 'Save'}</span></button></div><div className="min-h-5 text-sm font-medium text-emerald-600">{alreadyInBag ? `${quantityInBag} item${quantityInBag > 1 ? 's' : ''} currently in your bag.` : isAdding ? 'Updating your bag...' : ''}</div></div>

          <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600"><div className="flex items-center gap-2 font-semibold text-slate-950"><ShieldCheck size={18} className="text-emerald-500" />Quality checked</div><p className="mt-2">Curated for shoppers looking for reliable fashion picks and festive-ready styles.</p></div><div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600"><div className="flex items-center gap-2 font-semibold text-slate-950"><Truck size={18} className="text-sky-500" />Fast delivery</div><p className="mt-2">Apartment-ready delivery support and easy coordination for larger orders.</p></div></div>
        </motion.div>
      </div>

      {user?.role === 'rwa' && communityEvents.length > 0 ? <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-center gap-3"><Users size={18} className="text-rose-600" /><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Community deals</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Join a community buying event</h2></div></div><div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><p><span className="font-semibold text-slate-950">How Community Deals Work</span></p><p className="mt-2">1. Admin creates the deal from the admin panel. 2. Residents join together. 3. Once the minimum is reached, the community price unlocks for everyone in the event.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2">{communityEvents.map((event) => <article key={event.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">Community deal</p><h3 className="mt-2 text-lg font-bold text-slate-950">{event.event_title || product.name || product.title}</h3><p className="mt-1 text-sm text-slate-500">{event.progress_label}</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${event.status === 'active' ? 'bg-emerald-50 text-emerald-700' : event.status === 'expired' ? 'bg-slate-200 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>{event.status}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${event.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${event.progress_percentage}%` }} /></div><p className="mt-3 text-sm font-medium text-slate-700">{event.participants_needed_label}</p><div className="mt-4 grid gap-2 text-sm text-slate-500 sm:grid-cols-2"><p>Minimum participants: <span className="font-semibold text-slate-950">{event.minimum_participants || event.minimum_quantity}</span></p><p>Community discount: <span className="font-semibold text-emerald-600">{event.discount_percentage}%</span></p><p>{event.remaining_time_label}</p><p>Duration: <span className="font-semibold text-slate-950">{event.event_duration_days || 0} days</span></p></div><div className="mt-4 flex items-center gap-3"><span className="text-slate-400 line-through">{formatCurrency(event.original_price)}</span><span className="text-lg font-bold text-slate-950">{formatCurrency(event.final_price)}</span></div><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={event.joined || event.status === 'expired'} onClick={() => void handleJoinCommunityDeal(event.id)} className={`rounded-full px-4 py-3 text-sm font-semibold text-white ${event.joined ? 'bg-emerald-600' : event.status === 'expired' ? 'bg-slate-300' : 'bg-slate-950 hover:bg-rose-600'}`}>{event.joined ? 'Joined' : 'Join Deal'}</button><button type="button" onClick={() => void openParticipants(event)} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">View Participants</button></div></article>)}</div></section> : null}

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Review</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Rate this product</h2><p className="mt-2 text-sm text-slate-500">Share your experience with the product. You can mention sizing, fabric quality, finish, or delivery experience.</p></div>{user ? <form onSubmit={submitReview} className="mt-5 grid gap-4"><div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setReviewRating(value)} className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${reviewRating >= value ? 'border-amber-300 bg-amber-50 text-amber-500' : 'border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-amber-500'}`}><Star size={18} className={reviewRating >= value ? 'fill-current' : ''} /></button>)}</div><textarea rows={5} required value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="Write your review here" className="w-full resize-none rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm outline-none focus:border-rose-500" /><button type="submit" disabled={isSubmitting} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Submitting review...' : 'Submit Review'}</button></form> : <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Log in to submit a review for this product.</div>}{reviewMessage ? <p className={`mt-4 text-sm font-medium ${reviewMessage.tone === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{reviewMessage.text}</p> : null}</section>

      {alsoViewed.length > 0 ? <section className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recommendations</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Customers who viewed this item also viewed</h2></div><div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">{alsoViewed.map((item) => <div key={item.id}><ProductRailCard product={item} /></div>)}</div></section> : null}
      {relatedProducts.length > 0 ? <section className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Related</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Related Products</h2></div><div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">{relatedProducts.map((item) => <div key={item.id}><ProductRailCard product={item} /></div>)}</div></section> : null}
      {selectedEvent ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"><div className="w-full max-w-3xl rounded-[30px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Participants</p><h3 className="mt-2 text-2xl font-bold text-slate-950">{selectedEvent.event_title || selectedEvent.product_name}</h3><p className="mt-1 text-sm text-slate-500">{selectedEvent.society_name}</p></div><button type="button" onClick={() => setSelectedEvent(null)} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Close</button></div><div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"><tr><th className="px-4 py-4">User name</th><th className="px-4 py-4">Apartment / Block</th><th className="px-4 py-4 text-right">Join time</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white text-slate-600">{participants.map((participant) => <tr key={participant.id}><td className="px-4 py-4 font-medium text-slate-950">{participant.customer_name}</td><td className="px-4 py-4 text-slate-600">{participant.apartment_block || 'Apartment resident'}</td><td className="px-4 py-4 text-right font-medium text-slate-950">{new Date(participant.joined_at).toLocaleString()}</td></tr>)}</tbody></table>{participants.length === 0 ? <div className="px-4 py-12 text-center text-sm text-slate-500">No one has joined this deal yet.</div> : null}</div></div></div> : null}

    </div>
  );
}
