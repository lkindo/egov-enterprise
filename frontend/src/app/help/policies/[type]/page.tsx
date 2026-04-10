'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { policyAdminService, SystemPolicy } from '@/services/foundation/system/PolicyAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { Scale } from 'lucide-react';

export default function PolicyViewPage() {
  const { type } = useParams();
  const [policy, setPolicy] = useState<SystemPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (type) {
      policyAdminService.getPolicy(type as string)
        .then(res => setPolicy(res))
        .catch(err => {
          console.error('Failed to load policy:', err);
          // Fallback static defaults if API fails
          setPolicy({
            type: type as string,
            title: type === 'privacy' ? '개인정보 처리 방침' : '약관 및 정책',
            content: '정책 내용을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.'
          });
        })
        .finally(() => setLoading(false));
    }
  }, [type]);

  if (loading) {
    return (
      <div className="container mx-auto py-20 animate-in fade-in duration-700">
        <Skeleton className="h-20 w-1/3 mb-10" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-20 px-6 max-w-4xl animate-in slide-in-from-bottom-5 duration-700">
      <HubHeader 
        title={policy?.title || '시스템 정책'} 
        subtitle="POLICY & LEGAL"
        icon={Scale}
        className="mb-12"
      />
      
      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm rounded-[0.1rem] overflow-hidden">
        <CardContent className="p-12">
          <div 
            className="prose prose-slate dark:prose-invert max-w-none text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: policy?.content || '' }}
          />
        </CardContent>
      </Card>
      
      <div className="mt-12 text-center text-muted-foreground text-sm uppercase tracking-widest opacity-50">
        최종 수정일: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
