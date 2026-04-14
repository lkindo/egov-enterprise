import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

import { NameCard } from '@/types/business/addressbook';

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
 * 주소록 관리 서비스 (Addressbook Service)
 */
class AddressbookUserService extends UserService {
  constructor() {
    super('/address-books');
  }

  /**
   * 주소록 목록 조회
   */
  async getAddressBooks(
    params: { 
      pageNo?: number; 
      pageIndex?: number; 
      page?: number; 
      pageUnit?: number; 
      searchWrd?: string; 
      searchCnd?: string 
    }, 
    config?: AxiosRequestConfig
  ): Promise<PageResponse<AddressBook>> {
    const page = params.pageNo || params.pageIndex || (params.page !== undefined ? params.page + 1 : 1);
    
    return this.get<PageResponse<AddressBook>>('', {
      ...config,
      params: {
        page: page - 1,
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
