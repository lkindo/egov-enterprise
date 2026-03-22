'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
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
  Clock,
  Sparkles,
  MonitorCheck,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { bannerAdminService } from '@/services/admin/system/BannerAdminService';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type LayoutTab = 'BANNERS' | 'QUICKLINKS' | 'THEMES';

export default function LayoutManagerClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- States ---
  const [activeTab, setActiveTab] = useState<LayoutTab>('BANNERS');
  const [themeConfig, setThemeConfig] = useState({
    primaryColor: '#3b82f6',
    isDarkMode: false,
    borderRadius: '16px',
    fontFamily: 'Pretendard'
  });

  // --- Queries ---
  const { data: banners = [], isLoading: isBannersLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => bannerAdminService.getBannerList({ pageIndex: 1 }).then(res => res.list || []),
  });

  // --- Mutations ---
  const saveThemeMutation = useMutation({
    mutationFn: async (config: typeof themeConfig) => {
      // Simulate saving to site config/CSS Variables
      console.log('Saving theme:', config);
      return new Promise(resolve => setTimeout(resolve, 800));
    },
    onSuccess: () => {
      toast('디자인 시스템 설정이 성공적으로 동기화되었습니다.', 'success');
    }
  });

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="비주얼 익스피리언스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '레이아웃 마스터' }]}
      />

      <HubHeader 
        title="디자인 및 리소스" 
        highlight="허브" 
        subtitle="전사 플랫폼의 시각적 아이덴티티 및 레이아웃 자산 통합 관리 센터" 
        icon={Layout} 
        actions={
          <div className="flex gap-4 p-2">
            <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">
              <Eye size={16} /> 실시간 미리보기
            </Button>
            <Button 
              size="lg" 
              onClick={() => saveThemeMutation.mutate(themeConfig)}
              disabled={saveThemeMutation.isPending}
              className="h-12 px-8 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all gap-2"
            >
              {saveThemeMutation.isPending ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
              디자인 규칙 저장
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-10 px-2 min-h-[850px]">
        {/* --- Navigation --- */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="hub-table-container p-6 bg-slate-50 shadow-inner">
            <NavButton 
              icon={<ImageIcon size={20} />} 
              label="프로모션 배너 마스터" 
              active={activeTab === 'BANNERS'} 
              onClick={() => setActiveTab('BANNERS')} 
            />
            <div className="h-4" />
            <NavButton 
              icon={<Layers size={20} />} 
              label="퀵메뉴 및 위젯 자산" 
              active={activeTab === 'QUICKLINKS'} 
              onClick={() => setActiveTab('QUICKLINKS')} 
            />
            <div className="h-4" />
            <NavButton 
              icon={<Palette size={20} />} 
              label="디자인 토큰 세팅" 
              active={activeTab === 'THEMES'} 
              onClick={() => setActiveTab('THEMES')} 
            />
          </div>

          <div className="bg-slate-900 border-2 border-slate-800 text-white rounded-[var(--radius-hub-item)] p-10 space-y-6 text-center shadow-2xl relative overflow-hidden group">
            <div className="w-16 h-16 bg-white/10 rounded-[var(--radius-hub-widget)] flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-xl transition-all group-hover:scale-110">
              <Sparkles size={32} className="text-primary" />
            </div>
            <h4 className="text-lg font-black tracking-tighter leading-tight uppercase">브랜드 아이덴티티</h4>
            <p className="text-[10px] text-white/30 font-black tracking-[0.2em] uppercase">시각적 DNA 동기화</p>
            <div className="flex justify-center gap-1.5 opacity-20 mt-4">
              <div className="w-8 h-1 bg-white rounded-full" />
              <div className="w-4 h-1 bg-white rounded-full opacity-50" />
            </div>
          </div>
        </div>

        {/* --- Content Area --- */}
        <div className="col-span-12 lg:col-span-9 h-full flex flex-col gap-8">
          <AnimatePresence mode="wait">
            {activeTab === 'BANNERS' && (
              <motion.div 
                key="banners"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pr-2"
              >
                <div className="hub-table-container h-[350px] border-4 border-dashed border-border/20 flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group bg-transparent">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-muted/50 rounded-[var(--radius-hub-widget)] flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:rotate-12 group-hover:shadow-2xl transition-all duration-500">
                    <Plus size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-black text-foreground uppercase tracking-widest ">신규 프로모션</p>
                    <p className="text-[10px] font-bold text-muted-foreground tracking-tight mt-3 uppercase opacity-50">벡터 / 래스터 업로드 • 최대 10MB</p>
                  </div>
                </div>

                {banners.map((banner: any) => (
                  <div key={banner.bannerId} className="hub-table-container h-[350px] overflow-hidden group relative bg-white border-border/50 transition-all hover:-translate-y-2 hover:shadow-2xl">
                    <div className="h-[60%] bg-slate-100 flex items-center justify-center overflow-hidden border-b border-border/20">
                      <ImageIcon size={64} className="text-slate-300 opacity-20 transition-transform group-hover:scale-125 duration-1000" />
                    </div>
                    <div className="p-8 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="bg-primary/10 text-primary text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-primary/5">
                          정렬 순서: {banner.bannerNm.split(' ')[1] || '기본'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase opacity-40">
                          <Clock size={12} /> {banner.reflctAt === 'Y' ? '게시됨' : '초안'}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-foreground tracking-tighter truncate leading-none uppercase">{banner.bannerNm}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold truncate mt-2 leading-none uppercase tracking-widest opacity-60">링크: {banner.linkSvcNm}</p>
                      </div>
                    </div>
                    <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                      <Button size="icon" variant="outline" className="w-12 h-12 bg-white/90 backdrop-blur shadow-2xl rounded-xl hover:bg-white border-none transition-all hover:scale-110"><Pencil size={20} /></Button>
                      <Button size="icon" variant="outline" className="w-12 h-12 bg-rose-500/10 backdrop-blur shadow-2xl rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white border-none transition-all hover:scale-110"><Trash2 size={20} /></Button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'THEMES' && (
              <motion.div 
                key="themes"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full"
              >
                <div className="hub-table-container p-16 space-y-16 bg-white min-h-[750px] relative overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-20 relative z-10">
                    <section className="space-y-12">
                      <div className="flex items-center gap-4 border-b border-border/30 pb-6">
                        <div className="w-10 h-10 bg-primary/10 rounded-[var(--radius-hub-widget)] flex items-center justify-center text-primary shadow-inner">
                          <Settings2 size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">글로벌 토큰 규칙</h3>
                          <p className="text-[9px] font-bold text-muted-foreground tracking-[0.3em] uppercase mt-2">디자인 시스템 캘리브레이션</p>
                        </div>
                      </div>
                      
                      <div className="space-y-10">
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">프라이머리 톤 매핑</label>
                          <div className="flex gap-6">
                            <input 
                              type="color" 
                              value={themeConfig.primaryColor} 
                              onChange={(e) => setThemeConfig({...themeConfig, primaryColor: e.target.value})}
                              className="w-20 h-20 rounded-[var(--radius-hub-widget)] cursor-pointer border-4 border-slate-100 p-0 overflow-hidden shadow-2xl hover:scale-105 transition-transform" 
                            />
                            <div className="flex-1 space-y-3">
                              <Input 
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 font-mono text-xl font-black text-foreground shadow-inner focus:ring-4 focus:ring-primary/10 transition-all uppercase" 
                                value={themeConfig.primaryColor}
                                onChange={(e) => setThemeConfig({...themeConfig, primaryColor: e.target.value})}
                              />
                              <p className="text-[10px] font-bold text-slate-400 px-2 tracking-tight">브랜드 코어 헥스 코드</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-5">
                          <label className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">에지 곡률 제어</label>
                          <div className="grid grid-cols-4 gap-6">
                            <RadiusOption label="XS" value="4px" active={themeConfig.borderRadius === '4px'} onClick={() => setThemeConfig({...themeConfig, borderRadius: '4px'})} />
                            <RadiusOption label="MD" value="8px" active={themeConfig.borderRadius === '8px'} onClick={() => setThemeConfig({...themeConfig, borderRadius: '8px'})} />
                            <RadiusOption label="LG" value="16px" active={themeConfig.borderRadius === '16px'} onClick={() => setThemeConfig({...themeConfig, borderRadius: '16px'})} />
                            <RadiusOption label="HUB" value="32px" active={themeConfig.borderRadius === '32px'} onClick={() => setThemeConfig({...themeConfig, borderRadius: '32px'})} />
                          </div>
                        </div>

                        <div className="space-y-5">
                          <label className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">타이포그래피 아키텍처</label>
                          <div className="relative group">
                            <Type className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={20} />
                            <select 
                              className="w-full h-16 bg-slate-50 rounded-2xl pl-14 pr-10 font-black text-sm outline-none border-2 border-transparent focus:border-primary/20 transition-all appearance-none cursor-pointer shadow-inner uppercase tracking-widest"
                              value={themeConfig.fontFamily}
                              onChange={(e) => setThemeConfig({...themeConfig, fontFamily: e.target.value})}
                            >
                              <option value="Pretendard">Pretendard (K-UX 표준)</option>
                              <option value="Inter">Inter (글로벌 미니멀)</option>
                              <option value="Outfit">Outfit (디스플레이 브랜딩)</option>
                            </select>
                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none rotate-90" size={16} />
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-12">
                      <div className="flex items-center gap-4 border-b border-border/30 pb-6">
                        <div className="w-10 h-10 bg-slate-900 rounded-[var(--radius-hub-widget)] flex items-center justify-center text-white shadow-2xl">
                          <Monitor size={22} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">실시간 시뮬레이션</h3>
                          <p className="text-[9px] font-bold text-muted-foreground tracking-[0.3em] uppercase mt-2">인터페이스 동작 프로토콜</p>
                        </div>
                      </div>

                      <div className="h-[450px] border-8 border-slate-50 bg-white rounded-[3rem] p-12 flex flex-col gap-8 shadow-2xl relative overflow-hidden ring-1 ring-slate-100">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xl" style={{ backgroundColor: themeConfig.primaryColor, fontFamily: themeConfig.fontFamily }}>EG</div>
                          <div className="flex gap-4">
                            <MonitorCheck size={18} className="text-slate-200" />
                            <Smartphone size={18} className="text-slate-200" />
                          </div>
                        </div>
                        <div className="space-y-4 mt-6">
                          <div className="h-4 w-[40%] bg-primary/10 rounded-full" style={{ backgroundColor: `${themeConfig.primaryColor}15` }} />
                          <div className="h-8 w-[90%] bg-slate-900 rounded-2xl" style={{ borderRadius: themeConfig.borderRadius }} />
                          <div className="h-4 w-[65%] bg-slate-100 rounded-xl" style={{ borderRadius: themeConfig.borderRadius }} />
                        </div>
                        <Button 
                          className="mt-auto h-16 w-full bg-slate-900 text-white font-black tracking-[0.3em] shadow-2xl uppercase transition-all"
                          style={{ backgroundColor: themeConfig.primaryColor, borderRadius: themeConfig.borderRadius, fontFamily: themeConfig.fontFamily }}
                        >
                          컴포넌트 실행
                        </Button>

                        {/* Designer's Guide Lines */}
                        <div className="absolute top-0 right-10 bottom-0 w-px bg-slate-100 opacity-20" />
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                      </div>
                    </section>
                  </div>
                  {/* Background Element */}
                  <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: `${themeConfig.primaryColor}05` }} />
                </div>
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
        "w-full group p-6 rounded-3xl border-2 transition-all flex items-center gap-6",
        active 
          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" 
          : "bg-white border-transparent hover:border-primary/20 text-slate-500 hover:text-slate-900 shadow-sm"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md",
        active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        {icon}
      </div>
      <span className="text-xs font-black tracking-tight uppercase ">{label}</span>
    </button>
  );
}

function RadiusOption({ label, value, active, onClick }: { label: string, value: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "h-20 flex flex-col items-center justify-center border-2 transition-all rounded-3xl shadow-sm",
        active ? "border-primary bg-primary/5 text-primary shadow-xl" : "border-slate-50 bg-slate-50 hover:bg-white text-slate-400 hover:shadow-md"
      )}
    >
      <span className="text-[11px] font-black mb-1 uppercase tracking-widest">{label}</span>
      <span className="text-[9px] font-bold opacity-30 uppercase">{value}</span>
    </button>
  );
}
