import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  Check,
  ChevronDown,
  Heart,
  Headphones,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  User,
  Users,
  X,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import ProductImage from './ProductImage';
import AddressPickerModal from './AddressPickerModal';
import OrderHistoryPanel from './OrderHistoryPanel';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

type DashboardRole = 'customer' | 'rwa';
type SortOption = 'recommended' | 'whats-new' | 'popularity' | 'better-discount' | 'price-high' | 'price-low' | 'rating';
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
  image?: string;
  image_url?: string;
  stock: number;
  created_at?: string;
};
type CatalogProduct = Product & { name: string; title: string; brand: string; gender: 'Women'; discount: number; isFeaturedUpload: boolean; featuredRank: number | null };
type Order = {
  id: number;
  total_price: number;
  order_status: string;
  payment_method: string;
  payment_status: string;
  customer_name?: string;
  delivery_partner?: string;
  tracking_id?: string;
  created_at: string;
  items_list: string;
};
type GroupBuyEvent = { id: number; event_id: number; product_id: number; event_title?: string; product_name: string; product_image?: string; product_product_id?: string; society_name: string; minimum_quantity: number; minimum_participants?: number; current_participants: number; discount_percentage: number; event_deadline: string; end_date?: string; start_date?: string; event_duration_days?: number; created_by: number; status: string; remaining_time_label: string; progress_label: string; participants_needed?: number; participants_needed_label?: string; progress_percentage: number; joined: boolean; original_price: number; final_price: number };
type Participant = { id: number; customer_name: string; apartment_block?: string; joined_at: string };
type StatusMessage = { tone: 'success' | 'error'; text: string };
type MarketplaceDashboardProps = { role: DashboardRole };

const categoryShortcuts = ['All', 'Sarees', 'Kurtas', 'Blouses', 'Dresses', 'Kurta Sets'];
const categoryMeta: Record<string, { description: string; highlights: string[] }> = {
  Sarees: { description: 'Kanchipuram, Banarasi, linen, organza, and cotton sarees.', highlights: ['Kanchipuram Silks', 'Banarasi Silks', 'Linen Sarees'] },
  Kurtas: { description: 'Anarkali, straight, printed, and embroidered kurtas.', highlights: ['Anarkali Kurtas', 'Printed Kurtas', 'Straight Kurtas'] },
  Blouses: { description: 'Silk, brocade, readymade, and designer blouse styles.', highlights: ['Silk Blouses', 'Readymade Blouses', 'Designer Blouses'] },
  Dresses: { description: 'Ethnic maxi, festive, and indo-western dresses.', highlights: ['Ethnic Dresses', 'Festive Dresses', 'Printed Dresses'] },
  'Kurta Sets': { description: 'Cotton, festive, printed, and chanderi kurta sets.', highlights: ['Cotton Sets', 'Festive Sets', 'Chanderi Sets'] },
};
const footerColumns = [
  { title: 'Shop', links: ['Sarees', 'Kurtas', 'Blouses', 'Dresses', 'Kurta Sets'] },
  { title: 'Customer Support', links: ['Help Center', 'Track Order', 'Returns'] },
  { title: 'Community', links: ['Group Buy', 'Apartment Deals'] },
  { title: 'About', links: ['About FASHIONest', 'Contact Us'] },
];
const rwaCommunityDeals = [
  { id: 1, productName: 'Kanchipuram Silk Saree', minimumQuantity: 10, discount: '12%', note: 'Perfect for apartment festive orders and wedding gifting.' },
  { id: 2, productName: 'Banarasi Silk Saree', minimumQuantity: 25, discount: '18%', note: 'Bulk community rate for premium celebration shopping.' },
  { id: 3, productName: 'Readymade Silk Blouse', minimumQuantity: 15, discount: '10%', note: 'Easy coordinated blouse bundles for society fashion drives.' },
];
const sortOptions: { label: string; value: SortOption }[] = [
  { label: 'Recommended', value: 'recommended' },
  { label: "What's New", value: 'whats-new' },
  { label: 'Popularity', value: 'popularity' },
  { label: 'Better Discount', value: 'better-discount' },
  { label: 'Price: High to Low', value: 'price-high' },
  { label: 'Price: Low to High', value: 'price-low' },
  { label: 'Customer Rating', value: 'rating' },
];
const ratingOptions = [
  { label: '4 and above', value: 4 },
  { label: '3 and above', value: 3 },
  { label: '2 and above', value: 2 },
];
const brandPool = ['Aarika Looms', 'Saanvi Weaves', 'Zari Studio', 'Nila Atelier', 'Vastra Bloom', 'Ira Ethnics'];
const baseSuggestions = ['Saree for Women', 'Kanchipuram Saree', 'Banarasi Saree', 'Silk Saree', 'Blouse Designs'];
const featuredSareeProductIds = ['SR-101', 'SR-102', 'SR-103', 'SR-104', 'SR-105', 'SR-106', 'SR-107', 'SR-108', 'SR-109', 'SR-110', 'SR-111', 'SR-112', 'SR-113', 'SR-114', 'SR-115'];
const featuredSareeIndex = new Map(featuredSareeProductIds.map((productId, index) => [productId, index]));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const normalizeText = (value: string) => value.trim().toLowerCase();
const hashText = (value: string) => value.split('').reduce((sum, character, index) => sum + character.charCodeAt(0) * (index + 1), 0);
const deriveBrand = (product: Product) => brandPool[hashText(product.productId || `${product.category}-${product.subcategory}-${product.id}`) % brandPool.length];
const deriveDiscount = (product: Product) => [10, 12, 15, 18, 22][hashText(product.productId || String(product.id)) % 5];
const singularCategoryLabel = (category: string) => {
  if (category === 'Sarees') return 'Saree';
  if (category === 'Kurtas') return 'Kurta';
  if (category === 'Blouses') return 'Blouse';
  if (category === 'Dresses') return 'Dress';
  if (category === 'Kurta Sets') return 'Kurta Set';
  return category;
};
const detectCategoryFromText = (value: string) => {
  const normalized = normalizeText(value);
  if (normalized.includes('saree')) return 'Sarees';
  if (normalized.includes('kurta set')) return 'Kurta Sets';
  if (normalized.includes('kurta')) return 'Kurtas';
  if (normalized.includes('blouse')) return 'Blouses';
  if (normalized.includes('dress')) return 'Dresses';
  return 'All';
};

