'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { BookUser, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { userSearchService, type UserSearchResult } from '@/services/business/user/UserSearchService';
import { addressbookUserService, type AddressBook } from '@/services/business/user/addressbook/AddressbookUserService';
import type { NameCard } from '@/types/business/addressbook';
import { logErrorSafely } from '@/lib/safe-error-log';

/**
 * 행 선택은 네이티브 checkbox 다(일정 등록 폼과 같은 패턴). Radix `Checkbox`(components/ui/checkbox)를 쓰지 않는 이유는
 * 취향이 아니라 실측이다 — 그 모듈은 표(StandardDataTable)의 공용 청크 한 곳에만 있었는데, 피커가 같은 모듈을 끌자
 * Turbopack 이 라우트 청크 49개에 각각 복제해 gzip 합계가 +82KB 가 됐다(2026-09-05 base↔head 청크 대조, CI run 33971686861).
 */
const SELECT_CHECKBOX_CLASS = 'h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50';

const StandardModal = dynamic(() => import('./standard-modal').then((mod) => mod.StandardModal), { ssr: false });

/** 어떤 연락처가 필요한 채널인가 — 메일은 이메일, 문자는 휴대전화 번호. */
export type RecipientChannel = 'mail' | 'sms';

/**
 * 피커가 돌려주는 수신자 1명.
 *
 * - `user`: 시스템 사용자. 연락처는 화면이 알지 못한다(사용자 검색 응답은 개인정보를 담지 않는다 — 의도).
 *   발송 요청에 `esntlId` 만 실으면 서버(UserContactService)가 이메일·번호를 해석한다.
 * - `contact`: 주소록 명함 또는 직접 입력. 화면이 이미 주소·번호를 갖고 있으므로 그대로 싣는다.
 */
export type RecipientSelection =
  | { kind: 'user'; esntlId: string; name: string; deptNm?: string }
  | { kind: 'contact'; name: string; email?: string; phone?: string };

/** 같은 사람·같은 주소를 두 번 담지 않기 위한 식별 키. */
export function recipientKey(recipient: RecipientSelection): string {
  return recipient.kind === 'user'
    ? `user:${recipient.esntlId}`
    : `contact:${(recipient.email ?? '').toLowerCase()}:${recipient.phone ?? ''}`;
}

interface RecipientPickerProps {
  isOpen: boolean;
  onClose: () => void;
  channel: RecipientChannel;
  /** 확인 시 한 번 호출된다. 호출부가 기존 선택과 합치며 중복은 `recipientKey` 로 거른다. */
  onConfirm: (recipients: RecipientSelection[]) => void;
  title?: string;
}

/** 채널이 요구하는 연락처가 명함에 있는가. 없으면 고를 수 없다 — 서버로 보내 봐야 거부된다. */
function contactFor(channel: RecipientChannel, card: NameCard): string | undefined {
  const value = channel === 'mail' ? card.emlAddr : card.mblTelno;
  return value && value.trim() ? value.trim() : undefined;
}

/**
 * 🎯 수신자 피커 — 메일·문자 발송이 공유하는 사람 고르기 모달.
 *
 * [2026-09-05 DEC-OPS-035] 쪽지는 사용자 검색 피커로 사람을 고르는데 메일·문자는 이메일 주소와 번호를 손으로
 * 치게 했고(D09-02·D09-04), 주소록은 어떤 발송 화면에서도 쓰이지 않는 고립된 CRUD 였다(D09-03). 두 탭으로
 * 그 셋을 잇는다 — '사용자 검색'(성명 부분일치, 다중 선택) · '주소록'(내 주소록의 명함, 채널에 맞는 연락처가
 * 있는 것만 선택 가능).
 *
 * ⚠ 호출부는 `{open && <RecipientPicker … />}` 로 **조건부 마운트**한다. 열 때마다 새로 마운트되므로 검색어·
 *   선택 상태가 effect 없이 초기화된다(react-hooks/set-state-in-effect 회피).
 */
