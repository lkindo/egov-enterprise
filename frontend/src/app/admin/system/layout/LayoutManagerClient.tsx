
import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  CheckCircle2, 
  Info, 
  ChevronRight, 
  Save, 
  Image as ImageIcon,
  Monitor,
  Settings2,
  Brush
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

import { useToast } from '@/app/components/ui/toast';

// --- ?붿옄님?좏겙 湲곕낯媛---
const DEFAULT_THEME_CONFIG = {
  primaryColor: '#3b82f6',
  borderRadius: '1.5', // Rem ⑥쐞 踰좎씠님  layoutMode: 'MODERN' as const,
  sidebarWidth: 260,
};

/**
 * 시스템?뚮쭏 諛님붿옄님?좏겙 ?쒖뼱 ?쇳꽣 (?덉땐님諛섏쁺 踰꾩쟾)
 * - 諛곕꼫 관리щ뒗 湲곗〈 '諛곕꼫 諛님앹뾽관리 ?꾩슜 硫붾돱濡님닿님섏뿀?듬땲님
 * - 蹂님섏씠吏님?뚮옯?쇱쓽 ?듭떖 ?붿옄님蹂님怨〓쪧, 而щ윭)瑜님꾩뿭?곸쑝濡님쒖뼱?섎뒗 ?붿쭊 님븷님?섑뻾합니다
 */
