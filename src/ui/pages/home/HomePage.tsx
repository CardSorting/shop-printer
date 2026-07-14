'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Layers, UploadCloud, CheckCircle2, Zap, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

const TCG_FORMATS = [
  {
    title: 'Yu-Gi-Oh! Proxy Deck',
    count: '40 Cards',
    price: '$12.99',
    description: 'Perfect for standard speed-duels or constructed deck playtesting. Standard 2.5" x 3.5" size.',
    color: 'border-purple-100 bg-purple-50/30 text-purple-700 hover:border-purple-300',
    accent: 'bg-purple-600',
  },
  {
    title: 'One Piece Proxy Deck',
    count: '50 Cards',
    price: '$14.99',
    description: 'Fulfill your Leader + 50 main deck requirements. High-snap linen texture for kitchen-top play.',
    color: 'border-indigo-100 bg-indigo-50/30 text-indigo-700 hover:border-indigo-300',
    accent: 'bg-indigo-600',
  },
  {
    title: 'Pokémon & MTG Standard',
    count: '60 Cards',
    price: '$16.99',
    description: 'Standard constructed playtest decks. Premium casino-grade linen paper feel for sleeve shuffling.',
    color: 'border-amber-100 bg-amber-50/30 text-amber-700 hover:border-amber-300',
    accent: 'bg-amber-500',
  },
  {
    title: 'Commander MTG Deck',
    count: '100 Cards',
    price: '$24.99',
    description: 'Build your full Commander (EDH) deck in one go. Custom faces allow you to customize command cards.',
    color: 'border-emerald-100 bg-emerald-50/30 text-emerald-700 hover:border-emerald-300',
    accent: 'bg-emerald-600',
  },
];

export function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-50/50 py-20 lg:py-32 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-xs font-black uppercase tracking-widest text-primary-600">
                <Sparkles className="w-3.5 h-3.5" />
                Premium TCG Playtesting
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-none">
                Playtest Before <br />
                <span className="text-primary-600">You Invest.</span>
              </h1>
              <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-xl">
                Print custom high-fidelity proxy decks for Yu-Gi-Oh!, Magic: The Gathering, Pokémon, and One Piece. Upload your card designs and test meta playstyles with friends before buying the real singles.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push('/products/playing-cards-pod')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-8 py-5 text-sm font-black uppercase tracking-widest text-white hover:bg-black transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  Create Your Deck
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-8 py-5 text-sm font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                  How It Works
                </a>
              </div>
            </div>

            {/* Right Image Mockup */}
            <div className="lg:col-span-5 relative aspect-square w-full max-w-md mx-auto bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-6 overflow-hidden hover:scale-[1.01] transition-transform duration-500">
              <div className="relative w-full h-full rounded-[2rem] overflow-hidden">
                <Image
                  src="/images/playing-cards.png"
                  alt="Premium custom proxy playing cards mockup"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 450px"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Game Formats / Variants */}
      <section id="formats" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">Choose Your Game Format</h2>
          <p className="text-sm font-bold text-gray-400 max-w-xl mx-auto uppercase tracking-wider">
            Sized to standard TCG cards (2.5 x 3.5 inches) for standard play sleeves.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {TCG_FORMATS.map((fmt) => (
            <div
              key={fmt.title}
              className={`flex flex-col justify-between p-8 rounded-4xl border transition-all text-left shadow-sm hover:shadow-xl ${fmt.color}`}
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-white ${fmt.accent}`}>
                    {fmt.count}
                  </span>
                  <span className="text-lg font-black text-gray-900">{fmt.price}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900">{fmt.title}</h3>
                  <p className="text-xs text-gray-500 font-bold leading-relaxed">{fmt.description}</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/products/playing-cards-pod')}
                className="mt-8 w-full py-4 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-md transition-all text-center flex items-center justify-center gap-2"
              >
                Configure Deck
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-24 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">How It Works</h2>
            <p className="text-sm font-bold text-gray-400 max-w-xl mx-auto uppercase tracking-wider">
              From PDF or images to physical card stock in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: '01',
                title: 'Select Deck Variant',
                description: 'Choose between standard Yu-Gi-Oh! (40), One Piece (50), Pokémon/MTG (60), or Commander (100) card count sizes.',
                icon: Layers,
              },
              {
                step: '02',
                title: 'Upload Designs',
                description: 'Drag and drop your custom proxies into our numbered card faces grid. Autofill with test artwork to preview.',
                icon: UploadCloud,
              },
              {
                step: '03',
                title: 'Fulfillment & Play',
                description: 'We print on high-snap casino-grade linen paper and ship to your door. Drop them in sleeves and playtest!',
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="bg-white border border-gray-100 rounded-[2.5rem] p-10 text-left space-y-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 text-8xl font-black text-gray-50 select-none group-hover:scale-105 transition-transform duration-500">
                    {item.step}
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center relative z-10">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <h3 className="text-lg font-black text-gray-900">{item.title}</h3>
                    <p className="text-xs text-gray-500 font-bold leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits / Banner */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
        <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">Built For TCG Collectors & Playtesters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            'Save money before buying expensive singles',
            'Perfect snap, shuffle, and thickness in sleeves',
            'Full support for custom art / alt-art cards',
            'Linen card finish mimics tournament cards'
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-primary-500 shrink-0" />
              <span className="text-xs font-black uppercase text-gray-600 text-left leading-tight">{item}</span>
            </div>
          ))}
        </div>

        <div className="pt-12">
          <div className="bg-gray-900 rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-indigo-600/20 mix-blend-overlay" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
              <h3 className="text-3xl sm:text-5xl font-black text-white leading-none">Ready to playtest your meta deck?</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Upload your images and print on demand today.
              </p>
              <button
                onClick={() => router.push('/products/playing-cards-pod')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-5 text-sm font-black uppercase tracking-widest text-gray-900 hover:bg-gray-50 transition-all shadow-xl active:scale-95"
              >
                Create Custom Deck
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
