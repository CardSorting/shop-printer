'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Layers } from 'lucide-react';
import { useCart } from '../../../hooks/useCart';
import type { Product } from '@domain/models';

export const PRESET_BACKS = [
  {
    id: 'back-dragon',
    name: 'Mythic Dragon',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80&sig=101',
    theme: 'bg-red-950/20 border-red-100 hover:border-red-300'
  },
  {
    id: 'back-cosmic',
    name: 'Celestial Sphere',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80&sig=102',
    theme: 'bg-blue-950/20 border-blue-100 hover:border-blue-300'
  },
  {
    id: 'back-celtic',
    name: 'Forest Mana',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80&sig=103',
    theme: 'bg-emerald-950/20 border-emerald-100 hover:border-emerald-300'
  },
  {
    id: 'back-neon',
    name: 'Cyber Grid',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80&sig=104',
    theme: 'bg-purple-950/20 border-purple-100 hover:border-purple-300'
  }
];

interface CustomizeContextType {
  product: Product;
  selectedVariant: any;
  deckSize: number;
  qty: number;
  customImages: string[];
  setCustomImages: React.Dispatch<React.SetStateAction<string[]>>;
  aspectWarnings: Record<number, boolean>;
  setAspectWarnings: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  frontsCount: number;
  adding: boolean;
  added: boolean;
  handleAddToCart: () => Promise<void>;
  tcgTheme: string;
  setTcgTheme: (v: string) => void;
  activeStep: number;
  
  // Bulk upload & queue states
  bulkUploading: boolean;
  bulkProgress: { current: number; total: number };
  importingDecklist: boolean;
  importProgress: { current: number; total: number };
  decklistText: string;
  setDecklistText: (v: string) => void;
  uploadingIdx: number | null;
  setUploadingIdx: (v: number | null) => void;
  lightboxCardIdx: number | null;
  setLightboxCardIdx: (v: number | null) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  activeTabIdx: number;
  setActiveTabIdx: (v: number) => void;

  // Actions
  handleSelectCardBack: (url: string) => void;
  handleUploadCardBack: (file: File) => Promise<void>;
  handleFileChange: (cardIdx: number, file: File) => Promise<void>;
  handleBulkUpload: (files: FileList | null) => Promise<void>;
  handleImportDecklist: () => Promise<void>;
  handleDuplicateCard: (cardIdx: number) => void;
  handleClearCard: (cardIdx: number) => void;
  handleAutofill: () => void;
  handleClearAll: () => void;
}

const CustomizeContext = createContext<CustomizeContextType | undefined>(undefined);

export function useCustomizeWorkspace() {
  const context = useContext(CustomizeContext);
  if (!context) throw new Error('useCustomizeWorkspace must be used within CustomizeWorkspaceShell');
  return context;
}

