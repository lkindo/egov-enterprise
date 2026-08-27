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
    /*
     * 서버(AddressBookRepositoryImpl)는 searchCnd 가 '0'(주소록명)이나 '1'(작성자)일 때만
     * 조건을 만들고, 그 밖에는 condition 이 null 로 남는다. QueryDSL 에서 and(null) 은
     * 무시되므로 **검색어를 넣어도 목록과 총건수가 전체 그대로**였다 — 오류도 로딩도 없어서
     * 무시됐다는 사실이 화면에 드러나지 않는다. 두 호출부(CSR fetchList · SSR AddressBookListServer)가
     * 모두 searchCnd 를 보내지 않으므로 여기 한 곳에서 기본 축(주소록명)으로 정규화한다.
     *
     * ⚠ page/size 는 손대지 않는다 — 이 엔드포인트는 BaseSearchDto 가 아니라
     *   @PageableDefault Pageable 을 쓰므로 이미 정상이다. 다른 화면의 pageUnit 보정을
     *   여기에 복사하면 안 된다(같은 문법이 같은 의미가 아니다).
     */
    return this.get<PageResponse<AddressBook>>('', {
      ...config,
      params: { ...params, searchCnd: params.searchCnd ?? '0' }
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
