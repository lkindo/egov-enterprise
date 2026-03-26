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
 * 주소록 관리 서비스 (User)
 */
class AddressbookUserService extends UserService {
 constructor() {
 super('/address-books');
 }

 /**
 * 주소록 목록 조회
 */
 async getAddressBooks(params: { page번호?: number; pageUnit?: number; searchWrd?: string; searchCnd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<AddressBook>> {
 return this.get<PageResponse<AddressBook>>('', {
 ...config,
 params: {
 page: (params.page번호 || 1) - 1,
 size: params.pageUnit || 10,
 searchWrd: params.searchWrd,
 searchCnd: params.searchCnd
 }
 });
 }

 /**
 * 주소록 상세 조회
 */
 async getAddressBook(adbkId: string, config?: AxiosRequestConfig): Promise<AddressBook> {
 return this.get<AddressBook>(`/${adbkId}`, config);
 }

 /**
 * 주소록 등록
 */
 async createAddressBook(data: Partial<AddressBook>, config?: AxiosRequestConfig): Promise<AddressBook> {
 return this.post<AddressBook>('', data, config);
 }

 /**
 * 주소록 수정
 */
 async updateAddressBook(adbkId: string, data: Partial<AddressBook>, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${adbkId}`, data, config);
 }

 /**
 * 주소록 삭제
 */
 async deleteAddressBook(adbkId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${adbkId}`, config);
 }

 /**
 * 사용자 검색 (주소록 대상자 검색)
 */
 async searchUsers(searchWrd: string, config?: AxiosRequestConfig): Promise<NameCard[]> {
 return this.get<NameCard[]>('/search-users', { ...config, params: { searchWrd } });
 }
}

export const addressbookUserService = new AddressbookUserService();
