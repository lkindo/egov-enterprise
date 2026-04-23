import { cookies } from 'next/headers';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';

export async function getInitialAddressBookData(params: { pageNo: number; pageUnit: number; searchWrd: string }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 토큰이 없는 경우 API를 호출하지 않고 빈 데이터 반환 (401 에러 방지)
  if (!accessToken) {
    return { list: [], total: 0, totalPage: 0 };
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    const data = await addressbookUserService.getAddressBooks(params, axiosConfig);
    return {
      list: data.list || [],
      total: data.total || 0,
      totalPage: data.totalPage || 0
    };
  } catch (error: any) {
    // 401 오류는 세션 만료 → 로그인 페이지로 우아하게 리다이렉트
    if (error.response?.status === 401) {
      const { redirect } = require('next/navigation');
      redirect('/login');
    }
    console.error('AddressBookListServer: Failed to fetch address books', error);
    return { list: [], total: 0, totalPage: 0 };
  }
}
