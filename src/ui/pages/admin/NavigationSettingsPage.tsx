'use client';

/**
 * [LAYER: UI]
 */
import { useState, useEffect } from 'react';
import type { NavigationMenu, NavigationLink } from '@domain/models';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function NavigationSettingsPage() {
  const [menu, setMenu] = useState<NavigationMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/navigation?id=main-nav')
      .then(res => res.json())
      .then(data => {
        setMenu(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!menu) return;
    setSaving(true);
    await fetch('/api/admin/navigation?id=main-nav', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menu),
    });
    setSaving(false);
    setStatusMessage('Navigation updated successfully.');
  };

  if (loading || !menu) return <div>Loading setup...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Navigation Settings</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {statusMessage}
        </div>
      )}

      <div className="grid gap-8">
        {/* Categories Editor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Shop Categories Column</h2>
          <div className="space-y-4">
            <input 
              type="text" 
              value={menu.shopCategories.title} 
              onChange={e => setMenu({...menu, shopCategories: { ...menu.shopCategories, title: e.target.value }})}
              className="w-full bg-gray-50 border-gray-200 rounded-lg text-sm"
              placeholder="Column Title (e.g. Categories)"
            />
            {menu.shopCategories.links.map((link, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input 
                   type="text" 
                   value={link.label} 
                   onChange={e => {
                     const newLinks = [...menu.shopCategories.links];
                     newLinks[idx].label = e.target.value;
                     setMenu({...menu, shopCategories: { ...menu.shopCategories, links: newLinks }});
                   }}
                   className="flex-1 bg-white border border-gray-200 rounded-lg text-sm" 
                   placeholder="Label" 
                />
                <input 
                   type="text" 
                   value={link.href} 
                   onChange={e => {
                     const newLinks = [...menu.shopCategories.links];
                     newLinks[idx].href = e.target.value;
                     setMenu({...menu, shopCategories: { ...menu.shopCategories, links: newLinks }});
                   }}
                   className="flex-1 bg-white border border-gray-200 rounded-lg text-sm" 
                   placeholder="/path" 
                />
                <button 
                  onClick={() => {
                    const newLinks = menu.shopCategories.links.filter((_, i) => i !== idx);
                    setMenu({...menu, shopCategories: { ...menu.shopCategories, links: newLinks }});
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button 
              onClick={() => setMenu({...menu, shopCategories: { ...menu.shopCategories, links: [...menu.shopCategories.links, { label: '', href: '' }] }})}
              className="text-sm text-primary-600 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Link
            </button>
          </div>
        </div>

        {/* Collections Editor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Shop Collections Column</h2>
          <div className="space-y-4">
            <input 
              type="text" 
              value={menu.shopCollections.title} 
              onChange={e => setMenu({...menu, shopCollections: { ...menu.shopCollections, title: e.target.value }})}
              className="w-full bg-gray-50 border-gray-200 rounded-lg text-sm"
              placeholder="Column Title (e.g. Collections)"
            />
            {menu.shopCollections.links.map((link, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input 
                   type="text" 
                   value={link.label} 
                   onChange={e => {
                     const newLinks = [...menu.shopCollections.links];
                     newLinks[idx].label = e.target.value;
                     setMenu({...menu, shopCollections: { ...menu.shopCollections, links: newLinks }});
                   }}
                   className="flex-1 bg-white border border-gray-200 rounded-lg text-sm" 
                   placeholder="Label" 
                />
                <input 
                   type="text" 
                   value={link.href} 
                   onChange={e => {
                     const newLinks = [...menu.shopCollections.links];
                     newLinks[idx].href = e.target.value;
                     setMenu({...menu, shopCollections: { ...menu.shopCollections, links: newLinks }});
                   }}
                   className="flex-1 bg-white border border-gray-200 rounded-lg text-sm" 
                   placeholder="/path" 
                />
                <button 
                  onClick={() => {
                    const newLinks = menu.shopCollections.links.filter((_, i) => i !== idx);
                    setMenu({...menu, shopCollections: { ...menu.shopCollections, links: newLinks }});
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button 
              onClick={() => setMenu({...menu, shopCollections: { ...menu.shopCollections, links: [...menu.shopCollections.links, { label: '', href: '' }] }})}
              className="text-sm text-primary-600 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Link
            </button>
          </div>
        </div>

        {/* Featured Promotion */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Featured Promotion</h2>
          {!menu.featuredPromotion ? (
            <button 
              onClick={() => setMenu({...menu, featuredPromotion: { imageUrl: '', title: '', linkText: '', linkHref: '' }})}
              className="text-sm text-primary-600 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Featured Promotion
            </button>
          ) : (
            <div className="space-y-4">
              <input 
                type="text" 
                value={menu.featuredPromotion.title} 
                onChange={e => setMenu({...menu, featuredPromotion: { ...menu.featuredPromotion!, title: e.target.value }})}
                className="w-full bg-white border border-gray-200 rounded-lg text-sm" 
                placeholder="Title" 
              />
              <input 
                type="text" 
                value={menu.featuredPromotion.subtitle || ''} 
                onChange={e => setMenu({...menu, featuredPromotion: { ...menu.featuredPromotion!, subtitle: e.target.value }})}
                className="w-full bg-white border border-gray-200 rounded-lg text-sm" 
                placeholder="Subtitle" 
              />
              <input 
                type="text" 
                value={menu.featuredPromotion.imageUrl} 
                onChange={e => setMenu({...menu, featuredPromotion: { ...menu.featuredPromotion!, imageUrl: e.target.value }})}
                className="w-full bg-white border border-gray-200 rounded-lg text-sm" 
                placeholder="Image URL" 
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={menu.featuredPromotion.linkText} 
                  onChange={e => setMenu({...menu, featuredPromotion: { ...menu.featuredPromotion!, linkText: e.target.value }})}
                  className="flex-1 bg-white border border-gray-200 rounded-lg text-sm" 
                  placeholder="Link Text" 
                />
                <input 
                  type="text" 
                  value={menu.featuredPromotion.linkHref} 
                  onChange={e => setMenu({...menu, featuredPromotion: { ...menu.featuredPromotion!, linkHref: e.target.value }})}
                  className="flex-1 bg-white border border-gray-200 rounded-lg text-sm" 
                  placeholder="Link Href" 
                />
              </div>
              <button 
                  onClick={() => setMenu({...menu, featuredPromotion: undefined})}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium"
                >
                  Remove Promotion
                </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
