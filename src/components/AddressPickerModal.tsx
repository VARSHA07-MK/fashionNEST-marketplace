import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Crosshair, Edit3, Loader2, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import type { SavedAddress } from '../context/AuthContext';

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    google?: any;
  }
}

type AddressForm = {
  recipient_name: string;
  phone_number: string;
  house_number: string;
  street: string;
  area: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  address_type: string;
  is_default: boolean;
};

type AddressPickerModalProps = {
  isOpen: boolean;
  token: string | null;
  userName?: string;
  userPhone?: string;
  currentAddress: SavedAddress | null;
  onClose: () => void;
  onAddressChange: (address: SavedAddress | null) => void;
};

type Suggestion = { placeId: string; description: string };

const emptyForm = (userName = '', userPhone = ''): AddressForm => ({
  recipient_name: userName,
  phone_number: userPhone,
  house_number: '',
  street: '',
  area: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  latitude: 12.9716,
  longitude: 77.5946,
  address_type: 'home',
  is_default: false,
});

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
const GOOGLE_MAPS_API_KEY = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';
let mapsLoaderPromise: Promise<any> | null = null;

const loadGoogleMaps = () => {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('Missing Google Maps API key.'));
  }

  if (!mapsLoaderPromise) {
    mapsLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-maps="fashionest"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google.maps));
        existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps.')));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMaps = 'fashionest';
      script.onload = () => resolve(window.google.maps);
      script.onerror = () => reject(new Error('Failed to load Google Maps.'));
      document.body.appendChild(script);
    });
  }

  return mapsLoaderPromise;
};

const extractAddressPart = (components: any[], types: string[]) => {
  const match = components.find((component) => types.every((type) => component.types.includes(type)) || types.some((type) => component.types.includes(type)));
  return match?.long_name || '';
};

const formatAddressLine = (address: SavedAddress | null) => {
  if (!address) return 'Add your delivery address';
  return address.location_label || [address.area, address.city].filter(Boolean).join(', ') || 'Saved address';
};

