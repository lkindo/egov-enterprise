import { FileText } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';

/**
 * 메모 보고 → 업무 보고 화면 머리의 '메모보고 관리' 링크와 안내 문장(업무 허브 분해 W1). 종전에는 업무 허브 안의 문자열 링크라,
 * 메모 보고 없이 업무 보고만 고른 생성물에 없는 화면으로 가는 링크가 남았다. 이제 메모 보고 기능이 빠지면 이 파일과 함께 링크와
 * 문장이 사라진다. 노출은 목적지 진입 권한(MEMO_RPT_READ)과 같다 — 들어갈 수 없는 사람에게는 문장도 보이지 않는다.
 */
export default defineContributions('shell-links', [
  {
    id: 'memo-report-manage',
    placement: 'work-report',
    order: 10,
    href: '/admin/operation/memo-reports',
    label: '메모보고 관리',
    icon: FileText,
    description: '누군가에게 보고하려면 메모 보고를 쓰세요.',
    visibleWhen: { page: '/admin/operation/memo-reports' },
  },
]);
