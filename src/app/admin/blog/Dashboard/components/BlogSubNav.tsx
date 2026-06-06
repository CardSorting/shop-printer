'use client';
import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react';
import type { DashboardHubView, KnowledgebaseContentType } from '../types';

interface BlogSubNavProps {
  activeView: DashboardHubView;
  setActiveView: (v: DashboardHubView) => void;
  collapsed?: boolean;
  seoOptimizedPercent?: number;
  contentType?: KnowledgebaseContentType;
}

export const BlogSubNav: React.FC<BlogSubNavProps> = ({
  activeView,
  setActiveView,
  collapsed = false,
  seoOptimizedPercent = 100,
  contentType = 'blog',
}) => {
  const isHelpCenter = contentType === 'article';
  const navItems = isHelpCenter
    ? [{ id: 'editorial' as const, label: 'Articles', icon: LayoutDashboard, description: 'Help center content' }]
    : [
    { id: 'editorial' as const, label: 'Editorial', icon: LayoutDashboard, description: 'Manage content & calendar' },
    { id: 'insights' as const, label: 'Insights', icon: BarChart3, description: 'Performance & health' },
    { id: 'audience' as const, label: 'Audience', icon: Users, description: 'Subscribers & engagement' },
    { id: 'settings' as const, label: 'Settings', icon: SettingsIcon, description: 'Authors & taxonomy' },
  ];

  return (
    <nav className={`flex flex-col gap-2 ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 border-r border-gray-100 pr-4 h-full`}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`
              group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all
              ${isActive 
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'group-hover:text-primary-600'}`} />
            {!collapsed && (
              <div className="flex-1 text-left">
                <p className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-gray-900'}`}>
                  {item.label}
                </p>
                <p className={`text-[9px] font-medium opacity-60 ${isActive ? 'text-primary-50' : 'text-gray-400'}`}>
                  {item.description}
                </p>
              </div>
            )}
            {!collapsed && isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
          </button>
        );
      })}
      
      {!collapsed && (
        <div className="mt-auto p-4 rounded-3xl bg-gray-50 border border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Search listing health</p>
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                seoOptimizedPercent >= 80 ? 'bg-green-500' : seoOptimizedPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${seoOptimizedPercent}%` }}
            />
          </div>
          <p className="mt-2 text-[9px] font-bold text-gray-500">
            {seoOptimizedPercent >= 100
              ? isHelpCenter
                ? 'All help articles pass the search checklist.'
                : 'All stories pass the search checklist.'
              : isHelpCenter
                ? `${seoOptimizedPercent}% of help articles have strong search listings.`
                : `${seoOptimizedPercent}% of stories have strong search listings.`}
          </p>
        </div>
      )}
    </nav>
  );
};
