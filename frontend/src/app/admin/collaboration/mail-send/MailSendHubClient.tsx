'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { NameCard } from '@/types/business/addressbook';
import {
  Send,
  ArrowLeft,
  User,
  Zap,
  Clock,
  Search,
  X,
  Plus,
  Mail,
  Layers,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/app/components/ui/toast';
import { mailService } from '@/services/business/mail/MailService';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface Recipient {
  id: string;
  name: string;
  email: string;
}

export default function MailSendHubClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);

  // [P1-8] 타이핑마다 검색 요청이 나가지 않도록 공용 훅으로 디바운스한다.
  const debouncedSearch = useDebouncedValue(recipientSearch, 300);
  const isSearchable = debouncedSearch.trim().length >= 2;

  const {
    data: searchData,
    isFetching: isSearching,
    isError: isSearchError,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: ['mail-recipient-search', debouncedSearch],
    queryFn: () => addressbookUserService.searchUsers(debouncedSearch.trim()),
    enabled: isSearchable,
  });
  const searchResults: NameCard[] = searchData?.list ?? [];

  const [currentTime, setCurrentTime] = useState<string>('');

  React.useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [form, setForm] = useState({
    sj: '',
    emailCn: ''
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecipients.length === 0) {
      toast('수신자를 선택해 주세요.', 'error');
      return;
    }
    if (!form.sj.trim() || !form.emailCn.trim()) {
      toast('제목과 내용을 입력해 주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await mailService.sendMail({
        recptnPerson: selectedRecipients.map(r => r.email || r.id).join(', '),
        sj: form.sj,
        emailCn: form.emailCn
      });
      toast('메일이 발송 요청되었습니다.', 'success');
      router.push('/admin/collaboration/mail-history');
    } catch {
      toast('메일 발송에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-in fade-in duration-700">
      {/* 1. Header Section */}
      <div className="flex items-center gap-8 px-2">
        <Button
          variant="outline"
          aria-label="이전 화면으로 이동"
          onClick={() => router.back()}
          className="w-16 h-11 rounded-lg border-2 group hover:bg-surface-inverse transition-all duration-500 shadow-xl active:scale-95 bg-card"
        >
          <ArrowLeft className="group-hover:text-surface-inverse-foreground group-hover:-translate-x-1 transition-all" />
        </Button>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-tight text-primary leading-none px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">통합 메일 시스템</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tighter leading-none transition-colors">
            메일 <span className="text-primary">작성</span>
          </h1>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-10 px-2">

        {/* 2. Recipient Selection */}
        <div className="hub-card-premium p-10 bg-card border-2 border-border shadow-2xl relative overflow-hidden group rounded-lg">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-focus-within:opacity-10 transition-opacity">
            <User size={140} className="rotate-12 text-foreground" />
          </div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Search size={20} />
                </div>
                <Label htmlFor="mail-recipient-search" className="text-xs font-bold tracking-tight text-muted-foreground">수신자 선택</Label>
              </div>
              {selectedRecipients.length > 0 && (
                <Badge className="bg-emerald-500 text-white border-none font-bold text-xs px-3 py-1.5 rounded-lg tracking-tight animate-in zoom-in duration-300">
                  {selectedRecipients.length}명 선택됨
                </Badge>
              )}
            </div>

            <div className="relative">
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {selectedRecipients.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 mb-4 p-4 bg-surface-inverse rounded-lg shadow-inner min-h-[60px] items-center"
                    >
                      {selectedRecipients.map((recipient) => (
                        <motion.div
                          key={recipient.id}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          data-testid="selected-recipient-badge"
                          className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-white/10 hover:bg-white/20 text-surface-inverse-foreground rounded-lg border border-white/10 transition-colors group"
                        >
                          <span className="text-xs font-bold">{recipient.name}</span>
                          <button
                            type="button"
                            aria-label={`${recipient.name} 수신자 제외`}
                            onClick={() => setSelectedRecipients(prev => prev.filter(r => r.id !== recipient.id))}
                            className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-rose-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <Input
                    id="mail-recipient-search"
                    data-testid="mail-recipient-input"
                    placeholder="성명 또는 ID로 수신자를 검색하세요 (2자 이상)"
                    className="h-11 text-xl font-bold tracking-tight bg-muted border-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                  />
                  <AnimatePresence>
                    {isSearchable && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-2 bg-card border-2 border-border rounded-lg shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden divide-y divide-border"
                      >
                        {isSearching ? (
                          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-xs font-bold tracking-tight">검색 중...</span>
                          </div>
                        ) : isSearchError ? (
                          /* [P1-1] 검색 실패를 "결과 없음"으로 위장하지 않는다. */
                          <div className="p-8 text-center space-y-3">
                            <div className="flex items-center justify-center gap-2 text-rose-600">
                              <AlertTriangle size={16} />
                              <span className="text-xs font-bold">사용자 검색에 실패했습니다.</span>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => { void refetchSearch(); }}>
                              다시 시도
                            </Button>
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((user) => (
                            <button
                              key={user.adbkConstntId || user.userId}
                              type="button"
                              data-testid="recipient-item"
                              onClick={() => {
                                const newRecipient: Recipient = {
                                  id: user.userId,
                                  name: user.nm,
                                  email: user.emlAddr ?? ''
                                };
                                if (!selectedRecipients.find(r => r.id === newRecipient.id)) {
                                  setSelectedRecipients(prev => [...prev, newRecipient]);
                                }
                                setRecipientSearch('');
                              }}
                              className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors group text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                                  {user.nm?.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                    {user.nm}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {user.emlAddr || user.userId}
                                  </span>
                                </div>
                              </div>
                              <Plus size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                            </button>
                          ))
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">
                            <span className="text-xs font-bold tracking-tight">검색 결과가 없습니다.</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Subject */}
        <div className="hub-card-premium p-10 bg-muted border-none shadow-2xl relative overflow-hidden group rounded-lg">
          <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-focus-within:opacity-10 transition-opacity">
            <Zap size={140} className="rotate-12 text-foreground" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Mail size={20} />
              </div>
              <Label htmlFor="mail-subject" className="text-xs font-bold tracking-tight text-muted-foreground">메일 제목</Label>
            </div>
            <Input
              id="mail-subject"
              data-testid="mail-subject-input"
              value={form.sj}
              onChange={(e) => setForm({ ...form, sj: e.target.value })}
              className="h-11 bg-transparent border-none text-foreground text-3xl font-bold placeholder:text-foreground/10 focus-visible:ring-0 p-0 tracking-tight"
              placeholder="제목을 입력하세요."
              required
            />
            <div className="h-[1px] w-full bg-gradient-to-r from-primary/40 to-transparent" />
          </div>
        </div>

        {/* 4. Content Area */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Layers size={18} className="text-primary" />
              <Label htmlFor="mail-content" className="text-sm font-bold text-foreground tracking-tight transition-colors">메일 본문</Label>
            </div>
          </div>
          <Textarea
            id="mail-content"
            data-testid="mail-content-textarea"
            value={form.emailCn}
            onChange={(e) => setForm({ ...form, emailCn: e.target.value })}
            className="min-h-[300px] p-10 text-lg font-medium leading-relaxed bg-card border-2 border-border rounded-lg shadow-xl focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground"
            placeholder="전달할 상세 내용을 입력하세요."
            required
          />
        </div>

        {/* 5. Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-border">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground tracking-tight leading-none">현재 시각</span>
            <span className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5">
              <Clock size={12} /> {currentTime || '--:--:--'}
            </span>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-11 flex-1 sm:flex-none px-10 rounded-lg border-2 font-bold tracking-tight text-xs hover:bg-muted transition-all bg-card"
            >
              취소
            </Button>
            <Button
              type="submit"
              data-testid="mail-send-btn"
              disabled={isSubmitting}
              className="h-11 flex-1 sm:flex-none px-12 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-tight text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
            >
              {isSubmitting ? (
                <span className="animate-pulse">발송 중...</span>
              ) : (
                <>
                  <Send size={18} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> 메일 발송
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
