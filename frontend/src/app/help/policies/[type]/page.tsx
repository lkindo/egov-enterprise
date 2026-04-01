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
            title: type === 'privacy' ? '媛쒖씤?뺣낫 泥섎━ 諛⑹묠' : '?쎄? 諛님뺤콉',
            content: '?댁슜님遺덈윭님님?놁뒿?덈떎. ?좎떆 님?ㅼ떆 ?쒕룄?댁＜?몄슂.'
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
        title={policy?.title || '?쒖뒪님?뺤콉'} 
        subtitle="POLICY & LEGAL"
        icon={Scale}
        className="mb-12"
      />
      
      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm rounded-[3rem] overflow-hidden">
        <CardContent className="p-12">
          <div 
            className="prose prose-slate dark:prose-invert max-w-none text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: policy?.content || '' }}
          />
        </CardContent>
      </Card>
      
      <div className="mt-12 text-center text-muted-foreground text-sm uppercase tracking-widest opacity-50">
        理쒖쥌 ?섏젙님 {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