export function RecipientPicker({
  isOpen,
  onClose,
  channel,
  onConfirm,
  title = '수신자 찾기',
}: RecipientPickerProps) {
  const [tab, setTab] = useState<'users' | 'addressbook'>('users');
  const [selected, setSelected] = useState<Map<string, RecipientSelection>>(() => new Map());

  // --- 사용자 검색 탭 ---
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [userSearchState, setUserSearchState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');

  // --- 주소록 탭 ---
  const [books, setBooks] = useState<AddressBook[]>([]);
  const [booksState, setBooksState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [selectedBookSn, setSelectedBookSn] = useState<string>('');
  const [members, setMembers] = useState<NameCard[]>([]);
  const [membersState, setMembersState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');

  const toggle = useCallback((recipient: RecipientSelection, checked: boolean) => {
    setSelected((previous) => {
      const next = new Map(previous);
      const key = recipientKey(recipient);
      if (checked) next.set(key, recipient);
      else next.delete(key);
      return next;
    });
  }, []);

  const handleSearch = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed.length < 2) return;
    setUserSearchState('loading');
    try {
      setUsers(await userSearchService.searchAssignableUsers(trimmed));
      setUserSearchState('done');
    } catch (error) {
      // 실패를 "결과 없음" 으로 위장하지 않는다 — 사람이 없는 것과 조회가 실패한 것은 다른 사실이다.
      logErrorSafely('Recipient user search failed', error);
      setUsers([]);
      setUserSearchState('error');
    }
  }, [keyword]);

  const loadBooks = useCallback(async () => {
    setBooksState('loading');
    try {
      const page = await addressbookUserService.getAddressBooks({ page: 0, size: 50 });
      setBooks(page.list ?? []);
      setBooksState('done');
    } catch (error) {
      logErrorSafely('Address book list failed', error);
      setBooks([]);
      setBooksState('error');
    }
  }, []);

  const loadMembers = useCallback(async (adbkSn: number) => {
    setMembersState('loading');
    try {
      const book = await addressbookUserService.getAddressBook(adbkSn);
      setMembers(book.adbkMan ?? []);
      setMembersState('done');
    } catch (error) {
      logErrorSafely('Address book detail failed', error);
      setMembers([]);
      setMembersState('error');
    }
  }, []);

  const handleTabChange = (value: string) => {
    const next = value === 'addressbook' ? 'addressbook' : 'users';
    setTab(next);
    // 주소록 목록은 탭을 처음 열 때만 읽는다(효과 대신 이벤트에서 기동).
    if (next === 'addressbook' && booksState === 'idle') void loadBooks();
  };

  const handleBookChange = (value: string) => {
    setSelectedBookSn(value);
    setMembers([]);
    setMembersState('idle');
    if (value) void loadMembers(Number(value));
  };

  const handleConfirm = () => {
    onConfirm([...selected.values()]);
    onClose();
  };

  const channelLabel = channel === 'mail' ? '이메일' : '휴대전화 번호';

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={(
        <div className="flex items-center justify-between gap-3 w-full">
          <span className="text-xs font-bold text-muted-foreground" aria-live="polite">
            {selected.size > 0 ? `${selected.size}명 선택` : '선택된 수신자가 없습니다.'}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5 rounded-lg">취소</Button>
            <Button type="button" onClick={handleConfirm} disabled={selected.size === 0} className="h-10 px-6 rounded-lg">
              선택 추가{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          </div>
        </div>
      )}
    >
      {/*
        탭은 의존성 없는 수동 구현이다 — Radix Tabs 는 jsdom 에서 role=tab 도 비활성 패널 숨김도 만들지 않아
        계약 테스트가 두 패널을 동시에 보게 된다. 활성 패널만 렌더하므로 비활성 탭의 DOM 이 남지 않는다.
      */}
      <div className="space-y-4">
        <div role="tablist" aria-label="수신자 출처" className="inline-flex rounded-lg bg-muted p-1 gap-1">
          {([
            { value: 'users', label: '사용자 검색', icon: <User size={14} aria-hidden="true" /> },
            { value: 'addressbook', label: '주소록', icon: <BookUser size={14} aria-hidden="true" /> },
          ] as const).map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`recipient-tab-${item.value}`}
              aria-selected={tab === item.value}
              aria-controls={`recipient-panel-${item.value}`}
              onClick={() => handleTabChange(item.value)}
              className={`h-9 px-4 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${
                tab === item.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
        <div role="tabpanel" id="recipient-panel-users" aria-labelledby="recipient-tab-users" className="space-y-3">
          {/* 검색 축은 성명 하나다(UserRepositoryImpl.searchAssignableUsers) — 로그인 ID 매칭은 계정 열거 방어로 배제돼 있다. */}
          <form onSubmit={handleSearch} className="relative" role="search" aria-label="사용자 검색">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} aria-hidden="true" />
            <input
              type="text"
              aria-label="사용자 검색어 입력"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="이름으로 검색 (두 글자 이상)"
              className="w-full h-11 pl-10 pr-20 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-bold shadow-sm"
            >
              검색
            </button>
          </form>
          <p className="text-xs text-muted-foreground">
            사용자의 {channelLabel}는 화면에 표시되지 않으며, 발송 시 서버가 등록된 연락처로 보냅니다. 등록된 연락처가 없으면 발송이 거부됩니다.
          </p>
          <div className="bg-card border rounded-lg min-h-[260px] max-h-[320px] overflow-y-auto">
            {userSearchState === 'loading' ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse font-medium" role="status">검색 중…</div>
            ) : userSearchState === 'error' ? (
              <div role="alert" className="p-8 text-center text-sm font-bold text-destructive-emphasis">
                사용자 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.
              </div>
            ) : userSearchState === 'done' && users.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</div>
            ) : userSearchState === 'idle' ? (
              <div className="p-8 text-center text-xs text-muted-foreground">이름을 두 글자 이상 입력하고 검색을 누르세요.</div>
            ) : (
              <ul aria-label="사용자 검색 결과" className="divide-y">
                {users.filter((user) => user.esntlId).map((user) => {
                  const recipient: RecipientSelection = {
                    kind: 'user',
                    esntlId: user.esntlId!,
                    name: user.userNm ?? user.esntlId!,
                    deptNm: user.deptNm,
                  };
                  const key = recipientKey(recipient);
                  const checkboxId = `recipient-user-${user.esntlId}`;
                  return (
                    <li key={key} className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        id={checkboxId}
                        className={SELECT_CHECKBOX_CLASS}
                        checked={selected.has(key)}
                        onChange={(event) => toggle(recipient, event.target.checked)}
                        aria-label={`${recipient.name} 선택`}
                      />
                      <label htmlFor={checkboxId} className="flex-1 cursor-pointer">
                        <span className="block text-sm font-bold text-foreground">{recipient.name}</span>
                        <span className="block text-xs text-muted-foreground">{user.deptNm || '소속 부서 없음'}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        )}

        {tab === 'addressbook' && (
        <div role="tabpanel" id="recipient-panel-addressbook" aria-labelledby="recipient-tab-addressbook" className="space-y-3">
          <label htmlFor="recipient-address-book" className="block text-xs font-bold text-muted-foreground">주소록 선택</label>
          {booksState === 'loading' ? (
            <div className="text-sm text-muted-foreground animate-pulse" role="status">주소록을 불러오는 중…</div>
          ) : booksState === 'error' ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 text-sm font-bold text-destructive-emphasis">
              주소록을 불러오지 못했습니다.
              <Button type="button" variant="outline" size="sm" onClick={() => void loadBooks()}>다시 시도</Button>
            </div>
          ) : (
            <select
              id="recipient-address-book"
              value={selectedBookSn}
              onChange={(event) => handleBookChange(event.target.value)}
              className="w-full h-11 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">주소록을 고르세요</option>
              {books.map((book) => (
                <option key={book.adbkSn} value={String(book.adbkSn)}>{book.adbkNm}</option>
              ))}
            </select>
          )}
          {booksState === 'done' && books.length === 0 && (
            <p className="text-xs text-muted-foreground">사용할 수 있는 주소록이 없습니다. 주소록 관리에서 먼저 만들어 주세요.</p>
          )}
          <div className="bg-card border rounded-lg min-h-[220px] max-h-[300px] overflow-y-auto">
            {membersState === 'loading' ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse" role="status">명함을 불러오는 중…</div>
            ) : membersState === 'error' ? (
              <div role="alert" className="p-8 text-center text-sm font-bold text-destructive-emphasis">주소록 명함을 불러오지 못했습니다.</div>
            ) : membersState === 'done' && members.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">이 주소록에는 명함이 없습니다.</div>
            ) : membersState === 'idle' ? (
              <div className="p-8 text-center text-xs text-muted-foreground">주소록을 고르면 명함이 표시됩니다.</div>
            ) : (
              <ul aria-label="주소록 명함" className="divide-y">
                {members.map((card, index) => {
                  const contact = contactFor(channel, card);
                  const recipient: RecipientSelection = {
                    kind: 'contact',
                    name: card.nm,
                    email: channel === 'mail' ? contact : undefined,
                    phone: channel === 'sms' ? contact : undefined,
                  };
                  const key = recipientKey(recipient);
                  const checkboxId = `recipient-card-${card.adbkMbrSn ?? index}`;
                  return (
                    <li key={checkboxId} className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        id={checkboxId}
                        className={SELECT_CHECKBOX_CLASS}
                        checked={selected.has(key)}
                        disabled={!contact}
                        onChange={(event) => toggle(recipient, event.target.checked)}
                        aria-label={`${card.nm} 선택`}
                      />
                      <label htmlFor={checkboxId} className={`flex-1 ${contact ? 'cursor-pointer' : 'opacity-60'}`}>
                        <span className="block text-sm font-bold text-foreground">{card.nm}</span>
                        <span className="block text-xs text-muted-foreground">
                          {contact ?? `${channelLabel} 없음 — 선택할 수 없습니다`}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        )}
      </div>
    </StandardModal>
  );
}
