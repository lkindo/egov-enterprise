'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
 Layout, 
 Image as ImageIcon, 
 Palette, 
 Monitor, 
 Plus, 
 Trash2, 
 Pencil, 
 Save, 
 RefreshCcw,
 CheckCircle2,
 Settings2,
 Layers,
 Type,
 Component,
 MousePointer2,
 Eye,
 Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { bannerAdminService } from '@/services/admin/system/BannerAdminService';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type LayoutTab = 'BANNERS' | 'QUICKLINKS' | 'THEMES';

export default function Layout관리자Client() {
 const queryClient = useQueryClient();
 const { toast } = useToast();

 // --- States ---
 const [activeTab, setActiveTab] = useState<LayoutTab>('BANNERS');
 const [themeConfig, setThemeConfig] = useState({
 primaryColor: '#3b82f6',
 isDarkMode: false,
 borderRadius: '16px',
 fontFamily: 'Inter'
 });

 // --- Queries ---
 const { data: banners = [], isLoading: isBannersLoading } = useQuery({
 queryKey: ['admin-banners'],
 queryFn: () => bannerAdminService.getBannerList({ page번호: 1 }).then(res => res.list || []),
 });

 // --- Mutations ---
 const saveThemeMutation = useMutation({
 mutationFn: async (config: typeof themeConfig) => {
 // Simulate saving to site config/CSS Variables
 console.log('Saving theme:', config);
 return new Promise(resolve => setTimeout(resolve, 1000));
 },
 onSuccess: () => {
 toast('테마 설정이 성공적으로 반영되었습니다.', 'success');
 }
 });

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
 {/* --- Header --- */}
 <div className="flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl rotate-3">
 <Layout size={28} className="text-white" />
 </div>
 <div>
 <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
 Design & Layout Hub
 </h2>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 italic">
 Site Visual Appearance Control Center
 </p>
 </div>
 </div>
 <div className="flex gap-4">
 <Button variant="outline" className="h-14 px-8 rounded-2xl border-2 font-black tracking-tight hover:bg-slate-50 gap-3">
 <Eye size={20} /> Preview Site
 </Button>
 <Button 
 onClick={() => saveThemeMutation.mutate(themeConfig)}
 className="h-14 px-8 rounded-2xl bg-primary text-white font-black tracking-tight shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all gap-3"
 >
 <Save size={20} /> Deploy Changes
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-12 gap-8 px-2">
 
 {/* --- Left Column: Navigation (20%) --- */}
 <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
 <Card className="rounded-[2.5rem] border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-100">
 <CardHeader className="bg-slate-50/50 p-8 border-b">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic">
 Appearance Modules
 </CardTitle>
 </CardHeader>
 <CardContent className="p-4 space-y-2">
 <NavButton 
 icon={<ImageIcon size={20} />} 
 label="Main Banners" 
 active={activeTab === 'BANNERS'} 
 onClick={() => setActiveTab('BANNERS')} 
 />
 <NavButton 
 icon={<Plus size={20} />} 
 label="Quick Links & Assets" 
 active={activeTab === 'QUICKLINKS'} 
 onClick={() => setActiveTab('QUICKLINKS')} 
 />
 <NavButton 
 icon={<Palette size={20} />} 
 label="테마 " 
 active={activeTab === 'THEMES'} 
 onClick={() => setActiveTab('THEMES')} 
 />
 </CardContent>
 </Card>

 {/* Quick Stats/Info */}
 <Card className="rounded-[2.5rem] border-0 bg-slate-900 text-white shadow-2xl p-8 space-y-6">
 <div>
 <p className="text-[10px] font-bold text-white/40 tracking-tight mb-1">Active Theme</p>
 <h4 className="text-xl font-black italic tracking-tighter">Modern Default</h4>
 </div>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-primary" />
 <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10" />
 <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10" />
 </div>
 </Card>
 </div>

 {/* --- Right Column: Active Module (80%) --- */}
 <div className="col-span-12 lg:col-span-9 h-full min-h-[700px]">
 <AnimatePresence mode="wait">
 {activeTab === 'BANNERS' && (
 <motion.div 
 key="banners"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="h-full flex flex-col gap-8"
 >
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <div className="group h-[320px] rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
 <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all group-hover:rotate-12">
 <Plus size={32} />
 </div>
 <div className="text-center">
 <p className="text-sm font-black text-slate-900 italic ">Upload Banner</p>
 <p className="text-[9px] font-bold text-slate-400 tracking-tight mt-2">Max 5MB • JPG, PNG</p>
 </div>
 </div>
 {banners.map((banner: any) => (
 <div key={banner.bannerId} className="group relative h-[320px] rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 bg-white">
 <div className="h-[60%] bg-slate-100 flex items-center justify-center overflow-hidden">
 <ImageIcon size={48} className="text-slate-300 opacity-30" />
 </div>
 <div className="p-6">
 <div className="flex items-center justify-between mb-4">
 <span className="bg-primary/10 text-primary text-[8px] font-black px-2 py-0.5 rounded-full border border-primary/20 tracking-tight">
 Order {banner.bannerNm.split(' ')[1] || '0'}
 </span>
 <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
 <Clock size={10} /> {banner.reflctAt === 'Y' ? 'Active' : 'Draft'}
 </span>
 </div>
 <h4 className="text-sm font-black text-slate-900 italic truncate">{banner.bannerNm}</h4>
 <p className="text-[10px] text-slate-400 font-bold truncate mt-1">Link: {banner.linkSvcNm}</p>
 </div>
 <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <Button size="icon" variant="ghost" className="w-10 h-10 bg-white/90 backdrop-blur shadow-lg rounded-xl hover:bg-white"><Pencil size={16} /></Button>
 <Button size="icon" variant="ghost" className="w-10 h-10 bg-rose-500/10 backdrop-blur shadow-lg rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white"><Trash2 size={16} /></Button>
 </div>
 </div>
 ))}
 </div>
 </motion.div>
 )}

 {activeTab === 'THEMES' && (
 <motion.div 
 key="themes"
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="h-full"
 >
 <Card className="rounded-[2.5rem] border-0 bg-white shadow-2xl p-10 space-y-12 ring-1 ring-slate-100">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
 <section className="space-y-8">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-primary">
 <Settings2 size={18} />
 </div>
 <h3 className="text-xl font-black tracking-tighter italic">Global Tokens</h3>
 </div>
 
 <div className="space-y-6">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight">Primary Color</label>
 <div className="flex gap-4">
 <input 
 type="color" 
 value={themeConfig.primaryColor} 
 onChange={(e) => setThemeConfig({...themeConfig, primaryColor: e.target.value})}
 className="w-16 h-16 rounded-2xl cursor-pointer border-0 p-0 overflow-hidden" 
 />
 <Input 
 className="h-16 flex-1 bg-slate-50 border-0 rounded-2xl px-6 font-mono text-lg font-black text-slate-700" 
 value={themeConfig.primaryColor}
 onChange={(e) => setThemeConfig({...themeConfig, primaryColor: e.target.value})}
 />
 </div>
 </div>

 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight">Border Radius</label>
 <div className="grid grid-cols-4 gap-4">
 <RadiusOption label="S" value="4px" active={themeConfig.borderRadius === '4px'} onClick={() => setThemeConfig({...themeConfig, borderRadius: '4px'})} />
 <RadiusOption label="M" value="8px" active={themeConfig.borderRadius === '8px'} onClick={() => setThemeConfig({...themeConfig, borderRadius: '8px'})} />
 <RadiusOption label="L" value="16px" active={themeConfig.borderRadius === '16px'} onClick={() => setThemeConfig({...themeConfig, borderRadius: '16px'})} />
 <RadiusOption label="XL" value="32px" active={themeConfig.borderRadius === '32px'} onClick={() => setThemeConfig({...themeConfig, borderRadius: '32px'})} />
 </div>
 </div>

 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight">Typography System</label>
 <select 
 className="w-full h-16 bg-slate-50 rounded-2xl px-6 font-black italic text-sm outline-none border-2 border-transparent focus:border-primary/20 transition-all appearance-none"
 value={themeConfig.fontFamily}
 onChange={(e) => setThemeConfig({...themeConfig, fontFamily: e.target.value})}
 >
 <option value="Inter">Inter (Sans)</option>
 <option value="Outfit">Outfit (Display)</option>
 <option value="Manrope">Manrope (Clean)</option>
 </select>
 </div>
 </div>
 </section>

 <section className="space-y-8">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-primary">
 <Monitor size={18} />
 </div>
 <h3 className="text-xl font-black tracking-tighter italic">Live Preview</h3>
 </div>

 <div className="h-[400px] border-4 border-slate-50 bg-white rounded-[2rem] p-10 flex flex-col gap-6 shadow-inner relative overflow-hidden">
 <div className="flex items-center justify-between">
 <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black italic text-sm" style={{ backgroundColor: themeConfig.primaryColor }}>EG</div>
 <div className="flex gap-4">
 <div className="w-4 h-4 bg-slate-100 rounded-full" />
 <div className="w-4 h-4 bg-slate-100 rounded-full" />
 </div>
 </div>
 <div className="space-y-2 mt-4">
 <div className="h-6 w-[80%] bg-slate-900 rounded-lg" style={{ borderRadius: themeConfig.borderRadius }} />
 <div className="h-4 w-[60%] bg-slate-100 rounded-lg" style={{ borderRadius: themeConfig.borderRadius }} />
 </div>
 <Button 
 className="mt-auto h-14 w-full bg-slate-900 text-white font-black italic tracking-tight shadow-xl"
 style={{ backgroundColor: themeConfig.primaryColor, borderRadius: themeConfig.borderRadius }}
 >
 Action Button
 </Button>

 {/* Grid Overlay for "Designer" feel */}
 <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px' }} />
 </div>
 </section>
 </div>
 </Card>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </div>
 );
}

// --- Sub-components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
 return (
 <button 
 onClick={onClick}
 className={cn(
 "w-full group p-5 rounded-3xl border-2 transition-all flex items-center gap-4",
 active 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl translate-x-1" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-500 hover:text-slate-900"
 )}
 >
 <div className={cn(
 "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
 active ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
 )}>
 {icon}
 </div>
 <span className="text-sm font-black tracking-tight italic">{label}</span>
 </button>
 );
}

function RadiusOption({ label, value, active, onClick }: { label: string, value: string, active: boolean, onClick: () => void }) {
 return (
 <button 
 onClick={onClick}
 className={cn(
 "h-16 flex flex-col items-center justify-center border-2 transition-all rounded-2xl",
 active ? "border-primary bg-primary/5 text-primary" : "border-slate-100 bg-slate-50 hover:bg-white text-slate-400"
 )}
 >
 <span className="text-[10px] font-black mb-1">{label}</span>
 <span className="text-[8px] font-bold opacity-40">{value}</span>
 </button>
 );
}
