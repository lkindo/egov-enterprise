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
        if (res.success) setFormData(res.data);
      } catch (error) {
        toast('프로필 정보를 불러오는데 실패했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isConfirmed = await confirm({
      title: '프로필 수정',
      message: '입력하신 정보로 프로필을 업데이트하시겠습니까?'
    });

    if (!isConfirmed) return;

    try {
      await userService.updateMe(formData);
      toast('프로필이 성공적으로 수정되었습니다.', 'success');
      router.push('/mypage');
    } catch (error) {
      toast('수정 중 오류가 발생했습니다.', 'error');
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse font-medium">로딩 중...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader 
        title="프로필 수정" 
        breadcrumbs={[{ label: '마이페이지', href: '/mypage' }, { label: '수정' }]}
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
              <X size={18} /> 취소
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 flex items-center gap-2"
            >
              <Save size={18} /> 저장하기
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-card shadow-sm">
              <User size={64} className="text-muted-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 font-medium">프로필 이미지는 준비 중인 기능입니다.</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <FormField label="사용자명" required htmlFor="userNm">
            <input 
              id="userNm"
              type="text" 
              value={formData.userNm || ''}
              onChange={(e) => setFormData({...formData, userNm: e.target.value})}
              required
              className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="아이디 (수정불가)" htmlFor="userId">
            <input 
              id="userId"
              type="text" 
              value={formData.userId || ''}
              readOnly
              className="w-full h-10 px-3 rounded-md border bg-muted/30 text-sm outline-none cursor-not-allowed"
            />
          </FormField>
        </div>

        <FormField label="이메일 주소" htmlFor="emailAdres">
          <input 
            id="emailAdres"
            type="email" 
            value={formData.emailAdres || ''}
            onChange={(e) => setFormData({...formData, emailAdres: e.target.value})}
            className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-6">
          <FormField label="사번" htmlFor="emplNo">
            <input 
              id="emplNo"
              type="text" 
              value={formData.emplNo || ''}
              onChange={(e) => setFormData({...formData, emplNo: e.target.value})}
              className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="직위" htmlFor="ofcpsNm">
            <input 
              id="ofcpsNm"
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
