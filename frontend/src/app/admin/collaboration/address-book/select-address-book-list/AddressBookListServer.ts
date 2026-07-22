import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import type { AddressBook } from '@/services/business/user/addressbook/AddressbookUserService';

export interface AddressBookInitialData {
  list: AddressBook[];
  total: number;
  totalPage: number;
  /**
   * 조회 실패 사유. 실패를 빈 목록으로 바꿔 "데이터 0건"이라고 거짓말하지 않기 위해
   * 클라이언트로 그대로 전달한다(감사 P1-1).
   */
  fetchError?: string;
}

/** 응답 상태 코드 추출 — 캐스팅 없이 형태만 확인한다. */
function getHttpStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 0;
  const withResponse = error as { response?: { status?: unknown }; status?: unknown };
  if (typeof withResponse.response?.status === 'number') return withResponse.response.status;
  if (typeof withResponse.status === 'number') return withResponse.status;
  return 0;
}

/**
 * 주소록 목록 초기 데이터.
 * 백엔드(`/api/v1/address-books`)는 Spring `Pageable` 을 받으므로 page(0-base)/size 로 전달한다.
 * (과거 `pageNo`/`pageUnit` 은 서버가 읽지 않아 항상 1페이지·10건만 반환됐다.)
 */
export async function getInitialAddressBookData(params: {
  page: number;
  size: number;
  searchWrd: string;
}): Promise<AddressBookInitialData> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (!accessToken) {
    return {
      list: [],
      total: 0,
      totalPage: 0,
      fetchError: '인증 정보가 없어 주소록을 조회하지 못했습니다. 다시 로그인해 주세요.'
    };
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    const data = await addressbookUserService.getAddressBooks(params, axiosConfig);
    return {
      list: data.list || [],
      total: data.total || 0,
      totalPage: data.totalPage || 0
    };
  } catch (error: unknown) {
    // 401 은 세션 만료 → 로그인 페이지로 리다이렉트
    if (getHttpStatus(error) === 401) {
      redirect('/login');
    }
    console.error('AddressBookListServer: Failed to fetch address books', error);
    return {
      list: [],
      total: 0,
      totalPage: 0,
      fetchError: '주소록 목록을 불러오지 못했습니다.'
    };
  }
}
