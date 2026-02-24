'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardForm, FormField } from '@/app/components/ui/standard-form';
import { userService } from '@/services/userService';
import { UserDto } from '@/types/user';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Save, X, User } from 'lucide-react';

export default function ProfileEditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<UserDto>>({});

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await userService.getMe();
        if (res) setFormData(res);
      } catch (error) {
        toast('?꾨줈???뺣낫瑜?遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isConfirmed = await confirm({
      title: '?꾨줈???섏젙',
      message: '?낅젰?섏떊 ?뺣낫濡??꾨줈?꾩쓣 ?낅뜲?댄듃?섏떆寃좎뒿?덇퉴?'
    });

    if (!isConfirmed) return;

    try {
      await userService.updateMe(formData);
      toast('?꾨줈?꾩씠 ?깃났?곸쑝濡??섏젙?섏뿀?듬땲??', 'success');
      router.push('/mypage');
    } catch (error) {
      toast('?섏젙 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse font-medium">濡쒕뵫 以?..</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader 
        title="Settings" 
        breadcrumbs={[{ label: 'Settings', href: '/mypage' }, { label: 'Settings' }]}
      />

      <StandardForm 
        onSubmit={handleSubmit}
        footer={
          <>
            <button 
              type="button" 
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg font-bold hover:bg-accent flex items-center gap-2"
            >
              <X size={18} /> 痍⑥냼
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 flex items-center gap-2"
            >
              <Save size={18} /> ??ν븯湲?
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center mb-8">
          <div className="relative group cursor-pointer">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-card shadow-sm group-hover:opacity-80 transition-all">
              <User size={64} className="text-muted-foreground" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <span className="bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded">蹂寃?/span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 font-medium">?꾨줈???대?吏??以鍮?以묒씤 湲곕뒫?낅땲??</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <FormField label="?ъ슜?먮챸" required>
            <input 
              type="text" 
              value={formData.userNm || ''}
              onChange={(e) => setFormData({...formData, userNm: e.target.value})}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="?꾩씠??(?섏젙遺덇?)">
            <input 
              type="text" 
              value={formData.userId || ''}
              readOnly
              className="w-full h-10 px-3 rounded-md border bg-muted/30 text-sm outline-none cursor-not-allowed"
            />
          </FormField>
        </div>

        <FormField label="?대찓??二쇱냼">
          <input 
            type="email" 
            value={formData.emailAdres || ''}
            onChange={(e) => setFormData({...formData, emailAdres: e.target.value})}
            className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-6">
          <FormField label="?щ쾲">
            <input 
              type="text" 
              value={formData.emplNo || ''}
              onChange={(e) => setFormData({...formData, emplNo: e.target.value})}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="吏곸쐞">
            <input 
              type="text" 
              value={formData.ofcpsNm || ''}
              onChange={(e) => setFormData({...formData, ofcpsNm: e.target.value})}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
        </div>
      </StandardForm>
    </div>
  );
}

