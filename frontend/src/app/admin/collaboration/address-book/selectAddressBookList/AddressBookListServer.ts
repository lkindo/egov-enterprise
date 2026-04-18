import { cookies } from 'next/headers';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';

export async function getInitialAddressBookData(params: { pageNo: number; pageUnit: number; searchWrd: string }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  try {
    const data = await addressbookUserService.getAddressBooks(params, axiosConfig);
    return {
      list: data.list || [],
      total: data.total || 0,
      totalPage: data.totalPage || 0
    };
  } catch (error) {
    console.error('AddressBookListServer: Failed to fetch address books', error);
    return { list: [], total: 0, totalPage: 0 };
  }
}