export default function LayoutManagerClient() {
  const { toast } = useToast();
  
  // --- ?붿옄님?좏겙 ?곹깭 ---
  const [themeConfig, setThemeConfig] = useState(DEFAULT_THEME_CONFIG);

  // 濡쒖뺄ㅽ넗由ъ 諛님ㅼ젣 CSS 蹂님?곸슜
  const applyDesignTokens = (config: typeof DEFAULT_THEME_CONFIG) => {
    const root = document.documentElement;
    const baseRadius = parseFloat(config.borderRadius) || 1.5;
    
    // ?꾩뿭 CSS 蹂님二쇱엯
    root.style.setProperty('--radius-hub-section', `${baseRadius * 3.5}rem`);
    root.style.setProperty('--radius-hub-widget', `${baseRadius * 2.0}rem`);
    root.style.setProperty('--radius-hub-item', `${baseRadius * 1.5}rem`);
    root.style.setProperty('--primary', config.primaryColor);
    
    // ?곴뎄 님(釉뚮씪?곗? ?섏?)
    localStorage.setItem('hub-theme-config', JSON.stringify(config));
  };

  // 珥덇린 濡쒕뱶 님ㅼ젙 동기화  useEffect(() => {
    const saved = localStorage.getItem('hub-theme-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setThemeConfig(parsed);
        applyDesignTokens(parsed);
      } catch (e) {
        console.error('Failed to load theme config', e);
      }
    } else {
      applyDesignTokens(DEFAULT_THEME_CONFIG);
    }
  }, []);

  // --- ?몃뱾님---
  const handleThemeSave = () => {
    applyDesignTokens(themeConfig);
    toast('?붿옄님시스템동기화?깃났: ㅼ젙?섏떊 怨〓쪧怨님됱긽님?뚮옯님?꾨컲님UI ?명봽?쇱뿉 利됯컖 ?곸슜?섏뿀?듬땲님', 'success');
  };

  return (
    <div className="flex flex-col gap-8 p-10 max-w-[1600px] mx-auto min-h-screen bg-transparent">
      {/* ?뚮쭏 관리님ㅻ뜑 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between border-b pb-8 border-slate-200"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-primary/10 text-primary border-none font-black px-4 py-1 rounded-full uppercase tracking-tighter">System Design Engine</Badge>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-bold text-slate-400">v2.0 Beta</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 text-slate-900">
            <Settings2 className="w-10 h-10 text-primary" />
            시스템?뚮쭏 諛님붿옄님?좏겙 ?쒖뼱
          </h1>
          <p className="mt-3 text-slate-500 font-bold text-lg">?뚮옯?쇱쓽 ?쒓컖님?쇨님깆쓣 ?좎님섍린 ?꾪빐 ?꾩뿭 ?먯?(Edge) 怨〓쪧 및 釉뚮옖님而щ윭 ?좏겙님?뺤쓽합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleThemeSave} 
            className="h-14 px-10 rounded-2xl font-black gap-3 shadow-2xl shadow-primary/30 text-lg bg-primary hover:scale-105 transition-transform"
          >
            <CheckCircle2 size={22} />
            ?꾩껜 ?뚮옯님?곸슜
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-10 mt-4">
        {/* 醫뚯륫: ?붿옄님?좏겙 議곗젅 ⑤꼸 */}
        <div className="col-span-12 lg:col-span-4 space-y-10">
          
          <section className="space-y-6">
            <h3 className="text-xl font-black flex items-center gap-2 text-slate-800">
              <Palette size={20} className="text-primary" />
              怨〓쪧 시스템(Radius Scale)
            </h3>
            <Card className="rounded-[2.5rem] border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-white/60 backdrop-blur-3xl p-2 overflow-hidden">
              <CardContent className="space-y-8 pt-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-2">
                    <Label className="text-sm font-black text-slate-400 uppercase tracking-widest">Base Factor</Label>
                    <span className="text-4xl font-black text-primary tabular-nums">{themeConfig.borderRadius}<span className="text-lg">rem</span></span>
                  </div>
                  <div className="px-2">
                    <input 
                      type="range" min="0" max="3" step="0.1" 
                      value={themeConfig.borderRadius}
                      onChange={(e) => {
                        const newConfig = { ...themeConfig, borderRadius: e.target.value };
                        setThemeConfig(newConfig);
                        applyDesignTokens(newConfig); 
                      }}
                      className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Section Scale</p>
                      <p className="text-2xl font-black">{(parseFloat(themeConfig.borderRadius) * 3.5).toFixed(1)}<span className="text-xs ml-1">rem</span></p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Item Scale</p>
                      <p className="text-2xl font-black">{(parseFloat(themeConfig.borderRadius) * 1.5).toFixed(1)}<span className="text-xs ml-1">rem</span></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-black flex items-center gap-2 text-slate-800">
              <Brush size={20} className="text-primary" />
              釉뚮옖님?꾩씠?댄떚님(Color)
            </h3>
            <Card className="rounded-[2.5rem] border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-white/60 backdrop-blur-3xl p-2">
              <CardContent className="space-y-6 pt-8">
                <div className="grid grid-cols-4 gap-4">
                  {['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        const newConfig = { ...themeConfig, primaryColor: color };
                        setThemeConfig(newConfig);
                        applyDesignTokens(newConfig);
                      }}
                      className={`h-14 rounded-2xl transition-all border-4 ${themeConfig.primaryColor === color ? 'border-primary ring-8 ring-primary/10 scale-105' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-4 p-1">
                  <Input 
                    type="color" value={themeConfig.primaryColor}
                    onChange={(e) => {
                      const newConfig = { ...themeConfig, primaryColor: e.target.value };
                      setThemeConfig(newConfig);
                      applyDesignTokens(newConfig);
                    }}
                    className="h-14 w-24 cursor-pointer p-2 rounded-2xl border-none shadow-inner bg-slate-50"
                  />
                  <div className="flex-1 h-14 bg-slate-50 rounded-2xl flex items-center px-6 font-black text-lg text-slate-700 justify-center tracking-widest border border-slate-100">
                    {themeConfig.primaryColor.toUpperCase()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="p-8 bg-amber-50 rounded-[2.5rem] border-2 border-dashed border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-black">
              <Info size={18} />
              <span>?덈궡 ы빆</span>
            </div>
            <p className="text-sm font-bold text-amber-600/80 leading-relaxed">
              蹂님섏씠吏먯꽌 ㅼ젙?섎뒗 媛믪? ?뚮옯님?꾩껜님?붿옄님媛대뱶?쇱씤님利됱떆 ?숆린?붾맗?덈떎. <br/>
              <b>?꾨줈紐⑥뀡 諛곕꼫 諛님앹뾽 ?먯궛</b> 관리щ뒗 ?꾨Ц 硫붾돱님<span className="underline decoration-2">[肄섑뀗痢님댁쁺]</span> 님쓣 이용님二쇱꽭님
            </p>
          </div>
        </div>

        {/* ?곗륫: ?쒓컖님?쒕님덉씠님*/}
        <div className="col-span-12 lg:col-span-8">
          <div className="h-full min-h-[700px] bg-slate-100/40 rounded-[4rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 relative overflow-hidden group">
            <div className="absolute top-10 left-12 flex items-center gap-4">
              <Badge variant="outline" className="bg-white/80 backdrop-blur-md border-none font-bold px-5 py-2.5 rounded-2xl flex gap-3 shadow-lg">
                <Monitor size={16} className="text-primary" /> 
                System Real-time Simulator
              </Badge>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={`${themeConfig.borderRadius}-${themeConfig.primaryColor}`}
                initial={{ scale: 0.9, opacity: 0, rotateY: -10 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                className="bg-white shadow-[0_60px_120px_rgba(0,0,0,0.12)] p-14 w-[580px] flex flex-col items-center text-center gap-12 transition-all"
                style={{ 
                  borderRadius: 'var(--radius-hub-section)',
                  borderColor: 'var(--primary)',
                }}
              >
                <div 
                  className="w-32 h-32 flex items-center justify-center shadow-inner transition-transform duration-700 group-hover:rotate-12"
                  style={{ 
                    borderRadius: 'var(--radius-hub-widget)', 
                    backgroundColor: `${themeConfig.primaryColor}15`,
                    color: themeConfig.primaryColor
                  }}
                >
                  <ImageIcon className="w-14 h-14" />
                </div>
                
                <div className="space-y-5">
                  <h3 className="text-5xl font-black tracking-tighter" style={{ color: themeConfig.primaryColor }}>
                    UX ?좏겙 誘몃━蹂닿린
                  </h3>
                  <p className="text-slate-500 font-bold text-xl leading-relaxed">
                    ?좏깮?섏떊 <span className="text-slate-900">怨〓쪧怨님뚮쭏 而щ윭</span>媛 <br/>
                    ㅼ젣 ?뚮옯님而댄룷?뚰듃濡援ы쁽님紐⑥뒿?낅땲님
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 w-full">
                  {[1, 2].map(i => (
                    <div 
                      key={i} 
                      className="h-20 bg-slate-50 flex items-center justify-center font-black text-slate-400 border border-slate-100 text-lg" 
                      style={{ borderRadius: 'var(--radius-hub-item)' }}
                    >
                      COMPONENT {i}
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full h-20 text-2xl font-black gap-4 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 px-10"
                  style={{ 
                    borderRadius: 'var(--radius-hub-item)', 
                    backgroundColor: themeConfig.primaryColor,
                    boxShadow: `0 25px 50px ${themeConfig.primaryColor}40`
                  }}
                >
                  ?쒕님덉씠님완료 및 吏꾩엯 <ChevronRight size={32} strokeWidth={3} />
                </Button>
              </motion.div>
            </AnimatePresence>

            {/* 硫뷀? ?뺣낫 */}
            <div className="mt-16 flex items-center gap-3 text-slate-400 font-black">
              <Info size={18} />
              <span>현재 ?쒓컖?붾맂 ?뱀뀡 怨〓쪧 ?섏튂: {((parseFloat(themeConfig.borderRadius) || 0) * 3.5).toFixed(1)} rem</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

