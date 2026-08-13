import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

import { NameCard } from '@/types/business/addressbook';

export interface AddressBook {
  adbkSn: number;
  adbkNm: string;
  rlsScopeCd: string;
  wrterId: string;
  crtDt: string;
  telNo?: string;
  email?: string;
  adres?: string;
  adbkMan?: NameCard[];
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
      page?: number; 
      size?: number; 
      searchWrd?: string; 
      searchCnd?: string 
    }, 
    config?: AxiosRequestConfig
  ): Promise<PageResponse<AddressBook>> {
    return this.get<PageResponse<AddressBook>>('', {
      ...config,
      params
    });
  }

  /**
   * 주소록 상세 조회
   */
  async getAddressBook(adbkSn: number, config?: AxiosRequestConfig): Promise<AddressBook> {
    return this.get<AddressBook>(`/${adbkSn}`, config);
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
  async updateAddressBook(adbkSn: number, data: Partial<AddressBook>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${adbkSn}`, data, config);
  }

  /**
   * 주소록 삭제
   */
  async deleteAddressBook(adbkSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${adbkSn}`, config);
  }

  /**
   * 사용자 검색 (주소록 대상자 검색)
   */
  async searchUsers(searchWrd: string, config?: AxiosRequestConfig): Promise<PageResponse<NameCard>> {
    return this.get<PageResponse<NameCard>>('/search-users', { ...config, params: { searchWrd } });
  }
}

export const addressbookUserService = new AddressbookUserService();