const sortProducts = (products: CatalogProduct[], sortBy: SortOption) => {
  const cloned = [...products];
  if (sortBy === 'whats-new') return cloned.sort((a, b) => (b.created_at ? new Date(b.created_at).getTime() : b.id) - (a.created_at ? new Date(a.created_at).getTime() : a.id));
  if (sortBy === 'popularity') return cloned.sort((a, b) => b.rating * 100 + b.stock + b.discount - (a.rating * 100 + a.stock + a.discount));
  if (sortBy === 'better-discount') return cloned.sort((a, b) => b.discount - a.discount || b.rating - a.rating);
  if (sortBy === 'price-high') return cloned.sort((a, b) => b.price - a.price);
  if (sortBy === 'price-low') return cloned.sort((a, b) => a.price - b.price);
  if (sortBy === 'rating') return cloned.sort((a, b) => b.rating - a.rating || a.price - b.price);
  return cloned.sort((a, b) => b.rating * 10 + b.discount + Math.min(b.stock, 25) - (a.rating * 10 + a.discount + Math.min(a.stock, 25)));
};

const prioritizeFeaturedProducts = (products: CatalogProduct[]) => {
  const featured = products
    .filter((product) => product.isFeaturedUpload)
    .sort((first, second) => (first.featuredRank ?? 999) - (second.featuredRank ?? 999));
  const nonFeatured = products.filter((product) => !product.isFeaturedUpload);
  return [...featured, ...nonFeatured];
};

