import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface NameCard {
 ncrdId: string;
 ncrdNm: string;
 cmpnyNm: string;
 deptNm: string;
 telNo: string;
 mbtlNum: string;
 emailAdres: string;
}

export interface AddressBook {
 adbkId: string;
 adbkNm: string;
 othbcScope: string;
 wrterId: string;
 createdDate: string;
 telNo?: string;
 email?: string;
 adres?: string;
 nameCards?: NameCard[];
}

/**
 * 二쇱냼濡?愿由님쒕퉬님(User)
 */
class AddressbookUserService extends UserService {
 constructor() {
 super('/address-books');
 }

 /**
 * 二쇱냼濡?紐⑸줉 조회
 */
 async getAddressBooks(params: { page踰덊샇?: number; pageUnit?: number; searchWrd?: string; searchCnd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<AddressBook>> {
 return this.get<PageResponse<AddressBook>>('', {
 ...config,
 params: {
 page: (params.page踰덊샇 || 1) - 1,
 size: params.pageUnit || 10,
 searchWrd: params.searchWrd,
 searchCnd: params.searchCnd
 }
 });
 }

 /**
 * 二쇱냼濡님곸꽭 조회
 */
 async getAddressBook(adbkId: string, config?: AxiosRequestConfig): Promise<AddressBook> {
 return this.get<AddressBook>(`/${adbkId}`, config);
 }

 /**
 * 二쇱냼濡?등록
 */
 async createAddressBook(data: Partial<AddressBook>, config?: AxiosRequestConfig): Promise<AddressBook> {
 return this.post<AddressBook>('', data, config);
 }

 /**
 * 二쇱냼濡님섏젙
 */
 async updateAddressBook(adbkId: string, data: Partial<AddressBook>, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${adbkId}`, data, config);
 }

 /**
 * 二쇱냼濡님?젣
 */
 async deleteAddressBook(adbkId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${adbkId}`, config);
 }

 /**
 * ?ъ슜님寃님(二쇱냼濡님?곸옄 寃님
 */
 async searchUsers(searchWrd: string, config?: AxiosRequestConfig): Promise<NameCard[]> {
 return this.get<NameCard[]>('/search-users', { ...config, params: { searchWrd } });
 }
}

export const addressbookUserService = new AddressbookUserService();
