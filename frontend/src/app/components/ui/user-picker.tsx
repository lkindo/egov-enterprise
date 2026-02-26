'use client';

import React, { useState, useCallback } from 'react';
import { StandardModal } from './standard-modal';
import { VirtualScrollList } from './virtual-scroll-list';
import { addressbookService } from '@/services/addressbookService';
import { NameCard } from '@/types/addressbook';
import { Search, User, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (user: NameCard) => void;
  title?: string;
}

export function UserPicker({
  isOpen,
  onClose,
  onSelect,
  title = "사용자 검색 및 선택"
}: UserPickerProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<NameCard[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    try {
      setLoading(true);
      const res = (await addressbookService.searchUsers(keyword)) as any;
      if (res?.success) {
        setResults(res.data || []);
      }
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  const renderUserItem = (user: NameCard) => (
    <div 
      className="flex items-center justify-between px-6 py-3 border-b hover:bg-primary/5 transition-colors cursor-pointer group"
      onClick={() => {
        onSelect(user);
        onClose();
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <User size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{user.ncrdNm}</p>
          <p className="text-[10px] text-muted-foreground">{user.deptNm} / {user.cmpnyNm}</p>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        ID: {user.ncrdId}
      </div>
    </div>
  );

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <input 
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="이름, 부서, ID 검색..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            autoFocus
          />
          <button 
            type="submit"
            className="absolute right-2 top-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-sm"
          >
            검색
          </button>
        </form>

        {/* Results Area */}
        <div className="bg-card border rounded-2xl overflow-hidden min-h-[350px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse font-medium">
              검색 중...
            </div>
          ) : results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-2">
              <Search size={32} className="opacity-10" />
              <p className="text-xs font-bold">검색 결과가 없습니다.</p>
              <p className="text-[10px]">이름이나 부서명을 입력하고 엔터를 눌러주세요.</p>
            </div>
          ) : (
            <VirtualScrollList 
              items={results}
              itemHeight={60}
              containerHeight={350}
              renderItem={renderUserItem}
              className="border-none rounded-none"
            />
          )}
        </div>
      </div>
    </StandardModal>
  );
}
