import Link from 'next/link';
import { canOpenPage } from '@/lib/auth/page-access';

type GuideSubject = Parameters<typeof canOpenPage>[0];

interface GuideEntry {
  label: string;
  purpose: string;
  /** 올리는 화면. 이 기능(콘텐츠 페이지)이나 늘 남는 공통 화면만 둔다 — 아래 설명 참고. */
  where?: { href: string; label: string };
  /** 지금 이 화면이 맡는 종류. */
  here?: boolean;
}

/**
 * '무엇을 어디에 올리나요?' 접기 안내(ADR-0042). 안내성 글이 여러 기능에 흩어져 있어 콘텐츠 페이지로 올릴 것과 다른 곳에 올릴 것을
 * 한 줄씩 가른다.
 *
 * 링크는 이 기능이나 늘 남는 공통 화면(시스템 정책 관리)만 건다. 도움말·게시판(위키·FAQ·Q&A·공지)·배너/팝업은 다른 기능이 소유한
 * 화면이라, 그 기능을 뺀 생성물에서는 목적지가 등록되지 않는다 — 관리 링크 census 가 그런 목적지를 붉게 본다. 그 화면으로 가는
 * 길은 각 기능의 기여(슬롯)로 따로 열어야 한다. 링크는 라우트 게이트와 같은 판정(canOpenPage)으로 열 수 있는 사람에게만 보인다.
 */
const ENTRIES: readonly GuideEntry[] = [
  { label: '콘텐츠 페이지', purpose: '기관 소개·이용 안내처럼 오래 두고 읽는 안내 글. 영역을 나눠 꾸미고, 게시하면 로그인한 모든 사용자가 읽습니다.', here: true },
  { label: '도움말 콘텐츠', purpose: '화면을 쓰는 방법을 짧게 알려 주는 도움말.' },
  { label: '온라인 매뉴얼', purpose: '업무를 처리하는 순서를 차례대로 설명하는 매뉴얼.' },
  { label: 'FAQ', purpose: '자주 받는 질문과 정해진 답.' },
  { label: '위키', purpose: '여러 사람이 함께 고쳐 가며 쌓는 업무 지식.' },
  { label: 'Q&A', purpose: '사용자가 묻고 담당자가 답하는 질문.' },
  { label: '공지 게시판', purpose: '날짜가 중요한 알림과 소식.' },
  { label: '배너', purpose: '화면에 걸어 두는 홍보 이미지와 링크.' },
  { label: '팝업', purpose: '접속할 때 띄우는 짧은 알림 창.' },
  {
    label: '약관',
    purpose: '이용약관·개인정보 처리 방침 같은 정책 문서.',
    where: { href: '/admin/system/policies', label: '시스템 정책 관리' },
  },
];

export function ContentPageGuide({ subject }: { subject: GuideSubject }) {
  return (
    <details className="rounded-md border border-border bg-card">
      <summary className="cursor-pointer px-[var(--filter-pad)] py-2 text-sm font-semibold text-foreground">
        무엇을 어디에 올리나요?
      </summary>
      <ul className="space-y-1.5 border-t border-border p-[var(--filter-pad)] text-sm">
        {ENTRIES.map((entry) => (
          <li key={entry.label} className="text-muted-foreground">
            <span className="font-medium text-foreground">{entry.label}</span> — {entry.purpose}
            {entry.here && <span className="text-foreground"> 이 화면에서 만듭니다.</span>}
            {entry.where && canOpenPage(subject, entry.where.href) && (
              <>
                {' '}올리는 곳:{' '}
                <Link href={entry.where.href} className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {entry.where.label}
                </Link>
              </>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
