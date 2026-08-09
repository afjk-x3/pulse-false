'use client';

import React, { useState, useEffect } from 'react';
import { Award, Search, Heart, Plus, Send, X } from 'lucide-react';
import { PulseDB, KudosRecord } from '../lib/db';
import { useAccessibility } from '../context/AccessibilityContext';

export default function KudosFeed() {
  const { highContrast } = useAccessibility();
  const [kudosList, setKudosList] = useState<KudosRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  
  // Composers state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState<string>('Gratitude');
  const [customCategory, setCustomCategory] = useState('');
  const [message, setMessage] = useState('');
  const [sender, setSender] = useState('');
  const [currentUser, setCurrentUser] = useState('anonymous');

  useEffect(() => {
    const timer = setTimeout(() => {
      setKudosList(PulseDB.getKudos());
      if (typeof window !== 'undefined') {
        const user = localStorage.getItem('pulse-current-user') || 'anonymous';
        setCurrentUser(user);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleLike = (id: string) => {
    const updated = PulseDB.likeKudos(id, currentUser);
    setKudosList(updated);
  };

  const handleSubmitKudos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !message.trim()) return;

    const finalCategory = category === 'Other' ? (customCategory.trim() || 'Other') : category;
    const senderVal = sender.trim() ? sender.trim() : 'Anonymous';
    PulseDB.addKudos(recipient, message, finalCategory, senderVal);
    
    // Refresh list and reset form
    setKudosList(PulseDB.getKudos());
    setRecipient('');
    setMessage('');
    setSender('');
    setCustomCategory('');
    setCategory('Gratitude');
    setIsComposerOpen(false);
  };

  const getCategoryColor = (cat: string) => {
    if (highContrast) return 'border-black text-black font-bold';
    
    switch (cat) {
      case 'Collaboration':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Gratitude':
        return 'bg-[#EAEFE9] text-[#2F4F2F] border-[#C3D2C1]';
      case 'Inspiration':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Impact':
        return 'bg-[#F9ECE7] text-[#6A2B15] border-[#ECCBBF]';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-100';
    }
  };

  const filteredKudos = kudosList.filter((k) => {
    const matchesSearch = k.recipient.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          k.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          k.text.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'All' || k.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Search and Compose Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, sender, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-semibold ${
              highContrast ? 'border-black' : 'border-neutral-200'
            }`}
          />
        </div>

        {/* Compose trigger button */}
        <button
          onClick={() => setIsComposerOpen(true)}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
            highContrast
              ? 'bg-black text-white hover:bg-neutral-800 border-2 border-black'
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
          }`}
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Send Kudos Note</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 px-1 -mx-1" role="group" aria-label="Filter kudos categories">
        {(() => {
          const filterCategories = ['All', 'Gratitude', 'Collaboration', 'Inspiration', 'Impact'];
          kudosList.forEach(k => {
            if (!filterCategories.includes(k.category)) {
              filterCategories.push(k.category);
            }
          });
          return filterCategories.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`py-1.5 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                activeFilter === filter
                  ? (highContrast ? 'bg-black text-white' : 'bg-teal-50 text-teal-800 border border-teal-200 font-bold')
                  : 'bg-white hover:bg-neutral-50 text-neutral-500 border border-neutral-100'
              }`}
            >
              {filter}
            </button>
          ));
        })()}
      </div>

      {/* Kudos Grid */}
      {filteredKudos.length === 0 ? (
        <div className={`p-12 text-center bg-white rounded-2xl border ${
          highContrast ? 'border-black' : 'border-[#f1f0ea]'
        }`}>
          <Award className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-700">No Kudos matching filters</p>
          <p className="text-[11px] text-neutral-400 mt-1">Be the first to recognition a teammate today!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredKudos.map((kudos) => (
            <article
              key={kudos.id}
              className={`p-5 bg-white rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                highContrast ? 'border-black text-black' : 'border-[#f1f0ea]'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-neutral-800">To: {kudos.recipient}</span>
                    <span className="text-[10px] text-neutral-400 block">From: {kudos.sender}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${getCategoryColor(kudos.category)}`}>
                    {kudos.category}
                  </span>
                </div>

                {/* Content Message */}
                <p className="text-xs text-neutral-600 leading-relaxed italic">
                  &ldquo;{kudos.text}&rdquo;
                </p>
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-between border-t pt-3.5 mt-4 border-neutral-100 text-[10px] text-neutral-400 font-medium">
                <span>{kudos.date}</span>
                {(() => {
                  const isLiked = kudos.likedBy?.includes(currentUser);
                  return (
                    <button
                      onClick={() => handleLike(kudos.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        isLiked ? 'text-teal-600 font-bold' : ''
                      }`}
                      aria-label={`Like this kudos. Current likes: ${kudos.likes}`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${
                        isLiked ? 'fill-teal-600 text-teal-600' : 'text-neutral-400'
                      }`} />
                      <span>{kudos.likes} {kudos.likes === 1 ? 'Like' : 'Likes'}</span>
                    </button>
                  );
                })()}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Kudos Composer Modal Overlay */}
      {isComposerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="composer-title"
        >
          <div className={`w-full max-w-lg p-6 bg-white rounded-2xl border shadow-2xl space-y-4 animate-scale-up ${
            highContrast ? 'border-black text-black' : 'border-neutral-150'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-600" />
                <h3 id="composer-title" className="font-bold text-neutral-800">Compose Kudos Recognition</h3>
              </div>
              <button 
                onClick={() => setIsComposerOpen(false)}
                className="p-1 rounded hover:bg-neutral-100"
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitKudos} className="space-y-4">
              <div>
                <label htmlFor="kudos-recipient" className="block text-xs font-bold text-neutral-700 mb-1">
                  Recipient Name *
                </label>
                <input
                  id="kudos-recipient"
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kudos-category" className="block text-xs font-bold text-neutral-700 mb-1">
                    Recognition Category
                  </label>
                  <select
                    id="kudos-category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (e.target.value !== 'Other') {
                        setCustomCategory('');
                      }
                    }}
                    className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                      highContrast ? 'border-black' : 'border-neutral-200'
                    }`}
                  >
                    <option value="Gratitude">Gratitude</option>
                    <option value="Collaboration">Collaboration</option>
                    <option value="Inspiration">Inspiration</option>
                    <option value="Impact">Impact</option>
                    <option value="Other">Other - Please specify</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="kudos-sender" className="block text-xs font-bold text-neutral-700 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    id="kudos-sender"
                    type="text"
                    placeholder="Defaults to Anonymous"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                      highContrast ? 'border-black' : 'border-neutral-200'
                    }`}
                  />
                </div>
              </div>

              {category === 'Other' && (
                <div className="animate-fade-in">
                   <label htmlFor="kudos-custom-category" className="block text-xs font-bold text-neutral-700 mb-1">
                     Custom Category Name *
                   </label>
                   <input
                     id="kudos-custom-category"
                     type="text"
                     required
                     placeholder="e.g. Wellness, Mentorship, Innovation"
                     value={customCategory}
                     onChange={(e) => setCustomCategory(e.target.value)}
                     className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold ${
                       highContrast ? 'border-black' : 'border-neutral-200'
                     }`}
                   />
                </div>
              )}

              <div>
                <label htmlFor="kudos-text" className="block text-xs font-bold text-neutral-700 mb-1">
                  Appreciation Message *
                </label>
                <textarea
                  id="kudos-text"
                  required
                  rows={4}
                  placeholder="Explain how this person supported you or the team..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium ${
                    highContrast ? 'border-black' : 'border-neutral-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-3.5 border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Kudos</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
