import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Download, Package, PencilLine, Plus, ShoppingCart, Sparkles, Star, TicketPercent, UploadCloud, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type ProductForm = {
  productId: string;
  title: string;
  category: string;
  subcategory: string;
  description: string;
  fabric: string;
  color: string;
  occasion: string;
  price: number;
  stock: number;
  image_url: string;
};

type ReviewItem = {
  id: number;
  product_name: string;
  user_name: string;
  rating: number;
  review_text: string;
  created_at: string;
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
  start_date?: string;
  end_date?: string;
  event_duration_days?: number;
  created_by: number;
  status: string;
  remaining_time_label: string;
  progress_label: string;
  participants_needed?: number;
  participants_needed_label?: string;
  progress_percentage: number;
  original_price: number;
  final_price: number;
};

type Participant = {
  id: number;
  customer_name: string;
  apartment_block?: string;
  joined_at: string;
};

type CouponForm = {
  coupon_code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  minimum_order_value: number;
  expiry_date: string;
  max_usage: number;
  user_type: 'customer' | 'first_time_user' | 'community_user';
};

const emptyProductData: ProductForm = {
  productId: '',
  title: '',
  category: 'Sarees',
  subcategory: '',
  description: '',
  fabric: '',
  color: '',
  occasion: '',
  price: 0,
  stock: 100,
  image_url: '',
};

const emptyCouponForm: CouponForm = {
  coupon_code: '',
  discount_type: 'percentage',
  discount_value: 10,
  minimum_order_value: 0,
  expiry_date: '',
  max_usage: 25,
  user_type: 'customer',
};

const securityQuestions = [
  'What is your favourite festival?',
  'What is your apartment block name?',
  'What is your favourite saree fabric?',
  'What city was your first home in?',
];

const emptyRWAData = {
  name: '',
  email: '',
  phone: '',
  password: 'rwa123',
  society_name: '',
  apartment_block: '',
  community_role: 'coordinator',
  security_question: securityQuestions[0],
  security_answer: '',
};