export default function AddressPickerModal({ isOpen, token, userName, userPhone, currentAddress, onClose, onAddressChange }: AddressPickerModalProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [form, setForm] = useState<AddressForm>(emptyForm(userName, userPhone));
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [serviceability, setServiceability] = useState<{ serviceable: boolean; message: string } | null>(null);
  const [mapError, setMapError] = useState('');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  const locationLabel = useMemo(() => formatAddressLine(currentAddress), [currentAddress]);

  const hydrateForm = (address?: SavedAddress | null) => {
    if (!address) {
      setForm(emptyForm(userName, userPhone));
      return;
    }
    setForm({
      recipient_name: address.recipient_name || userName || '',
      phone_number: address.phone_number || userPhone || '',
      house_number: address.house_number || '',
      street: address.street || '',
      area: address.area || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
      country: address.country || 'India',
      latitude: address.latitude ?? DEFAULT_CENTER.lat,
      longitude: address.longitude ?? DEFAULT_CENTER.lng,
      address_type: address.address_type || 'home',
      is_default: address.is_default,
    });
  };

  const fetchAddresses = async () => {
    if (!token) return;
    setIsLoadingAddresses(true);
    try {
      const response = await fetch('/api/addresses', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await response.json().catch(() => []);
      if (!response.ok) return;
      const nextAddresses = Array.isArray(data) ? data : [];
      setAddresses(nextAddresses);
      const fallbackAddress = currentAddress || nextAddresses.find((address) => address.is_default) || nextAddresses[0] || null;
      hydrateForm(fallbackAddress);
      setShowComposer(nextAddresses.length === 0);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const syncServiceability = async (postalCode: string) => {
    if (!token || postalCode.trim().length < 6) {
      setServiceability(null);
      return;
    }

    try {
      const response = await fetch(`/api/addresses/serviceability?postalCode=${encodeURIComponent(postalCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data) {
        setServiceability(data);
      }
    } catch {
      setServiceability(null);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status !== 'OK' || !results?.length) return;
      const components = results[0].address_components || [];
      setForm((current) => ({
        ...current,
        latitude: lat,
        longitude: lng,
        street: current.street || extractAddressPart(components, ['route']),
        area: extractAddressPart(components, ['sublocality_level_1']) || extractAddressPart(components, ['sublocality']) || current.area,
        city: extractAddressPart(components, ['locality']) || current.city,
        state: extractAddressPart(components, ['administrative_area_level_1']) || current.state,
        postal_code: extractAddressPart(components, ['postal_code']) || current.postal_code,
        country: extractAddressPart(components, ['country']) || current.country,
      }));
    });
  };

  const initializeMap = async () => {
    if (!isOpen || !mapContainerRef.current) return;

    try {
      setMapError('');
      const maps = await loadGoogleMaps();
      if (!mapContainerRef.current) return;

      const center = {
        lat: form.latitude ?? DEFAULT_CENTER.lat,
        lng: form.longitude ?? DEFAULT_CENTER.lng,
      };

      if (mapRef.current) {
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(14);
        return;
      }

      mapRef.current = new maps.Map(mapContainerRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
      });
      geocoderRef.current = new maps.Geocoder();
      autocompleteRef.current = new maps.places.AutocompleteService();

      maps.event.addListener(mapRef.current, 'idle', () => {
        const currentCenter = mapRef.current.getCenter();
        if (!currentCenter) return;
        reverseGeocode(currentCenter.lat(), currentCenter.lng());
      });
    } catch (error: any) {
      setMapError(error.message || 'Google Maps is unavailable right now.');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void fetchAddresses();
    void initializeMap();
  }, [isOpen, token]);

  useEffect(() => {
    if (isOpen || !currentAddress) {
      return;
    }

    mapRef.current = null;
    geocoderRef.current = null;
    autocompleteRef.current = null;
    setSuggestions([]);
    setSearchQuery('');
    setMapError('');
    setServiceability(null);
    setEditingAddressId(null);
    setShowComposer(false);
    hydrateForm(currentAddress);
  }, [isOpen, currentAddress]);

  useEffect(() => {
    if (!isOpen || !mapRef.current || form.latitude == null || form.longitude == null) {
      return;
    }

    mapRef.current.setCenter({ lat: form.latitude, lng: form.longitude });
  }, [form.latitude, form.longitude, isOpen]);

  useEffect(() => {
    void syncServiceability(form.postal_code);
  }, [form.postal_code, token]);

  useEffect(() => {
    if (!isOpen || !autocompleteRef.current || !searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    autocompleteRef.current.getPlacePredictions({ input: searchQuery, componentRestrictions: { country: 'in' } }, (predictions: any[]) => {
      setSuggestions((predictions || []).slice(0, 5).map((item) => ({ placeId: item.place_id, description: item.description })));
    });
  }, [searchQuery, isOpen]);


  const handleSuggestionSelect = (suggestion: Suggestion) => {
    if (!window.google?.maps?.Geocoder || !mapRef.current) return;
    setSearchQuery(suggestion.description);
    setSuggestions([]);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId: suggestion.placeId }, (results: any[], status: string) => {
      if (status !== 'OK' || !results?.length) return;
      const location = results[0].geometry.location;
      mapRef.current.setCenter(location);
      mapRef.current.setZoom(16);
      reverseGeocode(location.lat(), location.lng());
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(16);
        }
        setForm((current) => ({ ...current, latitude: lat, longitude: lng }));
        void reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleOpenComposer = (address?: SavedAddress) => {
    setEditingAddressId(address?.id || null);
    hydrateForm(address || currentAddress || null);
    setShowComposer(true);
    if (address && mapRef.current && address.latitude != null && address.longitude != null) {
      mapRef.current.setCenter({ lat: address.latitude, lng: address.longitude });
      mapRef.current.setZoom(16);
    }
  };

  const handleSaveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setIsSaving(true);

    try {
      const response = await fetch(editingAddressId ? `/api/addresses/${editingAddressId}` : '/api/addresses', {
        method: editingAddressId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return;
      }
      await fetchAddresses();
      setShowComposer(false);
      onAddressChange(data.address || null);
      setServiceability(data.serviceable !== undefined ? { serviceable: data.serviceable, message: data.message } : null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (addressId: number) => {
    if (!token) return;
    const response = await fetch(`/api/addresses/${addressId}/default`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return;
    await fetchAddresses();
    onAddressChange(data.address || null);
  };

  const handleDelete = async (addressId: number) => {
    if (!token) return;
    const response = await fetch(`/api/addresses/${addressId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    if (!response.ok) return;
    await fetchAddresses();
    const nextDefault = addresses.find((address) => address.id !== addressId && address.is_default) || null;
    onAddressChange(nextDefault);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-slate-950/50" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }} className="fixed inset-x-0 bottom-0 z-[120] mx-auto h-[90vh] w-[min(100%,1080px)] overflow-hidden rounded-t-[32px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] lg:inset-y-10 lg:h-auto lg:rounded-[32px]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Location</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Choose your delivery address</h2>
            <p className="mt-1 text-sm text-slate-500">Current location: {locationLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500"><X size={18} /></button>
        </div>

        <div className="grid h-[calc(90vh-88px)] gap-0 overflow-hidden lg:h-[720px] lg:grid-cols-[0.96fr_1.04fr]">
          <div className="overflow-y-auto border-b border-slate-200 px-5 py-5 lg:border-b-0 lg:border-r lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Saved addresses</p>
                <p className="text-sm text-slate-500">Home, work, and other delivery spots.</p>
              </div>
              <button type="button" onClick={() => handleOpenComposer()} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"><Plus size={14} />Add address</button>
            </div>

            <div className="mt-4 grid gap-3">
              {isLoadingAddresses ? <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">Loading saved addresses...</div> : null}
              {!isLoadingAddresses && addresses.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No saved addresses yet. Add one to get started.</div> : null}
              {addresses.map((address) => (
                <article key={address.id} className={`rounded-[24px] border p-4 shadow-sm transition ${currentAddress?.id === address.id ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${currentAddress?.id === address.id ? 'text-white/70' : 'text-slate-400'}`}>{address.address_type}</p>
                      <h3 className="mt-2 text-base font-bold">{address.recipient_name}</h3>
                      <p className={`mt-2 text-sm ${currentAddress?.id === address.id ? 'text-white/80' : 'text-slate-500'}`}>{address.full_address}</p>
                      <p className={`mt-1 text-sm ${currentAddress?.id === address.id ? 'text-white/70' : 'text-slate-400'}`}>{address.phone_number}</p>
                    </div>
                    {address.is_default ? <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${currentAddress?.id === address.id ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-700'}`}>Default</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { onAddressChange(address); onClose(); }} className={`rounded-full px-3 py-2 text-xs font-semibold ${currentAddress?.id === address.id ? 'bg-white text-slate-950' : 'bg-slate-950 text-white'}`}>Use this address</button>
                    <button type="button" onClick={() => handleSetDefault(address.id)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${currentAddress?.id === address.id ? 'border-white/20 text-white' : 'border-slate-200 text-slate-700'}`}>Set default</button>
                    <button type="button" onClick={() => handleOpenComposer(address)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${currentAddress?.id === address.id ? 'border-white/20 text-white' : 'border-slate-200 text-slate-700'}`}><Edit3 size={13} className="mr-1 inline" />Edit</button>
                    <button type="button" onClick={() => void handleDelete(address.id)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${currentAddress?.id === address.id ? 'border-white/20 text-white' : 'border-slate-200 text-slate-700'}`}><Trash2 size={13} className="mr-1 inline" />Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto px-5 py-5 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Search and pin-drop</p>
                <p className="text-sm text-slate-500">Drag the map or search to refine the address.</p>
              </div>
              <button type="button" onClick={handleUseCurrentLocation} disabled={isLocating} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
                {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}Use Current Location
              </button>
            </div>

            <div className="relative mt-4">
              <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"><Search size={18} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search Whitefield, Bangalore" className="w-full bg-transparent text-sm text-slate-900 outline-none" /></label>
              {suggestions.length > 0 ? <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-10 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-lg">{suggestions.map((suggestion) => <button key={suggestion.placeId} type="button" onClick={() => handleSuggestionSelect(suggestion)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"><Search size={16} className="text-slate-400" />{suggestion.description}</button>)}</div> : null}
            </div>

            <div className="relative mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
              <div ref={mapContainerRef} className="h-[280px] w-full" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-rose-600 p-3 text-white shadow-xl"><MapPin size={22} /></div>
              </div>
              {mapError ? <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-6 text-center text-sm text-slate-500">{mapError} You can still type the address below and save it manually.</div> : null}
            </div>

            {serviceability ? <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${serviceability.serviceable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{serviceability.message}</div> : null}

            {!showComposer ? <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">Choose a saved address or tap Add address / Edit to enter full delivery details before saving.</div> : null}

            {showComposer ? <form onSubmit={handleSaveAddress} className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Recipient name</span>
                <input value={form.recipient_name} onChange={(event) => setForm((current) => ({ ...current, recipient_name: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Phone number</span>
                <input value={form.phone_number} onChange={(event) => setForm((current) => ({ ...current, phone_number: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Flat / House number</span>
                <input value={form.house_number} onChange={(event) => setForm((current) => ({ ...current, house_number: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Street</span>
                <input value={form.street} onChange={(event) => setForm((current) => ({ ...current, street: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Area</span>
                <input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">City</span>
                <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">State</span>
                <input value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Postal code</span>
                <input value={form.postal_code} onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Country</span>
                <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white" />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-slate-700">Address type</span>
                <select value={form.address_type} onChange={(event) => setForm((current) => ({ ...current, address_type: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white">
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 md:col-span-2">
                <input type="checkbox" checked={form.is_default} onChange={(event) => setForm((current) => ({ ...current, is_default: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                Save as default address
              </label>
              <div className="flex gap-3 md:col-span-2">
                <button type="button" onClick={() => { setShowComposer(false); hydrateForm(currentAddress); }} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" disabled={isSaving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editingAddressId ? 'Update address' : 'Confirm location'}
                </button>
              </div>
            </form> : null}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}




