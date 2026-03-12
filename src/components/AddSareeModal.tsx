import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AddSareeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categoryOptions = ['Sarees', 'Kurtas', 'Blouses', 'Dresses', 'Kurta Sets'];

export default function AddSareeModal({ isOpen, onClose, onSuccess }: AddSareeModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Sarees',
    price: '',
    fabric: '',
    color: '',
    occasion: '',
    description: '',
    image_url: '',
    stock: '1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { token } = useAuth();

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'Sarees',
      price: '',
      fabric: '',
      color: '',
      occasion: '',
      description: '',
      image_url: '',
      stock: '1',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock, 10),
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        window.setTimeout(() => {
          setShowSuccess(false);
          onSuccess();
          onClose();
          resetForm();
        }, 1800);
      }
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            className="fixed left-1/2 top-1/2 z-[70] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[30px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
          >
            {showSuccess ? (
              <div className="space-y-4 p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-950">Item listed</h2>
                <p className="text-sm text-slate-500">Your product is now part of the fashionNEST storefront.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-8 py-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Sell on fashionNEST</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">List a fashion product</h2>
                  </div>
                  <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4 p-8 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
                    <input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData((current) => ({ ...current, title: e.target.value }))}
                      placeholder="Banarasi saree, festive blouse, office kurta..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Category</span>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData((current) => ({ ...current, category: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-rose-500 focus:bg-white"
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Price</span>
                    <input
                      required
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData((current) => ({ ...current, price: e.target.value }))}
                      placeholder="1490"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Fabric</span>
                    <input
                      required
                      value={formData.fabric}
                      onChange={(e) => setFormData((current) => ({ ...current, fabric: e.target.value }))}
                      placeholder="Silk, cotton, rayon"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Color</span>
                    <input
                      required
                      value={formData.color}
                      onChange={(e) => setFormData((current) => ({ ...current, color: e.target.value }))}
                      placeholder="Ruby red"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Occasion</span>
                    <input
                      required
                      value={formData.occasion}
                      onChange={(e) => setFormData((current) => ({ ...current, occasion: e.target.value }))}
                      placeholder="Wedding, festive, office"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Stock</span>
                    <input
                      required
                      type="number"
                      min={1}
                      value={formData.stock}
                      onChange={(e) => setFormData((current) => ({ ...current, stock: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Image URL</span>
                    <div className="relative">
                      <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        required
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData((current) => ({ ...current, image_url: e.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none focus:border-rose-500 focus:bg-white"
                      />
                    </div>
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))}
                      placeholder="Describe the fit, styling details, and why it stands out."
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-full bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? 'Listing item...' : 'Publish item'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}



