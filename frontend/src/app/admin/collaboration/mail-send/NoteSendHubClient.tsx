'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
 Send, 
 ArrowLeft, 
 User, 
 Zap, 
 ShieldCheck, 
 Clock, 
 Search, 
 X,
 Plus,
 MessageSquare,
 Layers,
 Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/app/components/ui/toast';
import { noteService } from '@/services/business/user/NoteService';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function NoteSendHubClient() {
 const router = useRouter();
 const { toast } = useToast();
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [recipientSearch, setRecipientSearch] = useState('');
 const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; name: string } | null>(null);
 const [searchResults, setSearchResults] = useState<any[]>([]);
 const [isSearching, setIsSearching] = useState(false);

 const [currentTime, setCurrentTime] = useState<string>('');

 React.useEffect(() => {
 setCurrentTime(new Date().toLocaleTimeString());
 const timer = setInterval(() => {
 setCurrentTime(new Date().toLocaleTimeString());
 }, 1000);
 return () => clearInterval(timer);
 }, []);

 const [form, setForm] = useState({
 noteSj: '',
 noteCn: ''
 });

 const handleSearchUsers = async (val: string) => {
 setRecipientSearch(val);
 if (val.length < 2) {
 setSearchResults([]);
 return;
 }

 setIsSearching(true);
 try {
 const response = await addressbookUserService.searchUsers(val);
 console.log('>>> Search Results:', JSON.stringify(response?.list || [], null, 2));
 setSearchResults(response?.list || []);
 } catch (error) {
 console.error('User search failed', error);
 } finally {
 setIsSearching(false);
 }
 };

 const handleSend = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedRecipient) {
 toast('�����ڸ� ������ �ּ���.', 'error');
 return;
 }
 if (!form.noteSj.trim() || !form.noteCn.trim()) {
 toast('����� ������ �Է��� �ּ���.', 'error');
 return;
 }

 console.log('>>> Sending Note to:', selectedRecipient);
 setIsSubmitting(true);
 try {
 await noteService.sendNote({
 rcverId: selectedRecipient.id,
 noteSj: form.noteSj,
 noteCn: form.noteCn
 });
 toast('������ ���������� �߼۵Ǿ����ϴ�.', 'success');
 router.push('/admin/collaboration?tab=MESSAGES');
 } catch (error) {
 toast('���� �߼ۿ� �����߽��ϴ�.', 'error');
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="max-w-5xl mx-auto space-y-12 pb-24 pt-8 animate-in fade-in duration-700">
 {/* 1. Header Section */}
 <div className="flex items-center gap-8 px-2">
 <Button
 variant="outline"
 onClick={() => router.back()}
 className="w-16 h-12 rounded-lg border-2 group hover:bg-slate-900 transition-all duration-500 shadow-xl active:scale-95 bg-white"
 >
 <ArrowLeft className="group-hover:text-white group-hover:-translate-x-1 transition-all" />
 </Button>
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold tracking-[0.5em] text-primary uppercase leading-none px-3 py-1 bg-primary/5 rounded-full border border-primary/10">Secure Communications</span>
 </div>
 <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight uppercase leading-none transition-colors">
 Dispatch <span className="text-primary">Note</span>
 </h1>
 </div>
 </div>

 <form onSubmit={handleSend} className="space-y-10 px-2">
 
 {/* 2. Recipient Selection Matrix */}
 <div className="hub-card-premium p-10 bg-white border-2 border-slate-100 shadow-2xl relative overflow-hidden group rounded-lg">
 <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-focus-within:opacity-10 transition-opacity">
 <User size={140} className="rotate-12 text-slate-900" />
 </div>
 <div className="relative z-10 space-y-8">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
 <Search size={20} />
 </div>
 <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Target_Recipient_Node</span>
 </div>
 {selectedRecipient && (
 <Badge className="bg-emerald-500 text-white border-none font-bold text-xs px-3 py-1.5 rounded-full uppercase tracking-widest animate-in zoom-in duration-300">Target Locked</Badge>
 )}
 </div>

 <div className="relative">
 {selectedRecipient ? (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex items-center justify-between p-6 bg-slate-900 text-white rounded-lg shadow-2xl ring-4 ring-primary/10"
 >
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xl border border-white/10">
 {selectedRecipient.name.charAt(0)}
 </div>
 <div className="space-y-0.5">
 <p className="text-lg font-bold tracking-tight leading-none">{selectedRecipient.name}</p>
 <p className="text-xs font-bold opacity-40 uppercase tracking-widest">{selectedRecipient.id}</p>
 </div>
 </div>
 <Button 
 type="button" 
 variant="ghost" 
 onClick={() => setSelectedRecipient(null)}
 className="h-10 w-10 p-0 text-white/40 hover:text-white hover:bg-white/10"
 >
 <X size={20} />
 </Button>
 </motion.div>
 ) : (
 <div className="space-y-4">
 <Input
 data-testid="note-recipient-input"
 placeholder="���� �Ǵ� ID�� �����ڸ� �˻��Ͻʽÿ�..."
 className="h-12 text-xl font-bold tracking-tight bg-slate-50 border-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 transition-all placeholder:text-slate-300"
 value={recipientSearch}
 onChange={(e) => handleSearchUsers(e.target.value)}
 />
 <AnimatePresence>
 {searchResults.length > 0 && (
 <motion.div 
 initial={{ opacity: 1, y: 0 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-lg shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden divide-y divide-slate-50"
 >
 {searchResults.map((user: any) => (
 <button
 key={user.userId || user.adbkId}
 type="button"
 data-testid="recipient-item"
 onClick={() => {
 setSelectedRecipient({ id: user.emplyrId || user.userId || user.adbkId, name: user.nm || user.userNm || user.adbkNm });
 setSearchResults([]);
 setRecipientSearch('');
 }}
 className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors group text-left"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-300 group-hover:bg-primary group-hover:text-white transition-all">
 {(user.nm || user.userNm || user.adbkNm)?.charAt(0)}
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">
 {user.nm || user.userNm || user.adbkNm}
 </span>
 <span className="text-sm text-slate-500">
 {user.emplyrId || user.userId || user.adbkId}
 </span>
 </div>
 </div>
 <Plus size={16} className="text-slate-200 group-hover:text-primary transition-colors" />
 </button>
 ))}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* 3. Subject Input Area */}
 <div className="hub-card-premium p-10 bg-slate-50 border-none shadow-2xl relative overflow-hidden group rounded-lg">
 <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-focus-within:opacity-10 transition-opacity">
 <Zap size={140} className="rotate-12 text-slate-900" />
 </div>
 <div className="relative z-10 space-y-6">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
 <MessageSquare size={20} />
 </div>
 <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Core_Subject_Header</span>
 </div>
 <Input
 value={form.noteSj}
 onChange={(e) => setForm({ ...form, noteSj: e.target.value })}
 className="h-20 bg-transparent border-none text-slate-900 text-3xl font-bold placeholder:text-slate-900/10 focus-visible:ring-0 p-0 tracking-tight "
 placeholder="������ �Է��Ͻʽÿ�..."
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
 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest transition-colors">Intelligence Payload</h3>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Encrypted Stream Ready</span>
 </div>
 </div>
 <Textarea
 value={form.noteCn}
 onChange={(e) => setForm({ ...form, noteCn: e.target.value })}
 className="min-h-[300px] p-10 text-lg font-medium leading-relaxed bg-white border-2 border-slate-100 rounded-lg shadow-xl focus-visible:ring-primary/20 transition-all placeholder:text-slate-200"
 placeholder="������ �� ������ ����Ͻʽÿ�..."
 required
 />
 </div>

 {/* 5. Bottom Actions */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-slate-100">
 <div className="flex items-center gap-8">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Security_Level</span>
 <span className="text-xs font-bold text-emerald-500 mt-1 uppercase flex items-center gap-1.5">
 <ShieldCheck size={12} /> Authenticated
 </span>
 </div>
 <div className="w-[1px] h-8 bg-slate-100" />
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Dispatch_Clock</span>
 <span className="text-xs font-bold text-slate-800 mt-1 uppercase flex items-center gap-1.5">
 <Clock size={12} /> {currentTime || '--:--:--'}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-4 w-full sm:w-auto">
 <Button
 type="button"
 variant="outline"
 onClick={() => router.back()}
 className="h-12 flex-1 sm:flex-none px-10 rounded-lg border-2 font-bold tracking-widest text-xs uppercase hover:bg-slate-50 transition-all bg-white"
 >
 Abort
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="h-12 flex-1 sm:flex-none px-12 rounded-lg bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
 >
 {isSubmitting ? (
 <span className="animate-pulse">Dispatching...</span>
 ) : (
 <>
 <Send size={18} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> Dispatch Protocol
 </>
 )}
 </Button>
 </div>
 </div>
 </form>

 {/* 6. Footer Insight */}
 <div className="text-center">
 <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-50 rounded-full border border-slate-100">
 <Sparkles size={14} className="text-primary/40" />
 <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Enterprise Neural Link - V4.5.1</span>
 </div>
 </div>
 </div>
 );
}

