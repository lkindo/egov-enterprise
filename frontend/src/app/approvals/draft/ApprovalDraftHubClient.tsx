'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ApprovalDraftDialog } from '../ApprovalDraftDialog';

export default function ApprovalDraftHubClient() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  return <div className="space-y-5">
    <h1 className="text-xl font-semibold text-foreground">새 결재 기안</h1>
    <p className="text-sm text-muted-foreground">문서 내용을 작성하고 결재선을 확인한 뒤 상신합니다.</p>
    <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => setOpen(true)}>기안 작성</Button><Button asChild variant="outline"><Link href="/approvals">결재함으로</Link></Button></div>
    {open && <ApprovalDraftDialog isOpen onClose={() => setOpen(false)} onCreated={() => router.push('/approvals')} />}
  </div>;
}
