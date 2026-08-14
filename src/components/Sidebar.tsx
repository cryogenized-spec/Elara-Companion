import React, { useState } from 'react';
import { Conversation } from '../types';
import {
  Plus,
  MessageSquare,
  Search,
  Settings,
  Trash2,
  Edit2,
  Sun,
  Moon,
  Sparkles,
  X,
  Download,
  Upload,
  Globe,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  onOpenWorld?: () => void;
  onOpenMemory?: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  onOpenWorld,
  onOpenMemory,
  isOpen,
  onCloseMobile,
  theme,
  onToggleTheme,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter((c) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(query) ||
      c.messages.some((m) => m.content.toLowerCase().includes(query))
    );
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 md:w-80 bg-[#121212] border-r border-zinc-800 flex flex-col z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-sky-900/30">
              E
            </div>
            <div>
              <h1 className="font-semibold text-zinc-100 text-sm tracking-tight">Elara Assistant</h1>
              <p className="text-[11px] text-zinc-500">Gemini Cybernetic Companion</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-4 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 flex items-center justify-between transition-colors group text-zinc-100"
          >
            <span className="text-sm font-medium">New Conversation</span>
            <Plus className="w-4 h-4 text-zinc-500 group-hover:text-sky-400 transition-colors" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500/50"
            />
          </div>
        </div>

        {/* Section Label */}
        <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-4 mt-2 mb-1">
          Recent Activity
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-zinc-500">
              {searchTerm ? 'No conversations found.' : 'No conversations yet.'}
            </div>
          ) : (
            filteredConversations.map((conv, idx) => {
              const isActive = conv.id === activeId;
              return (
                <div
                  key={`${conv.id || 'conv'}_${idx}`}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onCloseMobile();
                  }}
                  className={`group relative flex items-center px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-100 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 mr-3 shrink-0 ${isActive ? 'text-sky-400' : 'text-zinc-500'}`} />
                  <span className="text-sm truncate flex-1 min-w-0">{conv.title || 'New Conversation'}</span>

                  {/* Actions on hover/active */}
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRenameConversation(conv.id);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-700/50"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 space-y-2">
          {onOpenMemory && (
            <button
              onClick={() => {
                onOpenMemory();
                onCloseMobile();
              }}
              className="w-full flex items-center px-3 py-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors text-sm font-medium border border-amber-800/40"
            >
              <BookOpen className="w-4 h-4 mr-2.5 text-amber-400" />
              <span>Memory Scratchpad</span>
            </button>
          )}

          {onOpenWorld && (
            <button
              onClick={() => {
                onOpenWorld();
                onCloseMobile();
              }}
              className="w-full flex items-center px-3 py-2 text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 rounded-lg transition-colors text-sm font-medium border border-sky-800/40"
            >
              <Globe className="w-4 h-4 mr-2.5 text-sky-400" />
              <span>World State & Life</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="flex-1 flex items-center px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4 mr-2.5 text-zinc-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