const buildSearchSuggestions = (products: CatalogProduct[], search: string) => {
  const suggestionPool = [...baseSuggestions];
  products.forEach((product) => {
    const singularCategory = singularCategoryLabel(product.category);
    suggestionPool.push(product.name);
    suggestionPool.push(product.subcategory);
    suggestionPool.push(`${product.fabric} ${singularCategory}`);
    suggestionPool.push(`${singularCategory} for Women`);
    suggestionPool.push(`${product.subcategory} ${singularCategory}`.trim());
  });
  const seen = new Set<string>();
  const deduped = suggestionPool.filter((item) => {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  if (!search.trim()) return deduped.slice(0, 6);
  const normalizedSearch = normalizeText(search);
  return deduped.filter((item) => normalizeText(item).includes(normalizedSearch)).slice(0, 8);
};

function RatingPill({ value }: { value: number }) {
  return <div className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm"><Star size={12} className="fill-current text-amber-400" />{value.toFixed(1)}</div>;
}

function ProductCard({ product, isWishlisted, isAdded, quantityInBag, onToggleWishlist, onAddToBag, onNotify }: { product: CatalogProduct; isWishlisted: boolean; isAdded: boolean; quantityInBag: number; onToggleWishlist: (productId: number) => void; onAddToBag: (product: CatalogProduct) => Promise<{ ok: boolean; error?: string }>; onNotify: (tone: StatusMessage['tone'], text: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();
  const productPath = `/product/${product.productId || product.id}`;

  useEffect(() => {
    if (isAdded) {
      const timer = window.setTimeout(() => setIsAdding(false), 500);
      return () => window.clearTimeout(timer);
    }

    setIsAdding(false);
  }, [isAdded]);

  const handleAddToBag = async (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    if (isAdded || isAdding) return;
    setIsAdding(true);
    const result = await onAddToBag(product);
    if (!result.ok) {
      setIsAdding(false);
      onNotify('error', result.error || 'Unable to add this item to your bag right now.');
    }
  };
  const handleOpenProduct = () => {
    navigate(productPath);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenProduct();
    }
  };

  return <motion.article whileHover={{ y: -4 }} onClick={handleOpenProduct} onKeyDown={handleCardKeyDown} role="link" tabIndex={0} className={`group cursor-pointer overflow-hidden rounded-[26px] border bg-white shadow-sm transition-shadow hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] ${product.isFeaturedUpload ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200'}`}><div className="relative aspect-[4/5] overflow-hidden bg-slate-100"><ProductImage product={product} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /><button type="button" onClick={(event) => { event.stopPropagation(); onToggleWishlist(product.id); }} className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border transition ${isWishlisted ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-white/70 bg-white/90 text-slate-500'}`}><Heart size={16} className={isWishlisted ? 'fill-current' : ''} /></button><div className="absolute left-3 top-3 z-10 flex flex-col gap-2"><RatingPill value={product.rating || 4.4} />{product.isFeaturedUpload ? <span className="inline-flex rounded-full bg-rose-600/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Top Saree</span> : null}</div><div className="absolute bottom-3 left-3 z-10 inline-flex rounded-full bg-slate-950/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">{product.brand}</div></div><div className="space-y-3 p-4"><div className="space-y-2"><div className="flex flex-wrap gap-2"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{product.category}</span><span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">{product.subcategory}</span></div><div className="block text-sm font-semibold text-slate-950 transition group-hover:text-rose-600">{product.name}</div><p className="text-sm text-slate-500">{product.fabric} / {product.color}</p></div><div className="flex items-center justify-between gap-3"><div><p className="text-base font-bold text-slate-950">{formatCurrency(product.price)}</p><p className="text-xs font-semibold text-emerald-600">Up to {product.discount}% off</p></div><span className="text-xs font-semibold text-slate-600 transition group-hover:text-rose-600">Quick view</span></div><motion.button type="button" onClick={(event) => void handleAddToBag(event)} disabled={isAdded || isAdding} whileTap={isAdded || isAdding ? undefined : { scale: 0.98 }} className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed ${isAdded ? 'bg-emerald-600 shadow-lg shadow-emerald-100' : isAdding ? 'bg-slate-800 shadow-lg shadow-slate-200' : 'bg-slate-950 hover:bg-rose-600'}`}><span className="inline-flex items-center gap-2">{isAdding ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Loader2 size={16} /></motion.span> : isAdded ? <motion.span initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Check size={16} /></motion.span> : <ShoppingBag size={16} />}<span>{isAdded ? 'Added' : isAdding ? 'Adding...' : 'Add to bag'}</span></span></motion.button><div className="min-h-5 text-xs font-medium text-emerald-600">{isAdded ? `${quantityInBag} item${quantityInBag > 1 ? 's' : ''} in bag` : isAdding ? 'Updating your bag...' : ''}</div></div></motion.article>;
}
function CatalogFilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="border-b border-slate-100 pb-3"><h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">{title}</h3></div><div className="mt-4 grid gap-3">{children}</div></section>;
}

function CheckboxFilter({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-600"><span>{label}</span><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" /></label>;
}

export default function MarketplaceDashboard({ role }: MarketplaceDashboardProps) {
  const { user, token, logout, defaultAddress, setDefaultAddress } = useAuth();
  const { itemCount, addToCart, getItemQuantity, isInCart } = useCart();
  const navigate = useNavigate();
  const messageTimer = useRef<number | undefined>(undefined);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<GroupBuyEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GroupBuyEvent | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [activeScreen, setActiveScreen] = useState<'home' | 'orders' | 'community' | 'wishlist'>('home');
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [isEventComposerOpen, setIsEventComposerOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ eventTitle: '', productId: '', minimumQuantity: '10', discountPercentage: '12', durationDays: '5', startDate: new Date().toISOString().slice(0, 10) });
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['Women']);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [priceCap, setPriceCap] = useState(0);
  const communityRole = user?.community_role || (role === 'rwa' ? 'coordinator' : user?.role || 'customer');
  const canCreateCommunityDeals = role === 'rwa' && communityRole !== 'resident';
  const canJoinCommunityDeals = role === 'rwa';

  const showMessage = (tone: StatusMessage['tone'], text: string) => {
    setStatusMessage({ tone, text });
    window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setStatusMessage(null), 2600);
  };

  useEffect(() => () => window.clearTimeout(messageTimer.current), []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchWrapperRef.current?.contains(event.target as Node)) {
        setIsSuggestionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const resetCatalogControls = () => {
    setSortBy('recommended');
    setSelectedGenders(['Women']);
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedFabrics([]);
    setSelectedOccasions([]);
    setMinRating(0);
    setPriceCap(0);
  };

  const openHome = () => {
    setActiveScreen('home');
    setSelectedCategory('All');
    setSearch('');
    setShowAllProducts(false);
    resetCatalogControls();
    navigate('/');
  };

  const openCategory = (category: string) => {
    setActiveScreen('home');
    setSelectedCategory(category);
    setSearch('');
    setShowAllProducts(false);
    resetCatalogControls();
    setIsMobileMenuOpen(false);
  };

  const openFullCatalog = () => {
    setActiveScreen('home');
    setSelectedCategory('All');
    setShowAllProducts(true);
    resetCatalogControls();
  };

  const loadProducts = async () => {
    const response = await fetch('/api/products');
    const data = await response.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  const loadOrders = async () => {
    if (!token) return;
    const endpoint = role === 'rwa' ? '/api/rwa/orders' : '/api/orders/history';
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    setOrders(Array.isArray(data) ? data : []);
  };

  const fetchParticipants = async (eventId: number, persist: boolean) => {
    if (!token) return [];
    const response = await fetch(`/api/group-buy/participants/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    const items = Array.isArray(data) ? data : [];
    if (persist) setParticipants(items);
    return items;
  };

  const loadEvents = async (productId?: number) => {
    if (role !== 'rwa' || !token) return;
    const query = productId ? `?productId=${productId}` : '';
    const response = await fetch(`/api/group-buy/list${query}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    setEvents(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    void loadProducts();
    void loadOrders();
    void loadEvents();
  }, [role, token, user?.society_name]);

  const catalogProducts: CatalogProduct[] = products.map((product) => {
    const featuredRank = featuredSareeIndex.get(product.productId || '');
    return {
      ...product,
      name: product.name || product.title || 'FASHIONest style',
      title: product.title || product.name || 'FASHIONest style',
      brand: deriveBrand(product),
      gender: 'Women',
      discount: deriveDiscount(product),
      isFeaturedUpload: featuredRank !== undefined,
      featuredRank: featuredRank ?? null,
    };
  });

  const normalizedSearch = normalizeText(search);
  const baseCatalogProducts = catalogProducts.filter((product) => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const haystack = [product.name, product.title, product.category, product.subcategory, product.brand, product.fabric, product.color, product.occasion, product.gender].join(' ').toLowerCase();
    return matchesCategory && (!normalizedSearch || haystack.includes(normalizedSearch));
  });

  const effectiveBaseProducts = baseCatalogProducts.length > 0 ? baseCatalogProducts : catalogProducts;
  const brandOptions = [...new Set(effectiveBaseProducts.map((product) => product.brand))].sort((a, b) => a.localeCompare(b));
  const colorOptions = [...new Set(effectiveBaseProducts.map((product) => product.color))].sort((a, b) => a.localeCompare(b));
  const fabricOptions = [...new Set(effectiveBaseProducts.map((product) => product.fabric))].sort((a, b) => a.localeCompare(b));
  const occasionOptions = [...new Set(effectiveBaseProducts.map((product) => product.occasion))].sort((a, b) => a.localeCompare(b));
  const minimumPrice = effectiveBaseProducts.length > 0 ? Math.min(...effectiveBaseProducts.map((product) => product.price)) : 0;
  const maximumPrice = effectiveBaseProducts.length > 0 ? Math.max(...effectiveBaseProducts.map((product) => product.price)) : 0;
  const activePriceCap = priceCap || maximumPrice;

  useEffect(() => {
    if (!maximumPrice) return;
    setPriceCap((current) => {
      if (!current) return maximumPrice;
      if (current > maximumPrice) return maximumPrice;
      if (current < minimumPrice) return minimumPrice;
      return current;
    });
  }, [minimumPrice, maximumPrice]);

  useEffect(() => {
    setSelectedBrands((current) => current.filter((value) => brandOptions.includes(value)));
    setSelectedColors((current) => current.filter((value) => colorOptions.includes(value)));
    setSelectedFabrics((current) => current.filter((value) => fabricOptions.includes(value)));
    setSelectedOccasions((current) => current.filter((value) => occasionOptions.includes(value)));
    setSelectedGenders((current) => current.filter((value) => value === 'Women'));
  }, [brandOptions, colorOptions, fabricOptions, occasionOptions]);

  const visibleCatalogProducts = prioritizeFeaturedProducts(sortProducts(
    effectiveBaseProducts.filter((product) => {
      const matchesGender = selectedGenders.length === 0 || selectedGenders.includes(product.gender);
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(product.brand);
      const matchesColor = selectedColors.length === 0 || selectedColors.includes(product.color);
      const matchesFabric = selectedFabrics.length === 0 || selectedFabrics.includes(product.fabric);
      const matchesOccasion = selectedOccasions.length === 0 || selectedOccasions.includes(product.occasion);
      const matchesRating = minRating === 0 || product.rating >= minRating;
      const matchesPrice = product.price >= minimumPrice && product.price <= activePriceCap;
      return matchesGender && matchesBrand && matchesColor && matchesFabric && matchesOccasion && matchesRating && matchesPrice;
    }),
    sortBy,
  ));

  const featuredProducts = prioritizeFeaturedProducts(catalogProducts.filter((product) => product.isFeaturedUpload));
  const fallbackRecommendedProducts = sortProducts(catalogProducts.filter((product) => !product.isFeaturedUpload), 'recommended');
  const fallbackPopularProducts = sortProducts(catalogProducts.filter((product) => !product.isFeaturedUpload), 'popularity');
  const heroProduct = featuredProducts[0] || sortProducts(catalogProducts, 'recommended')[0];
  const trendingProducts = [...featuredProducts.slice(0, 8), ...fallbackPopularProducts].slice(0, 8);
  const recommendedProducts = [...featuredProducts.slice(8), ...fallbackRecommendedProducts].slice(0, 8);
  const wishlistProducts = catalogProducts.filter((product) => wishlist.includes(product.id));
  const visibleEvents = role === 'rwa' ? events : [];
  const searchSuggestions = buildSearchSuggestions(catalogProducts, search);
  const isCatalogView = activeScreen === 'home' && (selectedCategory !== 'All' || normalizedSearch.length > 0 || showAllProducts);
  const catalogHeading = selectedCategory !== 'All' ? selectedCategory : normalizedSearch ? `Results for "${search.trim()}"` : 'Full Catalog';
  const activeFilterCount = selectedGenders.length + selectedBrands.length + selectedColors.length + selectedFabrics.length + selectedOccasions.length + (minRating > 0 ? 1 : 0) + (activePriceCap < maximumPrice ? 1 : 0);
  const homeCommunityCards = role === 'rwa'
    ? visibleEvents.slice(0, 3).map((event) => ({ id: event.id, eyebrow: event.status === 'active' ? 'Deal active' : 'Community deal', title: event.event_title || event.product_name, meta: event.progress_label, supporting: event.participants_needed_label || `${event.discount_percentage}% off - ${event.remaining_time_label}` }))
    : rwaCommunityDeals.map((deal) => ({ id: deal.id, eyebrow: 'Apartment bulk deal', title: deal.productName, meta: `Minimum order ${deal.minimumQuantity}`, supporting: `${deal.discount} discount for society buyers` }));

  const toggleWishlist = (productId: number) => {
    setWishlist((current) => (current.includes(productId) ? current.filter((value) => value !== productId) : [...current, productId]));
  };

  const toggleCollectionValue = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  const handleProfileAction = (action: 'orders' | 'wishlist' | 'contact') => {
    setIsProfileMenuOpen(false);
    if (action === 'orders') {
      setActiveScreen('orders');
      return;
    }
    if (action === 'wishlist') {
      setActiveScreen('wishlist');
      return;
    }
    showMessage('success', 'Support is here for order help, sizing questions, and delivery updates.');
  };

  const openSellerModal = () => {
    showMessage('error', 'Product management is available only in the admin dashboard.');
  };

  const handleJoinEvent = async (eventId: number) => {
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

    if (response.ok) {
      showMessage('success', data.message || 'You joined the community deal.');
      void loadEvents();
      return;
    }

    showMessage('error', data.error || 'Unable to join this event right now.');
  };

  const openParticipants = async (event: GroupBuyEvent) => {
    setSelectedEvent(event);
    await fetchParticipants(event.id, true);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearch(suggestion);
    setActiveScreen('home');
    setIsSuggestionOpen(false);
    setShowAllProducts(false);
    setSelectedCategory(detectCategoryFromText(suggestion));
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setActiveScreen('home');
    setIsSuggestionOpen(true);
  };

  const renderFilterSidebar = (isMobile = false) => <div className="grid gap-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Filters</p><h2 className="mt-1 text-lg font-bold text-slate-950">Refine your picks</h2></div><button type="button" onClick={() => { resetCatalogControls(); if (isMobile) setIsMobileFilterOpen(false); }} className="text-sm font-semibold text-rose-600">Clear all</button></div><CatalogFilterSection title="Gender"><CheckboxFilter label="Women" checked={selectedGenders.includes('Women')} onChange={() => toggleCollectionValue('Women', setSelectedGenders)} /></CatalogFilterSection><CatalogFilterSection title="Brand">{brandOptions.map((option) => <div key={option}><CheckboxFilter label={option} checked={selectedBrands.includes(option)} onChange={() => toggleCollectionValue(option, setSelectedBrands)} /></div>)}</CatalogFilterSection><CatalogFilterSection title="Price Range"><div className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between text-sm font-medium text-slate-600"><span>{formatCurrency(minimumPrice || 0)}</span><span>Up to {formatCurrency(activePriceCap || 0)}</span></div><input type="range" min={minimumPrice || 0} max={maximumPrice || 0} step={100} value={activePriceCap || maximumPrice || 0} onChange={(event) => setPriceCap(Number(event.target.value))} className="mt-4 h-2 w-full cursor-pointer accent-rose-600" /></div></CatalogFilterSection><CatalogFilterSection title="Color">{colorOptions.map((option) => <div key={option}><CheckboxFilter label={option} checked={selectedColors.includes(option)} onChange={() => toggleCollectionValue(option, setSelectedColors)} /></div>)}</CatalogFilterSection><CatalogFilterSection title="Fabric">{fabricOptions.map((option) => <div key={option}><CheckboxFilter label={option} checked={selectedFabrics.includes(option)} onChange={() => toggleCollectionValue(option, setSelectedFabrics)} /></div>)}</CatalogFilterSection><CatalogFilterSection title="Occasion">{occasionOptions.map((option) => <div key={option}><CheckboxFilter label={option} checked={selectedOccasions.includes(option)} onChange={() => toggleCollectionValue(option, setSelectedOccasions)} /></div>)}</CatalogFilterSection><CatalogFilterSection title="Customer Rating">{ratingOptions.map((option) => <button key={option.value} type="button" onClick={() => setMinRating((current) => current === option.value ? 0 : option.value)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${minRating === option.value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}><span>{option.label}</span><Star size={14} className={minRating === option.value ? 'fill-current' : ''} /></button>)}</CatalogFilterSection></div>;

  const handleFooterAction = (link: string) => {
    if (categoryShortcuts.includes(link)) {
      if (link === 'All') openHome(); else openCategory(link);
      return;
    }
    if (link === 'Track Order') {
      setActiveScreen('orders');
      return;
    }
    if (link === 'Group Buy' || link === 'Apartment Deals') {
      if (role === 'rwa') setActiveScreen('community'); else showMessage('success', 'Apartment community buying is available for RWA shoppers.');
      return;
    }
    showMessage('success', `${link} can be expanded in the next update.`);
  };

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[#f7f7fb] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 lg:px-8">
          <button type="button" onClick={() => setIsMobileMenuOpen((current) => !current)} className="rounded-full border border-slate-200 p-2 text-slate-600 lg:hidden"><Menu size={18} /></button>
          <button type="button" onClick={openHome} className="shrink-0"><BrandLogo compact /></button>
          <button type="button" onClick={() => setIsAddressPickerOpen(true)} className="hidden max-w-[230px] items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 transition hover:border-slate-950 hover:text-slate-950 md:flex"><MapPin size={16} /><span className="truncate">{defaultAddress?.location_label || user?.society_name || 'Add address'}</span></button>
          <div ref={searchWrapperRef} className="relative flex-1"><label className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 shadow-sm"><Search size={18} /><input value={search} onFocus={() => setIsSuggestionOpen(true)} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Search sarees, kurtas, blouse designs and more" className="w-full bg-transparent text-sm text-slate-900 outline-none" /></label><AnimatePresence>{isSuggestionOpen && searchSuggestions.length > 0 ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-[26px] border border-slate-200 bg-white p-2 shadow-[0_22px_60px_rgba(15,23,42,0.14)]">{searchSuggestions.map((suggestion) => <button key={suggestion} type="button" onMouseDown={() => selectSuggestion(suggestion)} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"><Search size={16} className="text-slate-400" /><span>{suggestion}</span></button>)}</motion.div> : null}</AnimatePresence></div>
          <div className="flex items-center gap-2 md:gap-3"><button type="button" onClick={openHome} className="hidden rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-950 hover:text-slate-950 md:inline-flex">Home</button>{role === 'rwa' ? <button type="button" onClick={() => setActiveScreen('community')} className="hidden rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-950 hover:text-slate-950 xl:inline-flex">Community Deals</button> : null}<div className="relative" onMouseEnter={() => setIsProfileMenuOpen(true)} onMouseLeave={() => setIsProfileMenuOpen(false)}><button type="button" onClick={() => setIsProfileMenuOpen((current) => !current)} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950"><User size={16} /><span className="hidden md:inline">Profile</span><ChevronDown size={14} /></button><AnimatePresence>{isProfileMenuOpen ? <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-[calc(100%+12px)] z-50 w-[300px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">{user ? <><p className="text-sm text-slate-500">Welcome {user.name}</p><h3 className="mt-1 text-lg font-bold text-slate-950">Your FASHIONest account</h3><div className="mt-5 grid gap-2 text-sm"><button type="button" onClick={() => handleProfileAction('orders')} className="rounded-2xl px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50 hover:text-rose-600">Orders</button><button type="button" onClick={() => handleProfileAction('wishlist')} className="rounded-2xl px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50 hover:text-rose-600">Wishlist</button><button type="button" onClick={() => handleProfileAction('contact')} className="rounded-2xl px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50 hover:text-rose-600">Contact Support</button></div><div className="mt-4 border-t border-slate-100 pt-4"><button type="button" onClick={() => { void logout(); navigate('/login'); }} className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600"><LogOut size={16} />Logout</button></div></> : <><p className="text-sm text-slate-500">Welcome to FASHIONest</p><h3 className="mt-1 text-lg font-bold text-slate-950">Shop sarees and apparel</h3><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => navigate('/login')} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Login</button><button type="button" onClick={() => navigate('/signup')} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Signup</button></div></>}</motion.div> : null}</AnimatePresence></div><button type="button" onClick={() => setActiveScreen('wishlist')} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950"><span className="inline-flex items-center gap-2"><Heart size={16} /><span className="hidden md:inline">Wishlist</span></span></button><Link reloadDocument to="/cart" onClick={() => { setIsMobileMenuOpen(false); setIsProfileMenuOpen(false); }} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"><span className="inline-flex items-center gap-2"><ShoppingBag size={16} />Bag ({itemCount})</span></Link></div>
        </div>
        <div className="mx-auto hidden max-w-[1440px] items-center gap-3 px-4 pb-3 lg:flex lg:px-8">{categoryShortcuts.map((category) => <button key={category} type="button" onClick={() => { if (category === 'All') openHome(); else openCategory(category); }} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === category && activeScreen === 'home' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{category}</button>)}</div>
      </header>

      <AnimatePresence>{isMobileMenuOpen ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-950/35 lg:hidden"><button type="button" className="h-full w-full" onClick={() => setIsMobileMenuOpen(false)} /></motion.div> : null}</AnimatePresence>
      <AnimatePresence>{isMobileMenuOpen ? <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed left-0 top-0 z-[70] flex h-full w-[88vw] max-w-sm flex-col gap-5 bg-white p-6 shadow-2xl lg:hidden"><div className="flex items-center justify-between"><BrandLogo compact /><button type="button" onClick={() => setIsMobileMenuOpen(false)} className="rounded-full border border-slate-200 p-2 text-slate-600"><X size={18} /></button></div><button type="button" onClick={() => { setIsAddressPickerOpen(true); setIsMobileMenuOpen(false); }} className="rounded-3xl bg-slate-50 p-4 text-left text-sm text-slate-600 transition hover:bg-slate-100"><span className="inline-flex items-center gap-2"><MapPin size={16} />{defaultAddress?.location_label || user?.society_name || 'Add address'}</span></button><div className="grid gap-3">{categoryShortcuts.map((category) => <button key={category} type="button" onClick={() => { if (category === 'All') openHome(); else openCategory(category); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">{category}</button>)}</div><button type="button" onClick={() => { setActiveScreen('orders'); setIsMobileMenuOpen(false); }} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Orders</button>{role === 'rwa' ? <button type="button" onClick={() => { setActiveScreen('community'); setIsMobileMenuOpen(false); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Community Deals</button> : null}</motion.aside> : null}</AnimatePresence>
      <AnimatePresence>{isMobileFilterOpen ? <><motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" onClick={() => setIsMobileFilterOpen(false)} className="fixed inset-0 z-[60] bg-slate-950/35 lg:hidden" /><motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 z-[70] h-full w-[88vw] max-w-sm overflow-y-auto bg-[#f7f7fb] p-4 shadow-2xl lg:hidden"><div className="flex items-center justify-between pb-4"><h2 className="text-lg font-bold text-slate-950">Filters</h2><button type="button" onClick={() => setIsMobileFilterOpen(false)} className="rounded-full border border-slate-200 p-2 text-slate-600"><X size={18} /></button></div>{renderFilterSidebar(true)}</motion.aside></> : null}</AnimatePresence>

      <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8">
        <AnimatePresence>{statusMessage ? <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`mb-5 rounded-2xl px-4 py-3 text-sm font-medium ${statusMessage.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{statusMessage.text}</motion.div> : null}</AnimatePresence>

        {activeScreen === 'home' && !isCatalogView ? <div className="space-y-10"><section className="overflow-hidden rounded-[34px] bg-gradient-to-r from-slate-950 via-[#b4235f] to-[#ff8a2a] px-6 py-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] lg:px-8"><div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center"><div className="space-y-4"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]"><Sparkles size={14} />{role === 'rwa' ? 'Apartment deals live' : 'Fresh ethnic fashion'}</span><div className="space-y-3"><h1 className="max-w-2xl text-3xl font-black leading-tight md:text-4xl">Women's ethnic fashion, curated like a modern marketplace</h1><p className="max-w-2xl text-sm text-white/80 md:text-base">Explore sarees, kurtas, blouses, dresses, and kurta sets in a cleaner FASHIONest storefront with better discovery, filtering, and shopping flow.</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => openCategory('Sarees')} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">Shop Sarees</button><button type="button" onClick={openFullCatalog} className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white">Explore full catalog</button></div><div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/75"><span>{catalogProducts.length}+ fashion picks</span><span>{role === 'rwa' ? `${visibleEvents.length} live community deals` : 'Wishlist and bag ready'}</span></div></div><div className="grid gap-4 md:grid-cols-[180px_1fr]"><div className="overflow-hidden rounded-[28px] bg-white/10">{heroProduct ? <ProductImage product={heroProduct} alt={heroProduct.name} className="h-full w-full object-cover" /> : <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-white/70">Fresh FASHIONest arrivals</div>}</div><div className="grid gap-4"><div className="rounded-[28px] bg-white/10 p-5 backdrop-blur"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Featured now</p><h3 className="mt-2 text-2xl font-bold">{heroProduct?.name || 'Explore fresh community fashion'}</h3><p className="mt-2 text-sm text-white/75">{heroProduct ? formatCurrency(heroProduct.price) : 'Fresh shopping edits'}</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-[24px] bg-white/10 p-4"><p className="text-2xl font-black">{wishlist.length}</p><p className="mt-1 text-sm text-white/75">wishlisted styles</p></div><div className="rounded-[24px] bg-white/10 p-4"><p className="text-2xl font-black">{itemCount}</p><p className="mt-1 text-sm text-white/75">items in bag</p></div></div></div></div></div></section><section className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Categories</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Shop by category</h2></div><button type="button" onClick={openFullCatalog} className="text-sm font-semibold text-rose-600">View all</button></div><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{categoryShortcuts.slice(1).map((category) => <button key={category} type="button" onClick={() => openCategory(category)} className="rounded-[24px] border border-slate-200 bg-white px-4 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{categoryMeta[category].highlights[0]}</p><h3 className="mt-2 text-lg font-bold text-slate-950">{category}</h3><p className="mt-1 text-sm text-slate-500">{categoryMeta[category].description}</p></button>)}</div></section><section className="space-y-4"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Trending</p><h2 className="mt-2 text-2xl font-bold text-slate-950">{featuredProducts.length > 0 ? 'Top uploaded sarees' : 'Trending products'}</h2><p className="mt-1 text-sm text-slate-500">{featuredProducts.length > 0 ? 'Your uploaded saree collection is pinned here in the same order for quick visibility.' : 'Curated bestsellers and well-loved styles from the latest FASHIONest catalog.'}</p></div><button type="button" onClick={openFullCatalog} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">View catalog</button></div><div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{trendingProducts.map((product) => <div key={product.id}><ProductCard product={product} isWishlisted={wishlist.includes(product.id)} isAdded={isInCart(product.id)} quantityInBag={getItemQuantity(product.id)} onToggleWishlist={toggleWishlist} onAddToBag={addToCart} onNotify={showMessage} /></div>)}</div></section><section className="space-y-4"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Community</p><h2 className="mt-2 text-2xl font-bold text-slate-950">Community Group Buys</h2><p className="mt-1 text-sm text-slate-500">{role === 'rwa' ? 'Upcoming society events and apartment buying moments.' : 'Apartment communities can unlock society pricing and group discounts.'}</p></div><button type="button" onClick={() => { if (role === 'rwa') setActiveScreen('community'); else showMessage('success', 'Community deals unlock for apartment buyers and RWAs.'); }} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">{role === 'rwa' ? 'Open community desk' : 'Learn more'}</button></div><div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">{homeCommunityCards.map((card) => <article key={card.id} className="min-w-[280px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">{card.eyebrow}</p><h3 className="mt-2 text-lg font-bold text-slate-950">{card.title}</h3><div className="mt-4 grid gap-2 text-sm text-slate-500"><p>{card.meta}</p><p>{card.supporting}</p></div></article>)}</div></section><section className="space-y-4"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recommended</p><h2 className="mt-2 text-2xl font-bold text-slate-950">{featuredProducts.length > 8 ? 'More uploaded sarees' : 'Picked for your wardrobe'}</h2></div><button type="button" onClick={openFullCatalog} className="text-sm font-semibold text-rose-600">Shop more</button></div><div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{recommendedProducts.map((product) => <div key={product.id}><ProductCard product={product} isWishlisted={wishlist.includes(product.id)} isAdded={isInCart(product.id)} quantityInBag={getItemQuantity(product.id)} onToggleWishlist={toggleWishlist} onAddToBag={addToCart} onNotify={showMessage} /></div>)}</div></section></div> : null}

        {activeScreen === 'home' && isCatalogView ? <div className="space-y-6"><section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-sm text-slate-400"><button type="button" onClick={openHome} className="font-medium transition hover:text-slate-950">Home</button><span>/</span><span className="font-medium text-slate-600">{catalogHeading}</span></div><p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Catalog</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{catalogHeading}</h1><p className="mt-2 text-sm text-slate-500">{visibleCatalogProducts.length} style{visibleCatalogProducts.length === 1 ? '' : 's'} matched with filters, search, and sorting.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><button type="button" onClick={() => setIsMobileFilterOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 lg:hidden"><SlidersHorizontal size={16} />Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</button><label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-semibold text-slate-500">Sort by</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="bg-transparent font-semibold text-slate-900 outline-none">{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div></div></section><div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><aside className="hidden lg:block">{renderFilterSidebar()}</aside><div className="space-y-5">{activeFilterCount > 0 ? <div className="flex flex-wrap gap-2">{selectedBrands.map((value) => <button key={value} type="button" onClick={() => toggleCollectionValue(value, setSelectedBrands)} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600">{value} x</button>)}{selectedColors.map((value) => <button key={value} type="button" onClick={() => toggleCollectionValue(value, setSelectedColors)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">{value} x</button>)}{selectedFabrics.map((value) => <button key={value} type="button" onClick={() => toggleCollectionValue(value, setSelectedFabrics)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">{value} x</button>)}{selectedOccasions.map((value) => <button key={value} type="button" onClick={() => toggleCollectionValue(value, setSelectedOccasions)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">{value} x</button>)}{minRating > 0 ? <button type="button" onClick={() => setMinRating(0)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">{minRating} and above x</button> : null}{activePriceCap < maximumPrice ? <button type="button" onClick={() => setPriceCap(maximumPrice)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">Up to {formatCurrency(activePriceCap)} x</button> : null}</div> : null}{visibleCatalogProducts.length === 0 ? <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><h2 className="text-2xl font-bold text-slate-950">No products match these filters</h2><p className="mt-2 text-sm text-slate-500">Try clearing a few filters or broadening the search to see more styles.</p><button type="button" onClick={resetCatalogControls} className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600">Reset filters</button></div> : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{visibleCatalogProducts.map((product) => <div key={product.id}><ProductCard product={product} isWishlisted={wishlist.includes(product.id)} isAdded={isInCart(product.id)} quantityInBag={getItemQuantity(product.id)} onToggleWishlist={toggleWishlist} onAddToBag={addToCart} onNotify={showMessage} /></div>)}</div>}</div></div></div> : null}
        {activeScreen === 'community' && role === 'rwa' ? <section className="space-y-6"><div className="rounded-[30px] bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Community buying</p><h2 className="mt-2 text-3xl font-bold text-slate-950">RWA community desk</h2><p className="mt-2 text-sm text-slate-500">Track apartment buying deals created by the admin panel and join the ones that match your society.</p></div><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">RWA access</span></div></div><div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]"><div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">Community deals are now created and edited only from the admin panel. Residents can join open deals and track when the discount unlocks for their society.</div><div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-2 text-slate-950"><Users size={18} className="text-rose-600" /><h3 className="text-base font-bold">How Community Deals Work</h3></div><div className="mt-4 grid gap-3 text-sm text-slate-600"><p><span className="font-semibold text-slate-950">1.</span> Admin creates a group buying deal from the admin panel.</p><p><span className="font-semibold text-slate-950">2.</span> Residents join together to unlock the discount.</p><p><span className="font-semibold text-slate-950">3.</span> Once minimum participants join, everyone gets the discounted price.</p></div></div></div></div><div className="grid gap-5 lg:grid-cols-2">{visibleEvents.map((event) => <article key={event.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><div className="h-28 w-24 overflow-hidden rounded-[20px] bg-slate-100"><ProductImage product={{ id: event.product_id, title: event.product_name, image_url: event.product_image }} alt={event.product_name} className="h-full w-full object-cover" /></div><div className="flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Community deal</p><h3 className="mt-2 text-xl font-bold text-slate-950">{event.event_title || event.product_name}</h3><p className="mt-1 text-sm text-slate-500">{event.product_name}</p><p className="mt-1 text-sm text-slate-500">{event.society_name}</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${event.status === 'active' ? 'bg-emerald-50 text-emerald-700' : event.status === 'expired' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>{event.status}</span></div><div className="mt-4 grid gap-2 text-sm text-slate-500"><p>{event.progress_label}</p><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${event.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${event.progress_percentage}%` }} /></div><p className="font-medium text-slate-700">{event.participants_needed_label}</p><div className="grid gap-2 sm:grid-cols-2"><p>Minimum participants: <span className="font-semibold text-slate-950">{event.minimum_participants || event.minimum_quantity}</span></p><p>Community discount: <span className="font-semibold text-emerald-600">{event.discount_percentage}%</span></p><p className="inline-flex items-center gap-2"><Calendar size={14} className="text-slate-400" />{event.remaining_time_label}</p><p>Duration: <span className="font-semibold text-slate-950">{event.event_duration_days || 0} days</span></p></div><p className="flex items-center gap-3"><span className="text-slate-400 line-through">{formatCurrency(event.original_price)}</span><span className="text-lg font-bold text-slate-950">{formatCurrency(event.final_price)}</span></p></div></div></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={!canJoinCommunityDeals || event.joined || event.status === 'expired'} onClick={() => void handleJoinEvent(event.id)} className={`rounded-full px-4 py-3 text-sm font-semibold text-white transition ${event.joined ? 'bg-emerald-600' : event.status === 'expired' ? 'bg-slate-300' : 'bg-slate-950 hover:bg-rose-600'}`}>{event.joined ? 'Joined' : 'Join Deal'}</button><button type="button" onClick={() => void openParticipants(event)} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">View Participants</button></div></article>)}{visibleEvents.length === 0 ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 lg:col-span-2">No community events available right now.</div> : null}</div></section> : null}

        {activeScreen === 'orders' ? <OrderHistoryPanel role={role} orders={orders} token={token} onRefreshOrders={loadOrders} /> : null}

        {activeScreen === 'wishlist' ? <section className="space-y-6"><div className="rounded-[30px] bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Wishlist</p><h2 className="mt-2 text-3xl font-bold text-slate-950">Saved styles</h2><p className="mt-2 text-sm text-slate-500">Your shortlisted styles live here for quick shopping later.</p></div>{wishlistProducts.length === 0 ? <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">You have not wishlisted any products yet.</div> : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{wishlistProducts.map((product) => <div key={product.id}><ProductCard product={product} isWishlisted={wishlist.includes(product.id)} isAdded={isInCart(product.id)} quantityInBag={getItemQuantity(product.id)} onToggleWishlist={toggleWishlist} onAddToBag={addToCart} onNotify={showMessage} /></div>)}</div>}</section> : null}
      </div>

      <footer className="bg-slate-950 text-slate-200"><div className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8"><div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">{footerColumns.map((column) => <div key={column.title}><h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">{column.title}</h3><div className="mt-4 grid gap-3 text-sm text-slate-400">{column.links.map((link) => <button key={link} type="button" onClick={() => handleFooterAction(link)} className="text-left transition hover:text-white">{link}</button>)}</div></div>)}</div><div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap gap-3"><button type="button" className="rounded-full border border-white/15 px-4 py-2 text-sm">English <ChevronDown size={14} className="inline" /></button><button type="button" className="rounded-full border border-white/15 px-4 py-2 text-sm">India <ChevronDown size={14} className="inline" /></button></div><div className="flex items-center gap-3 text-sm text-slate-400"><Headphones size={16} /><span>2026 FASHIONest. Community-first shopping for women's ethnic wear.</span></div></div></div></footer>

      <AddressPickerModal
        isOpen={isAddressPickerOpen}
        token={token}
        userName={user?.name}
        userPhone={user?.phone}
        currentAddress={defaultAddress}
        onClose={() => setIsAddressPickerOpen(false)}
        onAddressChange={(address) => {
          setDefaultAddress(address);
          if (address) {
            showMessage('success', 'Location updated for your account.');
          }
          setIsAddressPickerOpen(false);
        }}
      />

      <AnimatePresence>{selectedEvent ? <><motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="button" onClick={() => setSelectedEvent(null)} className="fixed inset-0 z-[80] bg-slate-950/45" /><motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }} className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[30px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Participants</p><h3 className="mt-2 text-2xl font-bold text-slate-950">{selectedEvent.product_name}</h3><p className="mt-1 text-sm text-slate-500">{selectedEvent.society_name}</p></div><button type="button" onClick={() => setSelectedEvent(null)} className="rounded-full border border-slate-200 p-2 text-slate-500"><X size={18} /></button></div><div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"><tr><th className="px-4 py-4">User name</th><th className="px-4 py-4">Apartment / Block</th><th className="px-4 py-4 text-right">Join time</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white text-slate-600">{participants.map((participant) => <tr key={participant.id}><td className="px-4 py-4 font-medium text-slate-950">{participant.customer_name}</td><td className="px-4 py-4 text-slate-600">{participant.apartment_block || 'Apartment resident'}</td><td className="px-4 py-4 text-right font-medium text-slate-950">{new Date(participant.joined_at).toLocaleString()}</td></tr>)}</tbody></table>{participants.length === 0 ? <div className="px-4 py-12 text-center text-sm text-slate-500">No one has joined this group buy yet.</div> : null}</div></motion.div></> : null}</AnimatePresence>
    </div>
  );
}














