'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { ApprovalDraftDialog } from '../ApprovalDraftDialog';

export default function ApprovalDraftHubClient() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  // [2026-10-01] 기안 창은 기안 권한으로 연다 — 결재함의 '새 결재 기안' 과 같은 판정이다. 권한 없이 폼을 다 채운 뒤
  //   403 을 만나게 두지 않는다. 표시 판정일 뿐이며 서버 인가는 그대로다.
  const { user } = useAuth();
  const canDraft = canPermission(user, 'APPROVAL_CREATE');
  return <div className="space-y-5">
    <h1 className="text-xl font-semibold text-foreground">새 결재 기안</h1>
    <p className="text-sm text-muted-foreground">문서 내용을 작성하고 결재선을 확인한 뒤 상신합니다.</p>
    {!canDraft && <p role="status" className="text-sm text-muted-foreground">결재를 올릴 권한이 없습니다.</p>}
    <div className="flex flex-wrap gap-2">{canDraft && <Button type="button" onClick={() => setOpen(true)}>기안 작성</Button>}<Button asChild variant="outline"><Link href="/approvals">결재함으로</Link></Button></div>
    {canDraft && open && <ApprovalDraftDialog isOpen onClose={() => setOpen(false)} onCreated={() => router.push('/approvals')} />}
  </div>;
}