export function CustomizeWorkspaceShell({ product, children }: { product: Product; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addItem, openCart } = useCart();

  const variantId = searchParams.get('variant') || '';
  const qty = parseInt(searchParams.get('qty') || '1', 10);

  // Find the selected variant or default to first
  const selectedVariant = useMemo(() => {
    return product.variants?.find(v => v.id === variantId) || product.variants?.[0];
  }, [product.variants, variantId]);

  // Determine deck size based on selected variant
  const deckSize = useMemo(() => {
    const title = selectedVariant?.title;
    if (!title) return 40;
    if (title.includes('40')) return 40;
    if (title.includes('50')) return 50;
    if (title.includes('60')) return 60;
    if (title.includes('100')) return 100;
    return 40;
  }, [selectedVariant]);

  // Shared Customize States
  const [customImages, setCustomImages] = useState<string[]>(() => Array(deckSize + 1).fill(''));
  const [aspectWarnings, setAspectWarnings] = useState<Record<number, boolean>>({});
  const [tcgTheme, setTcgTheme] = useState('yugioh');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Upload/Fetch coordinator states
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [importingDecklist, setImportingDecklist] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [decklistText, setDecklistText] = useState('');
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [lightboxCardIdx, setLightboxCardIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  // Sync array when deckSize changes
  useEffect(() => {
    setCustomImages(Array(deckSize + 1).fill(''));
    setAspectWarnings({});
    setActiveTabIdx(0);
  }, [deckSize]);

  const frontsCount = useMemo(() => {
    return customImages.slice(0, deckSize).filter(Boolean).length;
  }, [customImages, deckSize]);

  // Determine active step based on route
  const activeStep = useMemo(() => {
    if (pathname.endsWith('/fronts')) return 2;
    if (pathname.endsWith('/back')) return 3;
    if (pathname.endsWith('/review')) return 4;
    return 1;
  }, [pathname]);

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await addItem(
        product.id,
        qty,
        selectedVariant?.id,
        customImages
      );
      setAdded(true);
      setTimeout(() => {
        openCart();
        router.push('/cart');
      }, 800);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add custom deck to cart.');
    } finally {
      setAdding(false);
    }
  };

  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 500): Promise<Response> => {
    try {
      const res = await fetch(url, options);
      if (!res.ok && retries > 0) throw new Error(`HTTP error! status: ${res.status}`);
      return res;
    } catch (err) {
      if (retries === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
  };

  const handleSelectCardBack = (url: string) => {
    const nextImages = [...customImages];
    while (nextImages.length <= deckSize) {
      nextImages.push('');
    }
    nextImages[deckSize] = url;
    setCustomImages(nextImages);
  };

  const compressImageOnClient = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 1500;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.90);
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadCardBack = async (file: File) => {
    if (!file) return;
    try {
      const compressedFile = await compressImageOnClient(file);
      const formData = new FormData();
      formData.append('file', compressedFile);
      const res = await fetchWithRetry('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      handleSelectCardBack(data.url);
    } catch {
      alert('Card back upload failed.');
    }
  };

  const handleFileChange = async (cardIdx: number, file: File) => {
    if (!file) return;
    setUploadingIdx(cardIdx);
    try {
      const compressedFile = await compressImageOnClient(file);
      const formData = new FormData();
      formData.append('file', compressedFile);
      const res = await fetchWithRetry('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      const nextImages = [...customImages];
      while (nextImages.length <= deckSize) {
        nextImages.push('');
      }
      nextImages[cardIdx] = data.url;
      setCustomImages(nextImages);
    } catch {
      alert('Failed to upload image.');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    setBulkUploading(true);
    const nextImages = [...customImages];
    while (nextImages.length <= deckSize) {
      nextImages.push('');
    }

    const emptyIndices: number[] = [];
    for (let idx = 0; idx < deckSize; idx++) {
      if (!nextImages[idx]) {
        emptyIndices.push(idx);
      }
    }

    const totalToUpload = Math.min(fileList.length, emptyIndices.length);
    setBulkProgress({ current: 0, total: totalToUpload });
    let completedCount = 0;
    let fileIdx = 0;
    const limit = 3;

    const uploadNext = async (): Promise<void> => {
      if (fileIdx >= totalToUpload) return;
      const currentFileIdx = fileIdx++;
      const targetCardIdx = emptyIndices[currentFileIdx];
      const file = fileList[currentFileIdx];

      try {
        const compressedFile = await compressImageOnClient(file);
        const formData = new FormData();
        formData.append('file', compressedFile);
        const res = await fetchWithRetry('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          nextImages[targetCardIdx] = data.url;
        }
      } catch (e) {
        console.error(e);
      } finally {
        completedCount++;
        setBulkProgress({ current: completedCount, total: totalToUpload });
        await uploadNext();
      }
    };

    const workers: Promise<void>[] = [];
    for (let w = 0; w < Math.min(limit, totalToUpload); w++) {
      workers.push(uploadNext());
    }
    await Promise.all(workers);

    setCustomImages(nextImages);
    setBulkUploading(false);
  };

  const handleImportDecklist = async () => {
    if (!decklistText.trim()) return;
    const lines = decklistText.split('\n');
    const parsedCards: string[] = [];

    lines.forEach((line) => {
      const match = line.trim().match(/^(\d+)\x20+(.+)$/);
      if (match) {
        const qtyVal = parseInt(match[1], 10);
        const name = match[2].trim();
        for (let i = 0; i < qtyVal; i++) {
          parsedCards.push(name);
        }
      } else if (line.trim()) {
        parsedCards.push(line.trim());
      }
    });

    if (parsedCards.length === 0) {
      alert('Could not find any valid card names.');
      return;
    }

    const cardsToGenerate = parsedCards.slice(0, deckSize);
    setImportingDecklist(true);
    setImportProgress({ current: 0, total: cardsToGenerate.length });

    const nextImages = [...customImages];
    while (nextImages.length <= deckSize) {
      nextImages.push('');
    }

    const failedCards: string[] = [];
    let completedCount = 0;
    let cardIdx = 0;
    const limit = 3;

    const importNext = async (): Promise<void> => {
      if (cardIdx >= cardsToGenerate.length) return;
      const currentCardIdx = cardIdx++;
      const cardName = cardsToGenerate[currentCardIdx];
      let uploadedUrl = '';
      
      try {
        const apiRes = await fetchWithRetry('/api/card-fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cardName, game: tcgTheme }),
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          uploadedUrl = apiData.url;
        }
      } catch (error) {
        console.error(error);
      }

      if (uploadedUrl) {
        nextImages[currentCardIdx] = uploadedUrl;
      } else {
        failedCards.push(cardName);
      }

      completedCount++;
      setImportProgress({ current: completedCount, total: cardsToGenerate.length });
      await importNext();
    };

    const workers: Promise<void>[] = [];
    for (let w = 0; w < Math.min(limit, cardsToGenerate.length); w++) {
      workers.push(importNext());
    }
    await Promise.all(workers);

    setCustomImages(nextImages);
    setImportingDecklist(false);
    setDecklistText('');

    if (failedCards.length > 0) {
      const uniqueFailed = Array.from(new Set(failedCards));
      alert(
        `Import complete. We fetched images for most cards, but could not find matching artwork for:\n\n` +
        uniqueFailed.map(c => `• ${c}`).join('\n') +
        `\n\nYou can manually upload files for these blank slots.`
      );
    }
    router.push(`/products/${product.handle}/customize/fronts${buildQuery()}`);
  };

  const handleDuplicateCard = (cardIdx: number) => {
    const nextImages = [...customImages];
    while (nextImages.length <= deckSize) {
      nextImages.push('');
    }
    let targetIdx = cardIdx + 1;
    while (targetIdx < deckSize && nextImages[targetIdx]) {
      targetIdx++;
    }
    if (targetIdx < deckSize) {
      nextImages[targetIdx] = nextImages[cardIdx];
      setCustomImages(nextImages);
    } else {
      alert('No empty slots available.');
    }
  };

  const handleClearCard = (cardIdx: number) => {
    const nextImages = [...customImages];
    nextImages[cardIdx] = '';
    setCustomImages(nextImages);
  };

  const handleAutofill = () => {
    const autofilled = Array.from({ length: deckSize }, (_, i) => {
      return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80&sig=${i}`;
    });
    autofilled.push(customImages[deckSize] || PRESET_BACKS[0].url);
    setCustomImages(autofilled);
  };

  const handleClearAll = () => {
    const cleared = Array(deckSize).fill('');
    cleared.push(customImages[deckSize] || PRESET_BACKS[0].url);
    setCustomImages(cleared);
  };

  const buildQuery = () => `?variant=${variantId}&qty=${qty}`;

  const nextStepLink = () => {
    if (activeStep === 1) return `/products/${product.handle}/customize/fronts${buildQuery()}`;
    if (activeStep === 2) return `/products/${product.handle}/customize/back${buildQuery()}`;
    if (activeStep === 3) return `/products/${product.handle}/customize/review${buildQuery()}`;
    return '';
  };

  const prevStepLink = () => {
    if (activeStep === 2) return `/products/${product.handle}/customize${buildQuery()}`;
    if (activeStep === 3) return `/products/${product.handle}/customize/fronts${buildQuery()}`;
    if (activeStep === 4) return `/products/${product.handle}/customize/back${buildQuery()}`;
    return '';
  };

  const nextStepLabel = () => {
    if (activeStep === 1) return 'Design Fronts';
    if (activeStep === 2) return 'Choose Card Back';
    if (activeStep === 3) return 'Review Deck';
    return '';
  };

  // Stepper steps configuration
  const steps = [
    { number: 1, label: 'Start & Import', href: '' },
    { number: 2, label: 'Customize Fronts', href: '/fronts' },
    { number: 3, label: 'Choose Back', href: '/back' },
    { number: 4, label: 'Final Review', href: '/review' },
  ];

  return (
    <CustomizeContext.Provider value={{
      product,
      selectedVariant,
      deckSize,
      qty,
      customImages,
      setCustomImages,
      aspectWarnings,
      setAspectWarnings,
      frontsCount,
      adding,
      added,
      handleAddToCart,
      tcgTheme,
      setTcgTheme,
      activeStep,
      
      bulkUploading,
      bulkProgress,
      importingDecklist,
      importProgress,
      decklistText,
      setDecklistText,
      uploadingIdx,
      setUploadingIdx,
      lightboxCardIdx,
      setLightboxCardIdx,
      viewMode,
      setViewMode,
      activeTabIdx,
      setActiveTabIdx,

      handleSelectCardBack,
      handleUploadCardBack,
      handleFileChange,
      handleBulkUpload,
      handleImportDecklist,
      handleDuplicateCard,
      handleClearCard,
      handleAutofill,
      handleClearAll,
    }}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24">
        {/* Workspace Stepper Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            {/* Back Button & Details */}
            <div className="flex items-center gap-3">
              <Link 
                href={`/products/${product.handle}`}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">Playtest Creator</span>
                  <span className="text-xs font-bold text-slate-400">/ {product.name}</span>
                </div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight mt-0.5 leading-none">
                  {selectedVariant?.title || 'Custom Playtest Deck'}
                </h1>
              </div>
            </div>

            {/* Stepper Wizard Progress */}
            <nav className="flex items-center gap-2 md:gap-4 select-none">
              {steps.map((step, idx) => {
                const isCompleted = activeStep > step.number;
                const isActive = activeStep === step.number;
                return (
                  <React.Fragment key={step.number}>
                    {idx > 0 && (
                      <ChevronRight className={`w-3.5 h-3.5 ${isCompleted ? 'text-primary-500' : 'text-slate-200'}`} />
                    )}
                    <Link
                      href={`/products/${product.handle}/customize${step.href}${buildQuery()}`}
                      className={`flex items-center gap-2 transition-all ${isActive ? 'pointer-events-none' : ''}`}
                    >
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all
                        ${isCompleted 
                          ? 'bg-primary-500 border-primary-500 text-white' 
                          : isActive 
                            ? 'bg-slate-900 border-slate-900 text-white ring-4 ring-slate-100' 
                            : 'bg-white border-slate-200 text-slate-400'
                        }
                      `}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.number}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:inline
                        ${isActive ? 'text-slate-900' : isCompleted ? 'text-primary-600' : 'text-slate-400'}
                      `}>
                        {step.label}
                      </span>
                    </Link>
                  </React.Fragment>
                );
              })}
            </nav>

          </div>
        </header>

        {/* Workspace Active Route Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
          {children}
        </main>

        {/* Sticky Footer Wizard Control */}
        <footer className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 py-4 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Status overview */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 hidden sm:block">
                <Layers className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Step {activeStep} of 4</p>
                <p className="text-xs font-black text-slate-800 leading-none mt-0.5">
                  {frontsCount} of {deckSize} Fronts Configured ({Math.round((frontsCount / deckSize) * 100)}%)
                </p>
              </div>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-2.5">
              {activeStep > 1 && (
                <Link
                  href={prevStepLink()}
                  className="h-12 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center"
                >
                  Back
                </Link>
              )}
              
              {activeStep < 4 ? (
                <Link
                  href={nextStepLink()}
                  className="h-12 px-6 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                  {nextStepLabel()}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={adding || frontsCount === 0}
                  className={`h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:-translate-y-0.5 active:translate-y-0
                    ${added 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-20'
                    }
                  `}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      {adding ? 'Adding...' : 'Save & Add to Cart'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </CustomizeContext.Provider>
  );
}
