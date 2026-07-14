'use client';

import React from 'react';
import { 
  useCustomizeWorkspace,
  PRESET_BACKS
} from './CustomizeWorkspaceShell';
import { 
  Upload, 
  UploadCloud, 
  RefreshCw, 
  Copy, 
  Trash2, 
  Eye, 
  Check, 
  AlertCircle, 
  Sparkles, 
  FileText, 
  LayoutGrid, 
  List, 
  Image as ImageIcon,
  CheckCircle2,
  ShoppingCart
} from 'lucide-react';
import { formatCurrency } from '@utils/formatters';
import Link from 'next/link';

export function CustomizeStartStep() {
  const { 
    decklistText, 
    setDecklistText, 
    tcgTheme, 
    setTcgTheme, 
    importingDecklist, 
    importProgress, 
    handleImportDecklist,
    deckSize,
    product,
    selectedVariant,
    qty
  } = useCustomizeWorkspace();

  const buildQuery = () => `?variant=${selectedVariant?.id || ''}&qty=${qty}`;

  return (
    <div className="space-y-10 animate-in fade-in duration-300 max-w-4xl mx-auto">
      
      {/* Step Introduction */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">How would you like to start?</h2>
        <p className="text-sm font-bold text-slate-400">Choose a method to populate your playtest card slots below.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Method 1: Bulk File Upload */}
        <Link
          href={`/products/${product.handle}/customize/fronts${buildQuery()}`}
          className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col justify-between items-center text-center hover:border-primary-500 hover:shadow-xl transition-all cursor-pointer group"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="space-y-2 my-6">
            <h3 className="text-lg font-black text-slate-800">Upload Raw Files</h3>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              Drag and drop PNG, JPG, or WebP images from your device. Best for custom designs or proxies you already downloaded.
            </p>
          </div>
          <span className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-primary-600 transition-colors">
            Start Designing
          </span>
        </Link>

        {/* Method 2: Text Decklist Import */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col justify-between items-center text-center relative group">
          <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-2 my-6 w-full">
            <h3 className="text-lg font-black text-slate-800">Import TCG Decklist</h3>
            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              Paste a standard decklist text. We will automatically fetch matching card artwork on high-quality playtest templates.
            </p>
          </div>

          <div className="w-full text-left space-y-4">
            <textarea
              value={decklistText}
              onChange={(e) => setDecklistText(e.target.value)}
              placeholder={`Example:\n4 Lightning Bolt\n1 Sol Ring\n3 Ash Blossom`}
              rows={4}
              disabled={importingDecklist}
              className="w-full rounded-2xl border-2 border-slate-100 p-3 text-xs font-bold font-mono outline-none transition focus:border-primary-500 resize-none bg-slate-50/50"
            />

            <div className="flex flex-wrap gap-2.5">
              {['yugioh', 'onepiece', 'pokemon', 'magic'].map((theme) => {
                const isSelected = tcgTheme === theme;
                return (
                  <button
                    key={theme}
                    onClick={() => setTcgTheme(theme)}
                    disabled={importingDecklist}
                    className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all
                      ${isSelected 
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm' 
                        : 'border-slate-100 text-slate-400 hover:bg-slate-50 bg-white'
                      }
                    `}
                  >
                    {theme}
                  </button>
                );
              })}
            </div>

            {importingDecklist ? (
              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-primary-500 animate-spin shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-primary-950">Generating & uploading proxies...</p>
                  <p className="text-[8px] font-bold text-primary-600 uppercase tracking-widest mt-0.5">{importProgress.current} / {importProgress.total} Done</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleImportDecklist}
                disabled={!decklistText.trim()}
                className="w-full py-3 bg-gray-900 hover:bg-black disabled:opacity-20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-center flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate {deckSize} Proxies
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export function CustomizeFrontsStep() {
  const {
    deckSize,
    customImages,
    aspectWarnings,
    setAspectWarnings,
    bulkUploading,
    bulkProgress,
    uploadingIdx,
    lightboxCardIdx,
    setLightboxCardIdx,
    viewMode,
    setViewMode,
    activeTabIdx,
    setActiveTabIdx,
    handleFileChange,
    handleBulkUpload,
    handleDuplicateCard,
    handleClearCard,
    handleAutofill,
    handleClearAll
  } = useCustomizeWorkspace();

  const tabSize = 20;
  const tabCount = Math.ceil(deckSize / tabSize);
  const tabs = Array.from({ length: tabCount }, (_, i) => {
    const start = i * tabSize + 1;
    const end = Math.min((i + 1) * tabSize, deckSize);
    return {
      id: `tab-${i}`,
      label: `Cards ${start}-${end}`,
      startIdx: start - 1,
      endIdx: end - 1,
    };
  });

  const getThumbnailUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('/uploads/') && !url.endsWith('-thumb.webp')) {
      const lastDot = url.lastIndexOf('.');
      if (lastDot !== -1) {
        return `${url.substring(0, lastDot)}-thumb.webp`;
      }
    }
    return url;
  };

  const handleImageLoad = (width: number, height: number, cardIdx: number) => {
    const ratio = width / height;
    const isInvalid = ratio < 0.65 || ratio > 0.78;
    setAspectWarnings(prev => {
      if (prev[cardIdx] === isInvalid) return prev;
      return { ...prev, [cardIdx]: isInvalid };
    });
  };

  const currentTab = tabs[activeTabIdx] || { startIdx: 0, endIdx: Math.min(19, deckSize - 1) };
  const currentTabCards = Array.from(
    { length: currentTab.endIdx - currentTab.startIdx + 1 },
    (_, i) => currentTab.startIdx + i
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Bulk Dropzone */}
      <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white hover:border-primary-500 transition-all p-6 flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden group shadow-xs">
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          onChange={(e) => handleBulkUpload(e.target.files)}
          disabled={bulkUploading}
        />
        {bulkUploading ? (
          <div className="space-y-3">
            <RefreshCw className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
            <p className="text-xs font-black text-slate-800">Uploading proxy cards...</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{bulkProgress.current} / {bulkProgress.total} Complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform duration-300">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-black text-slate-800">Select or drop multiple card files at once</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Drag-and-drop to auto-fill playing card slots in parallel</p>
          </div>
        )}
      </div>

      {/* Pagination & Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        
        {/* Quick Autofill */}
        <div className="flex gap-2.5">
          <button
            onClick={handleAutofill}
            className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
          >
            Autofill Playtest Art
          </button>
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100 transition-all"
          >
            Clear All
          </button>
        </div>

        {/* Tab Selection */}
        {tabs.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab, idx) => {
              const isActive = activeTabIdx === idx;
              const tabUploads = customImages.slice(tab.startIdx, tab.endIdx + 1).filter(Boolean).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                    ${isActive 
                      ? 'bg-slate-950 text-white shadow-sm' 
                      : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'
                    }
                  `}
                >
                  {tab.label} ({tabUploads}/{tab.endIdx - tab.startIdx + 1})
                </button>
              );
            })}
          </div>
        )}

        {/* Grid/List views */}
        <div className="flex justify-end gap-1 shrink-0 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg border transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 border-slate-200' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg border transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 border-slate-200' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {currentTabCards.map((cardIdx) => {
            const imageUrl = customImages[cardIdx];
            const isUploading = uploadingIdx === cardIdx;
            const hasAspectWarning = aspectWarnings[cardIdx];

            return (
              <div 
                key={cardIdx} 
                className={`aspect-[2.5/3.5] bg-white rounded-2xl border border-dashed flex flex-col justify-between p-4 relative group shadow-sm transition-all overflow-hidden
                  ${imageUrl 
                    ? 'border-solid border-slate-900 ring-2 ring-slate-900/5' 
                    : 'border-slate-200 hover:border-primary-500'
                  }
                `}
              >
                <div className="flex justify-between items-center text-slate-400 relative z-10">
                  <span className="text-[8px] font-black uppercase">Card #{cardIdx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    {imageUrl && hasAspectWarning && (
                      <div className="bg-yellow-500 text-white rounded-full p-0.5" title="Non-standard aspect ratio. Recommended size is 2.5 x 3.5 inches.">
                        <AlertCircle className="w-3 h-3" />
                      </div>
                    )}
                    {imageUrl && (
                      <button
                        onClick={() => setLightboxCardIdx(cardIdx)}
                        className="opacity-0 group-hover:opacity-100 p-1 bg-white/80 hover:bg-white text-slate-700 rounded-lg shadow-sm"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center p-2 relative z-10">
                  {imageUrl ? (
                    <>
                      <img 
                        src={getThumbnailUrl(imageUrl)} 
                        loading="lazy" 
                        className="absolute inset-0 w-full h-full object-cover rounded-lg" 
                        alt="" 
                        onLoad={(e) => handleImageLoad(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight, cardIdx)}
                      />
                      <div className="absolute inset-2.5 border border-dashed border-red-500/30 rounded pointer-events-none z-10">
                        <div className="absolute top-0.5 left-0.5 bg-red-500/80 text-[6px] text-white px-0.5 leading-none font-bold scale-[0.8] origin-top-left uppercase rounded">Safe Zone</div>
                      </div>
                    </>
                  ) : isUploading ? (
                    <div className="animate-spin text-primary-500">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                      <Upload className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
                      <span className="text-[8px] font-black uppercase text-slate-300 mt-1.5">Upload design</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(cardIdx, file);
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="flex justify-between items-center text-slate-400 rotate-180 self-end w-full">
                  <span className="text-[8px] font-black uppercase">Card #{cardIdx + 1}</span>
                </div>

                {imageUrl && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                    <button 
                      onClick={() => handleDuplicateCard(cardIdx)}
                      className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-all"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <label className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg cursor-pointer transition-all" title="Upload Replacement">
                      <Upload className="w-3.5 h-3.5" />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(cardIdx, file);
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => handleClearCard(cardIdx)}
                      className="p-2 bg-red-500/20 hover:bg-red-500 text-white rounded-lg transition-all"
                      title="Clear"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* List Mode */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-6 py-4">Slot</th>
                <th className="px-6 py-4">Design Preview</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentTabCards.map((cardIdx) => {
                const imageUrl = customImages[cardIdx];
                const isUploading = uploadingIdx === cardIdx;
                const hasAspectWarning = aspectWarnings[cardIdx];

                return (
                  <tr key={cardIdx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800">Card #{cardIdx + 1}</td>
                    <td className="px-6 py-4">
                      {imageUrl ? (
                        <div className="h-12 w-9 rounded border overflow-hidden relative cursor-zoom-in" onClick={() => setLightboxCardIdx(cardIdx)}>
                          <img 
                            src={getThumbnailUrl(imageUrl)} 
                            className="absolute inset-0 w-full h-full object-cover" 
                            alt="" 
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 font-medium italic">Empty</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {imageUrl ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <Check className="w-2.5 h-2.5" /> Ready
                          </span>
                          {hasAspectWarning && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100" title="Non-standard aspect ratio. Recommended size is 2.5 x 3.5 inches.">
                              <AlertCircle className="w-2.5 h-2.5" /> Ratio Warning
                            </span>
                          )}
                        </div>
                      ) : isUploading ? (
                        <span className="text-[8px] font-black uppercase text-primary-600 animate-pulse">Uploading...</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                          Empty
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {imageUrl ? (
                          <>
                            <button 
                              onClick={() => handleDuplicateCard(cardIdx)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleClearCard(cardIdx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                              title="Clear"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <label className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg cursor-pointer inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider">
                            <Upload className="w-3 h-3" /> Upload
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleFileChange(cardIdx, file);
                                    }}
                            />
                          </label>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lightbox / Zoom Modal */}
      {lightboxCardIdx !== null && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxCardIdx(null)}
        >
          <div 
            className="relative max-w-sm w-full aspect-[2.5/3.5] bg-white rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col justify-between border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Proxy Slot #{lightboxCardIdx + 1}</span>
              <button 
                onClick={() => setLightboxCardIdx(null)}
                className="text-slate-400 hover:text-slate-900 p-1.5 bg-slate-100 rounded-lg font-black text-[9px] uppercase tracking-wider"
              >
                Close
              </button>
            </div>
            <div className="flex-1 my-4 border border-slate-100 rounded-2xl relative overflow-hidden bg-slate-50">
              <img 
                src={customImages[lightboxCardIdx]} 
                className="absolute inset-0 w-full h-full object-contain" 
                alt="" 
              />
              <div className="absolute inset-3.5 border border-dashed border-red-500/40 rounded pointer-events-none">
                <div className="absolute bottom-1 right-1 bg-red-500/80 text-[5px] text-white px-0.5 font-bold uppercase rounded">Dotted Safe Area (Keep text inside)</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <label className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all">
                Replace File
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileChange(lightboxCardIdx, file);
                      setLightboxCardIdx(null);
                    }
                  }}
                />
              </label>
              <button 
                onClick={() => {
                  handleClearCard(lightboxCardIdx);
                  setLightboxCardIdx(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export function CustomizeBackStep() {
  const {
    deckSize,
    customImages,
    handleSelectCardBack,
    handleUploadCardBack
  } = useCustomizeWorkspace();

  const cardBackUrl = customImages[deckSize] || PRESET_BACKS[0].url;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Intro Panel */}
      <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-2 text-center max-w-2xl mx-auto">
        <h3 className="text-lg font-black text-slate-800">Select Common Card Back</h3>
        <p className="text-xs text-slate-400 font-bold leading-relaxed">
          Every card in your proxy deck will share this common back design. Choose from our premium preset themes, or upload your own custom artwork.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
        {/* Custom Upload Slot */}
        <div className="aspect-[2.5/3.5] bg-white rounded-2xl border-2 border-dashed border-slate-200 p-4 flex flex-col justify-between items-center text-center hover:border-primary-500 transition-all shadow-sm overflow-hidden relative">
          {customImages[deckSize] ? (
            <>
              <img 
                src={customImages[deckSize]} 
                className="absolute inset-0 w-full h-full object-cover" 
                alt="" 
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                <label className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg cursor-pointer transition-all" title="Upload new back">
                  <Upload className="w-4 h-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCardBack(file);
                    }}
                  />
                </label>
              </div>
            </>
          ) : (
            <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
              <Upload className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
              <span className="text-[8px] font-black uppercase text-slate-400 mt-2">Upload Custom</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadCardBack(file);
                }}
              />
            </label>
          )}
          <div className="absolute top-2 left-2 z-10">
            {customImages[deckSize] && (
              <span className="bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* Preset Cards */}
        {PRESET_BACKS.map((preset) => {
          const isSelected = cardBackUrl === preset.url;
          return (
            <div
              key={preset.id}
              onClick={() => handleSelectCardBack(preset.url)}
              className={`aspect-[2.5/3.5] rounded-2xl border-2 p-2 relative shadow-sm cursor-pointer hover:scale-[1.02] transition-all overflow-hidden
                ${isSelected ? 'border-slate-900 ring-2 ring-slate-900/5' : preset.theme}
              `}
            >
              <img 
                src={preset.url} 
                loading="lazy" 
                className="absolute inset-0 w-full h-full object-cover rounded-xl" 
                alt="" 
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-center text-[9px] font-black uppercase text-white tracking-widest backdrop-blur-[1px]">
                {preset.name}
              </div>
              <div className="absolute top-2 left-2 z-10">
                {isSelected && (
                  <span className="bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CustomizeReviewStep() {
  const {
    deckSize,
    customImages,
    setCustomImages,
    frontsCount,
    aspectWarnings,
    selectedVariant,
    adding,
    added,
    handleAddToCart
  } = useCustomizeWorkspace();

  const cardBackUrl = customImages[deckSize] || PRESET_BACKS[0].url;
  const firstFrontUrl = customImages.slice(0, deckSize).find(Boolean) || cardBackUrl;
  
  const aspectWarningCount = Object.values(aspectWarnings).filter(Boolean).length;
  const missingCount = deckSize - frontsCount;
  const isReady = frontsCount > 0 && missingCount === 0;

  const autoFillWithBack = () => {
    const nextImages = [...customImages];
    for (let i = 0; i < deckSize; i++) {
      if (!nextImages[i]) {
        nextImages[i] = cardBackUrl;
      }
    }
    setCustomImages(nextImages);
  };

  const autoDuplicateUploads = () => {
    const uploaded = customImages.slice(0, deckSize).filter(Boolean);
    if (uploaded.length === 0) return;
    const nextImages = [...customImages];
    let upIdx = 0;
    for (let i = 0; i < deckSize; i++) {
      if (!nextImages[i]) {
        nextImages[i] = uploaded[upIdx % uploaded.length];
        upIdx++;
      }
    }
    setCustomImages(nextImages);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300 max-w-4xl mx-auto pb-8">
      
      {/* Step Introduction */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Review & Fulfill Playtest Deck</h2>
        <p className="text-sm font-bold text-slate-400">Verify your configuration settings prior to merchant assembly.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Audit Checklist & Auto-Fix Panel */}
        <div className="md:col-span-8 space-y-6">
          
          <div className="bg-white border border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Playtest Deck Audit Checklist</h3>
            
            <div className="space-y-4">
              
              {/* Checklist Item 1: Card Front counts */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0
                  ${isReady ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}
                `}>
                  {isReady ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-slate-800">Card Front Configuration</h4>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    {frontsCount} of {deckSize} slots configured. {missingCount > 0 ? `Please upload designs for the remaining ${missingCount} slots.` : 'Deck is fully configured.'}
                  </p>
                </div>
              </div>

              {/* Checklist Item 2: Aspect Ratio Warnings */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0
                  ${aspectWarningCount === 0 ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-white'}
                `}>
                  {aspectWarningCount === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-slate-800">Image Aspect Ratio Audits</h4>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    {aspectWarningCount === 0 
                      ? 'All card front uploads conform to standard 2.5 x 3.5 inches aspect ratios.' 
                      : `Found ${aspectWarningCount} card front uploads with non-standard proportions. They may stretch or print with border margins.`
                    }
                  </p>
                </div>
              </div>

              {/* Checklist Item 3: Card Back confirmation */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-slate-800">Common Back Selection</h4>
                  <p className="text-xs text-slate-500 font-bold mt-1">
                    Common deck back option successfully applied. Every card in the custom deck will share this design.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Auto-Fix Options if missing cards exist */}
          {missingCount > 0 && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-8 space-y-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-black uppercase tracking-wider">Unfinished Configurations Warning</h4>
              </div>
              <p className="text-xs text-amber-700 font-bold leading-relaxed">
                You have {missingCount} card fronts left unconfigured. Printers require every slot to have a face file. You can go back and upload them manually, or use our instant auto-fix layout tools:
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={autoFillWithBack}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
                >
                  Fill Empty Slots with Card Back
                </button>
                {frontsCount > 0 && (
                  <button
                    onClick={autoDuplicateUploads}
                    className="px-4 py-2.5 bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
                  >
                    Duplicate Existing Uploads
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Back/Front 3D Flipping Card Proof Preview & Checkout */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Interactive 3D proof preview card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-center space-y-6">
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">3D Proof Preview</h4>
              <p className="text-[10px] text-slate-400 mt-1">Hover or touch card to flip proof</p>
            </div>

            {/* 3D Card flips on hover */}
            <div className="group [perspective:1000px] w-[140px] h-[196px] mx-auto cursor-pointer relative z-10">
              <div className="relative w-full h-full duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] transition-all">
                
                {/* Front face */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-2xl overflow-hidden border shadow-md bg-slate-50">
                  <img 
                    src={firstFrontUrl} 
                    className="w-full h-full object-cover" 
                    alt="First Card Front" 
                  />
                  {/* Safety guidelines print margins overlay */}
                  <div className="absolute inset-2.5 border border-dashed border-red-500/40 rounded pointer-events-none">
                    <div className="absolute top-0.5 left-0.5 bg-red-500/80 text-[5px] text-white px-0.5 font-bold uppercase rounded scale-[0.8] origin-top-left">Safe Trim</div>
                  </div>
                </div>

                {/* Back face */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl overflow-hidden border shadow-md bg-slate-50">
                  <img 
                    src={cardBackUrl} 
                    className="w-full h-full object-cover" 
                    alt="Card Back" 
                  />
                  {/* Safety guidelines print margins overlay */}
                  <div className="absolute inset-2.5 border border-dashed border-red-500/40 rounded pointer-events-none">
                    <div className="absolute top-0.5 left-0.5 bg-red-500/80 text-[5px] text-white px-0.5 font-bold uppercase rounded scale-[0.8] origin-top-left">Safe Trim</div>
                  </div>
                </div>

              </div>
            </div>

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hover to View Double-Sided Proof</p>
          </div>

          {/* Action checkout box */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Subtotal Price</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedVariant?.price ?? 0)}</p>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding || frontsCount === 0}
              className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg
                ${added 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-20 hover:-translate-y-0.5 active:translate-y-0'
                }
              `}
            >
              {added ? (
                <>
                  <Check className="w-4.5 h-4.5" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4.5 h-4.5" />
                  {adding ? 'Adding...' : 'Fulfill & Add to Cart'}
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