const emptyCommunityDealData = {
  event_title: '',
  product_id: '',
  society_name: '',
  minimum_participants: '10',
  discount_percentage: '12',
  event_duration_days: '5',
  start_date: new Date().toISOString().slice(0, 10),
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'rwa' | 'reviews' | 'coupons'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [editingCommunityEvent, setEditingCommunityEvent] = useState<CommunityEvent | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showRWAForm, setShowRWAForm] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showCommunityDealForm, setShowCommunityDealForm] = useState(false);
  const { token } = useAuth();

  const [productData, setProductData] = useState<ProductForm>(emptyProductData);
  const [couponData, setCouponData] = useState<CouponForm>(emptyCouponForm);
  const [rwaData, setRWAData] = useState(emptyRWAData);
  const [communityDealData, setCommunityDealData] = useState(emptyCommunityDealData);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [orderUpdateData, setOrderUpdateData] = useState({ order_status: '', delivery_partner: '', tracking_id: '', tracking_url: '' });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const rwaSocieties = useMemo(() => [...new Set(users.map((user: any) => user.society_name).filter(Boolean))], [users]);

  useEffect(() => {
    void fetchData();
  }, [activeTab, token]);

  const showMessage = (tone: 'success' | 'error', text: string) => {
    setStatusMessage({ tone, text });
    window.setTimeout(() => setStatusMessage(null), 2400);
  };

  const fetchData = async () => {
    try {
      if (activeTab === 'products') {
        const res = await fetch('/api/products');
        const data = await res.json().catch(() => []);
        setProducts(Array.isArray(data) ? data : []);
        return;
      }
      if (activeTab === 'orders') {
        const res = await fetch('/api/admin/orders', { headers });
        const data = await res.json().catch(() => []);
        setOrders(Array.isArray(data) ? data : []);
        return;
      }
      if (activeTab === 'rwa') {
        const [usersRes, productsRes, eventsRes] = await Promise.all([
          fetch('/api/admin/users', { headers }),
          fetch('/api/products'),
          fetch('/api/group-buy/list', { headers }),
        ]);
        const fetchedUsers = await usersRes.json().catch(() => []);
        const fetchedProducts = await productsRes.json().catch(() => []);
        const fetchedEvents = await eventsRes.json().catch(() => []);
        setUsers((Array.isArray(fetchedUsers) ? fetchedUsers : []).filter((user: any) => user.role === 'rwa'));
        setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
        setCommunityEvents(Array.isArray(fetchedEvents) ? fetchedEvents : []);
        return;
      }
      if (activeTab === 'reviews') {
        const res = await fetch('/api/admin/reviews', { headers });
        const data = await res.json().catch(() => []);
        setReviews(Array.isArray(data) ? data : []);
        return;
      }
      const res = await fetch('/api/admin/coupons', { headers });
      const data = await res.json().catch(() => []);
      setCoupons(Array.isArray(data) ? data : []);
    } catch (_error) {
      if (activeTab === 'products') setProducts([]);
      if (activeTab === 'orders') setOrders([]);
      if (activeTab === 'rwa') {
        setUsers([]);
        setProducts([]);
        setCommunityEvents([]);
      }
      if (activeTab === 'reviews') setReviews([]);
      if (activeTab === 'coupons') setCoupons([]);
      showMessage('error', 'We could not load this admin section right now.');
    }
  };


  const resetProductForm = () => {
    setEditingProduct(null);
    setShowProductForm(false);
    setProductData(emptyProductData);
    setSelectedImageFile(null);
  };

  const resetRWAForm = () => {
    setShowRWAForm(false);
    setRWAData(emptyRWAData);
  };

  const resetCommunityDealForm = () => {
    setShowCommunityDealForm(false);
    setEditingCommunityEvent(null);
    setCommunityDealData(emptyCommunityDealData);
  };

  const uploadSelectedImage = async () => {
    if (!selectedImageFile) {
      return productData.image_url;
    }

    const body = new FormData();
    body.append('image', selectedImageFile);
    setIsUploadingImage(true);
    try {
      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to upload image');
      }
      return data.imageUrl;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/admin/products/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(productData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to generate image');
      }
      setProductData((current) => ({ ...current, image_url: data.imageUrl }));
      showMessage('success', 'Generated a catalog-style product image.');
    } catch (error: any) {
      showMessage('error', error.message || 'Unable to generate image right now.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProduct(true);
    try {
      const imageUrl = await uploadSelectedImage();
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...productData, image_url: imageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMessage('error', data.error || 'Unable to save the product.');
        return;
      }
      showMessage('success', editingProduct ? 'Product updated.' : 'Product added.');
      resetProductForm();
      void fetchData();
    } catch (error: any) {
      showMessage('error', error.message || 'Unable to save the product.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductData({
      productId: product.productId || product.product_id || '',
      title: product.title || product.name || '',
      category: product.category || 'Sarees',
      subcategory: product.subcategory || '',
      description: product.description || '',
      fabric: product.fabric || '',
      color: product.color || '',
      occasion: product.occasion || '',
      price: product.price || 0,
      stock: product.stock || 0,
      image_url: product.image_url || product.image || '',
    });
    setSelectedImageFile(null);
    setShowProductForm(true);
  };

  const handleCreateRWA = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/create-rwa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(rwaData),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      resetRWAForm();
      showMessage('success', 'RWA account created.');
      void fetchData();
    } else {
      showMessage('error', data.error || 'Unable to create the RWA account.');
    }
  };

  const handleCreateCommunityDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = Boolean(editingCommunityEvent);
    const res = await fetch(isEditing ? `/api/admin/community-deals/${editingCommunityEvent?.event_id}` : '/api/group-buy/create', {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        event_title: communityDealData.event_title,
        product_id: Number(communityDealData.product_id),
        society_name: communityDealData.society_name,
        minimum_participants: Number(communityDealData.minimum_participants),
        discount_percentage: Number(communityDealData.discount_percentage),
        event_duration_days: Number(communityDealData.event_duration_days),
        start_date: communityDealData.start_date,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      resetCommunityDealForm();
      showMessage('success', isEditing ? 'Community deal updated.' : 'Community deal created.');
      void fetchData();
    } else {
      showMessage('error', data.error || `Unable to ${isEditing ? 'update' : 'create'} the community deal.`);
    }
  };

  const handleEditCommunityDeal = (event: CommunityEvent) => {
    setEditingCommunityEvent(event);
    setCommunityDealData({
      event_title: event.event_title || event.product_name,
      product_id: String(event.product_id),
      society_name: event.society_name,
      minimum_participants: String(event.minimum_participants || event.minimum_quantity || 10),
      discount_percentage: String(event.discount_percentage || 12),
      event_duration_days: String(event.event_duration_days || 5),
      start_date: String(event.start_date || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
    setShowCommunityDealForm(true);
  };

  const handleViewParticipants = async (event: CommunityEvent) => {
    const res = await fetch(`/api/group-buy/participants/${event.id}`, { headers });
    const data = await res.json().catch(() => ([]));
    setParticipants(Array.isArray(data) ? data : []);
    setSelectedEvent(event);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(couponData),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCouponData(emptyCouponForm);
      setShowCouponForm(false);
      showMessage('success', 'Coupon created.');
      void fetchData();
    } else {
      showMessage('error', data.error || 'Unable to create coupon.');
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/admin/orders/${editingOrder.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(orderUpdateData),
    });
    if (res.ok) {
      setEditingOrder(null);
      showMessage('success', 'Order updated.');
      void fetchData();
    }
  };

  const handleDownloadReviews = async () => {
    const response = await fetch('/api/admin/reviews/download', { headers });
    if (!response.ok) {
      showMessage('error', 'Unable to download review export right now.');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'reviews.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const orderStatuses = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

  return (
    <div className="relative min-h-[calc(100vh-120px)]">
      {statusMessage ? (
        <div className={`mb-6 rounded-2xl px-4 py-3 text-sm font-medium ${statusMessage.tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
          {statusMessage.text}
        </div>
      ) : null}

      <div className="flex gap-8">
        <aside className="w-64 space-y-2">
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}><Package size={18} /><span>Products</span></button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}><ShoppingCart size={18} /><span>Orders</span></button>
          <button onClick={() => setActiveTab('rwa')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'rwa' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}><Users size={18} /><span>RWA & Deals</span></button>
          <button onClick={() => setActiveTab('reviews')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'reviews' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}><Star size={18} /><span>Product Reviews</span></button>
          <button onClick={() => setActiveTab('coupons')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'coupons' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:bg-white'}`}><TicketPercent size={18} /><span>Coupons</span></button>
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'products' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage FASHIONest Catalog</h2>
                  <p className="mt-1 text-sm text-gray-500">Add, edit, and enrich product listings with uploaded or AI-generated product images.</p>
                </div>
                <button onClick={() => setShowProductForm(true)} className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors"><Plus size={18} /><span>Add Product</span></button>
              </div>

              {showProductForm ? (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                  <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-4">
                    <input placeholder="Product ID" value={productData.productId} className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, productId: e.target.value })} required />
                    <input placeholder="Title" value={productData.title} className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, title: e.target.value })} required />
                    <input placeholder="Category" value={productData.category} className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, category: e.target.value })} required />
                    <input placeholder="Subcategory" value={productData.subcategory} className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, subcategory: e.target.value })} required />
                    <input placeholder="Price" value={productData.price} type="number" className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, price: parseFloat(e.target.value) || 0 })} required />
                    <input placeholder="Stock" value={productData.stock} type="number" className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, stock: parseInt(e.target.value, 10) || 0 })} required />
                    <input placeholder="Fabric" value={productData.fabric} className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, fabric: e.target.value })} />
                    <input placeholder="Color" value={productData.color} className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, color: e.target.value })} />
                    <input placeholder="Occasion" value={productData.occasion} className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, occasion: e.target.value })} />
                    <input placeholder="Image URL" value={productData.image_url} className="px-4 py-2 border rounded-lg" onChange={(e) => setProductData({ ...productData, image_url: e.target.value })} />
                    <label className="col-span-2 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                      <span className="mb-2 block font-semibold text-slate-800">Upload Product Image</span>
                      <input type="file" accept="image/*" onChange={(event) => setSelectedImageFile(event.target.files?.[0] || null)} />
                      <p className="mt-2 text-xs text-slate-500">Local image upload stores a URL in the catalog.</p>
                    </label>
                    <div className="col-span-2 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void handleGenerateImage()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-600"><Sparkles size={16} />{isGeneratingImage ? 'Generating...' : 'Generate AI Product Image'}</button>
                      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-500"><UploadCloud size={16} />{isUploadingImage ? 'Uploading image...' : selectedImageFile ? selectedImageFile.name : 'No file selected'}</div>
                    </div>
                    {productData.image_url ? <div className="col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"><img src={productData.image_url} alt={productData.title || 'Product preview'} className="h-48 w-full rounded-xl object-contain bg-white" /></div> : null}
                    <textarea placeholder="Description" value={productData.description} className="px-4 py-2 border rounded-lg col-span-2" onChange={(e) => setProductData({ ...productData, description: e.target.value })} />
                    <div className="col-span-2 flex space-x-2"><button type="submit" disabled={isSavingProduct} className="bg-rose-600 text-white px-6 py-2 rounded-lg font-medium">{isSavingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}</button><button type="button" onClick={resetProductForm} className="text-gray-500 px-4 py-2">Cancel</button></div>
                  </form>
                </motion.div>
              ) : null}

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Product</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Price</th><th className="px-6 py-4">Stock</th><th className="px-6 py-4">Action</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-6 py-4"><div className="font-medium text-gray-900">{product.title || product.name}</div><div className="text-xs text-gray-400 mt-1">{product.productId || product.product_id}</div></td>
                        <td className="px-6 py-4">{product.category}<div className="text-xs text-gray-400 mt-1">{product.subcategory}</div></td>
                        <td className="px-6 py-4">{formatCurrency(product.price)}</td>
                        <td className="px-6 py-4">{product.stock}</td>
                        <td className="px-6 py-4"><button onClick={() => handleEditProduct(product)} className="inline-flex items-center gap-2 text-rose-600 font-medium hover:underline"><PencilLine size={14} />Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === 'orders' ? (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">All Orders</h2>
              {editingOrder ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl border-2 border-rose-100 shadow-xl">
                  <h3 className="text-lg font-bold mb-4">Update Order #ORD-{editingOrder.id}</h3>
                  <form onSubmit={handleUpdateOrder} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label><select className="w-full px-4 py-2 border rounded-lg" value={orderUpdateData.order_status} onChange={(e) => setOrderUpdateData({ ...orderUpdateData, order_status: e.target.value })}>{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Delivery Partner</label><input placeholder="e.g. BlueDart" className="w-full px-4 py-2 border rounded-lg" value={orderUpdateData.delivery_partner} onChange={(e) => setOrderUpdateData({ ...orderUpdateData, delivery_partner: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tracking ID</label><input placeholder="Tracking Number" className="w-full px-4 py-2 border rounded-lg" value={orderUpdateData.tracking_id} onChange={(e) => setOrderUpdateData({ ...orderUpdateData, tracking_id: e.target.value })} /></div>
                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tracking URL</label><input placeholder="https://..." className="w-full px-4 py-2 border rounded-lg" value={orderUpdateData.tracking_url} onChange={(e) => setOrderUpdateData({ ...orderUpdateData, tracking_url: e.target.value })} /></div>
                    <div className="md:col-span-2 flex space-x-2 pt-2"><button type="submit" className="bg-rose-600 text-white px-6 py-2 rounded-lg font-medium">Update Order</button><button type="button" onClick={() => setEditingOrder(null)} className="text-gray-500 px-4 py-2">Cancel</button></div>
                  </form>
                </motion.div>
              ) : null}

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Order ID</th><th className="px-6 py-4">Customer</th><th className="px-6 py-4">Society</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Payment</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4"><div className="font-mono text-xs">#ORD-{order.id}</div><div className="text-[10px] text-gray-400 mt-1">{order.items_list}</div></td>
                        <td className="px-6 py-4">{order.customer_name}</td>
                        <td className="px-6 py-4">{order.society_name}</td>
                        <td className="px-6 py-4 font-bold">{formatCurrency(order.total_price)}</td>
                        <td className="px-6 py-4"><div className="flex flex-col"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full w-fit ${order.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{order.payment_status}</span><span className="text-[10px] text-gray-400 mt-1">{order.payment_method}</span></div></td>
                        <td className="px-6 py-4"><span className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded uppercase">{order.order_status}</span></td>
                        <td className="px-6 py-4"><button onClick={() => { setEditingOrder(order); setOrderUpdateData({ order_status: order.order_status, delivery_partner: order.delivery_partner || '', tracking_id: order.tracking_id || '', tracking_url: order.tracking_url || '' }); }} className="text-rose-600 font-medium hover:underline">Update</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {activeTab === 'rwa' ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">RWA Access & Community Deals</h2>
                  <p className="mt-1 text-sm text-gray-500">Create coordinator or resident accounts, then launch controlled society buying deals with progress tracking.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setShowRWAForm((current) => !current)} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600"><Plus size={18} />{showRWAForm ? 'Close RWA Form' : 'Create RWA Account'}</button>
                  <button onClick={() => editingCommunityEvent ? resetCommunityDealForm() : setShowCommunityDealForm((current) => !current)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-rose-300 hover:text-rose-600"><Plus size={18} />{showCommunityDealForm ? 'Close Deal Form' : 'Create Community Deal'}</button>
                </div>
              </div>

              {showRWAForm ? (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="mb-4 text-lg font-bold">Create RWA Account</h3>
                  <form onSubmit={handleCreateRWA} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input placeholder="Name" className="px-4 py-2 border rounded-lg" value={rwaData.name} onChange={(e) => setRWAData({ ...rwaData, name: e.target.value })} required />
                    <input placeholder="Email" type="email" className="px-4 py-2 border rounded-lg" value={rwaData.email} onChange={(e) => setRWAData({ ...rwaData, email: e.target.value })} required />
                    <input placeholder="Phone" className="px-4 py-2 border rounded-lg" value={rwaData.phone} onChange={(e) => setRWAData({ ...rwaData, phone: e.target.value })} />
                    <input placeholder="Society Name" className="px-4 py-2 border rounded-lg" value={rwaData.society_name} onChange={(e) => setRWAData({ ...rwaData, society_name: e.target.value })} required />
                    <input placeholder="Apartment / Block" className="px-4 py-2 border rounded-lg" value={rwaData.apartment_block} onChange={(e) => setRWAData({ ...rwaData, apartment_block: e.target.value })} required />
                    <select className="px-4 py-2 border rounded-lg" value={rwaData.community_role} onChange={(e) => setRWAData({ ...rwaData, community_role: e.target.value })}><option value="coordinator">Coordinator</option><option value="resident">Resident</option></select>
                    <input placeholder="Password" type="password" className="px-4 py-2 border rounded-lg" value={rwaData.password} onChange={(e) => setRWAData({ ...rwaData, password: e.target.value })} required />
                    <select className="px-4 py-2 border rounded-lg" value={rwaData.security_question} onChange={(e) => setRWAData({ ...rwaData, security_question: e.target.value })}>{securityQuestions.map((question) => <option key={question} value={question}>{question}</option>)}</select>
                    <input placeholder="Security answer" className="px-4 py-2 border rounded-lg md:col-span-2" value={rwaData.security_answer} onChange={(e) => setRWAData({ ...rwaData, security_answer: e.target.value })} required />
                    <div className="md:col-span-2 flex space-x-2"><button type="submit" className="bg-rose-600 text-white px-6 py-2 rounded-lg font-medium">Create Account</button><button type="button" onClick={resetRWAForm} className="text-gray-500 px-4 py-2">Cancel</button></div>
                  </form>
                </motion.div>
              ) : null}

              {showCommunityDealForm ? (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{editingCommunityEvent ? 'Edit Community Deal' : 'Create Community Deal'}</h3>
                    <p className="mt-1 text-sm text-gray-500">Admins can launch or update a society event that residents will join from the product page.</p>
                  </div>
                  <form onSubmit={handleCreateCommunityDeal} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <input placeholder="Event title" className="px-4 py-2 border rounded-lg xl:col-span-2" value={communityDealData.event_title} onChange={(e) => setCommunityDealData({ ...communityDealData, event_title: e.target.value })} required />
                    <select className="px-4 py-2 border rounded-lg xl:col-span-2" value={communityDealData.product_id} onChange={(e) => setCommunityDealData({ ...communityDealData, product_id: e.target.value })} required><option value="">Select product</option>{products.slice(0, 200).map((product) => <option key={product.id} value={product.id}>{product.title || product.name}</option>)}</select>
                    <select className="px-4 py-2 border rounded-lg" value={communityDealData.society_name} onChange={(e) => setCommunityDealData({ ...communityDealData, society_name: e.target.value })} required><option value="">Select society</option>{rwaSocieties.map((society) => <option key={society} value={society}>{society}</option>)}</select>
                    <input placeholder="Minimum participants" type="number" min={2} className="px-4 py-2 border rounded-lg" value={communityDealData.minimum_participants} onChange={(e) => setCommunityDealData({ ...communityDealData, minimum_participants: e.target.value })} required />
                    <input placeholder="Discount %" type="number" min={1} className="px-4 py-2 border rounded-lg" value={communityDealData.discount_percentage} onChange={(e) => setCommunityDealData({ ...communityDealData, discount_percentage: e.target.value })} required />
                    <input placeholder="Duration (days)" type="number" min={1} className="px-4 py-2 border rounded-lg" value={communityDealData.event_duration_days} onChange={(e) => setCommunityDealData({ ...communityDealData, event_duration_days: e.target.value })} required />
                    <input type="date" className="px-4 py-2 border rounded-lg" value={communityDealData.start_date} onChange={(e) => setCommunityDealData({ ...communityDealData, start_date: e.target.value })} required />
                    <div className="xl:col-span-2 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">Only admins and RWA coordinators can create live community deals.</div>
                    <div className="xl:col-span-4 flex gap-2"><button type="submit" className="bg-rose-600 text-white px-6 py-2 rounded-lg font-medium">{editingCommunityEvent ? 'Update Deal' : 'Launch Deal'}</button><button type="button" onClick={resetCommunityDealForm} className="text-gray-500 px-4 py-2">Cancel</button></div>
                  </form>
                </motion.div>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <h3 className="text-lg font-bold text-gray-900">RWA Accounts</h3>
                    <p className="mt-1 text-sm text-gray-500">Coordinators can create community deals. Residents can join open events only.</p>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Society</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Block</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">{users.map((user) => <tr key={user.id}><td className="px-6 py-4 font-medium text-gray-900">{user.name}</td><td className="px-6 py-4">{user.email}</td><td className="px-6 py-4">{user.society_name}</td><td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.community_role === 'resident' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{user.community_role === 'resident' ? 'Resident' : 'Coordinator'}</span></td><td className="px-6 py-4">{user.apartment_block || '-'}</td></tr>)}</tbody>
                  </table>
                  {users.length === 0 ? <div className="px-6 py-16 text-center text-sm text-gray-500">No RWA accounts created yet.</div> : null}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900">How Community Deals Work</h3>
                  <div className="mt-4 grid gap-3 text-sm text-gray-600">
                    <p><span className="font-semibold text-gray-900">1.</span> Admin creates a group buying deal for a selected society.</p>
                    <p><span className="font-semibold text-gray-900">2.</span> Residents join from the product page and the participant count grows live.</p>
                    <p><span className="font-semibold text-gray-900">3.</span> Once the minimum is reached, the community discount becomes active in cart.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Live Community Deals</h3>
                  <p className="mt-1 text-sm text-gray-500">Track progress, discount activation, and resident participation for each society event.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {communityEvents.map((event) => <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Community deal</p><h4 className="mt-2 text-lg font-bold text-slate-950">{event.event_title || event.product_name}</h4><p className="mt-1 text-sm text-slate-500">{event.product_name}</p><p className="mt-1 text-sm text-slate-500">{event.society_name}</p></div><span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${event.status === 'active' ? 'bg-emerald-50 text-emerald-700' : event.status === 'expired' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>{event.status}</span></div><div className="mt-4 grid gap-2 text-sm text-slate-500"><p>{event.progress_label}</p><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${event.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${event.progress_percentage}%` }} /></div><p className="font-medium text-slate-700">{event.participants_needed_label}</p><div className="grid gap-2 sm:grid-cols-2"><p>Minimum participants: <span className="font-semibold text-slate-950">{event.minimum_participants || event.minimum_quantity}</span></p><p>Discount: <span className="font-semibold text-emerald-600">{event.discount_percentage}%</span></p><p>{event.remaining_time_label}</p><p>Duration: <span className="font-semibold text-slate-950">{event.event_duration_days || 0} days</span></p></div><p className="flex items-center gap-3"><span className="text-slate-400 line-through">{formatCurrency(event.original_price)}</span><span className="text-lg font-bold text-slate-950">{formatCurrency(event.final_price)}</span></p></div><div className="mt-4 flex gap-3"><button type="button" onClick={() => handleEditCommunityDeal(event)} className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600">Edit Deal</button><button type="button" onClick={() => void handleViewParticipants(event)} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">View Participants</button></div></article>)}
                  {communityEvents.length === 0 ? <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">No community deals created yet.</div> : null}
                </div>
              </div>
            </div>
          ) : null}
          {activeTab === 'reviews' ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-900">Product Reviews</h2><p className="mt-1 text-sm text-gray-500">Review submissions are available for admin export and moderation.</p></div><button onClick={() => void handleDownloadReviews()} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"><Download size={16} />Download Reviews</button></div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Product</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Rating</th><th className="px-6 py-4">Review</th><th className="px-6 py-4">Date</th></tr></thead><tbody className="divide-y divide-gray-100">{reviews.map((review) => <tr key={review.id}><td className="px-6 py-4 font-medium text-gray-900">{review.product_name}</td><td className="px-6 py-4">{review.user_name}</td><td className="px-6 py-4"><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><Star size={12} className="fill-current" />{review.rating.toFixed(1)}</span></td><td className="px-6 py-4 max-w-[360px] text-gray-600">{review.review_text}</td><td className="px-6 py-4 text-gray-500">{new Date(review.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{reviews.length === 0 ? <div className="px-6 py-16 text-center text-sm text-gray-500">No product reviews yet.</div> : null}</div>
            </div>
          ) : null}

          {activeTab === 'coupons' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-900">Coupon Manager</h2></div><button onClick={() => setShowCouponForm((current) => !current)} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"><Plus size={16} />{showCouponForm ? 'Close' : 'Create Coupon'}</button></div>
              {showCouponForm ? (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <form onSubmit={handleCreateCoupon} className="grid grid-cols-2 gap-4">
                    <input placeholder="Coupon Code" className="px-4 py-2 border rounded-lg" value={couponData.coupon_code} onChange={(e) => setCouponData({ ...couponData, coupon_code: e.target.value.toUpperCase() })} required />
                    <select className="px-4 py-2 border rounded-lg" value={couponData.discount_type} onChange={(e) => setCouponData({ ...couponData, discount_type: e.target.value as CouponForm['discount_type'] })}><option value="percentage">Percentage</option><option value="flat">Flat</option></select>
                    <input placeholder="Discount Value" type="number" className="px-4 py-2 border rounded-lg" value={couponData.discount_value} onChange={(e) => setCouponData({ ...couponData, discount_value: parseFloat(e.target.value) || 0 })} required />
                    <input placeholder="Minimum Order Value" type="number" className="px-4 py-2 border rounded-lg" value={couponData.minimum_order_value} onChange={(e) => setCouponData({ ...couponData, minimum_order_value: parseFloat(e.target.value) || 0 })} />
                    <input type="date" className="px-4 py-2 border rounded-lg" value={couponData.expiry_date} onChange={(e) => setCouponData({ ...couponData, expiry_date: e.target.value })} required />
                    <input placeholder="Max Usage" type="number" className="px-4 py-2 border rounded-lg" value={couponData.max_usage} onChange={(e) => setCouponData({ ...couponData, max_usage: parseInt(e.target.value, 10) || 0 })} required />
                    <select className="px-4 py-2 border rounded-lg" value={couponData.user_type} onChange={(e) => setCouponData({ ...couponData, user_type: e.target.value as CouponForm['user_type'] })}><option value="customer">customer</option><option value="first_time_user">first_time_user</option><option value="community_user">community_user</option></select>
                    <div className="col-span-2 flex gap-2"><button type="submit" className="bg-rose-600 text-white px-6 py-2 rounded-lg font-medium">Save Coupon</button><button type="button" onClick={() => setShowCouponForm(false)} className="text-gray-500 px-4 py-2">Cancel</button></div>
                  </form>
                </motion.div>
              ) : null}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Code</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Value</th><th className="px-6 py-4">Min Order</th><th className="px-6 py-4">Usage</th><th className="px-6 py-4">User Type</th><th className="px-6 py-4">Expiry</th></tr></thead><tbody className="divide-y divide-gray-100">{coupons.map((coupon) => <tr key={coupon.id}><td className="px-6 py-4 font-semibold text-slate-950">{coupon.coupon_code}</td><td className="px-6 py-4 uppercase text-xs font-semibold text-slate-500">{coupon.discount_type}</td><td className="px-6 py-4">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)}</td><td className="px-6 py-4">{formatCurrency(coupon.minimum_order_value)}</td><td className="px-6 py-4">{coupon.current_usage} / {coupon.max_usage}</td><td className="px-6 py-4">{coupon.user_type}</td><td className="px-6 py-4">{new Date(coupon.expiry_date).toLocaleDateString()}</td></tr>)}</tbody></table>{coupons.length === 0 ? <div className="px-6 py-16 text-center text-sm text-gray-500">No coupons created yet.</div> : null}</div>
            </div>
          ) : null}
        </div>
      </div>
      {selectedEvent ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4"><div className="w-full max-w-3xl rounded-[30px] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)]"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Participants</p><h3 className="mt-2 text-2xl font-bold text-slate-950">{selectedEvent.event_title || selectedEvent.product_name}</h3><p className="mt-1 text-sm text-slate-500">{selectedEvent.society_name}</p></div><button type="button" onClick={() => setSelectedEvent(null)} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Close</button></div><div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"><tr><th className="px-4 py-4">User name</th><th className="px-4 py-4">Apartment / Block</th><th className="px-4 py-4 text-right">Join time</th></tr></thead><tbody className="divide-y divide-slate-100 bg-white text-slate-600">{participants.map((participant) => <tr key={participant.id}><td className="px-4 py-4 font-medium text-slate-950">{participant.customer_name}</td><td className="px-4 py-4 text-slate-600">{participant.apartment_block || 'Apartment resident'}</td><td className="px-4 py-4 text-right font-medium text-slate-950">{new Date(participant.joined_at).toLocaleString()}</td></tr>)}</tbody></table>{participants.length === 0 ? <div className="px-4 py-12 text-center text-sm text-slate-500">No one has joined this community deal yet.</div> : null}</div></div></div> : null}

    </div>
  );
}

