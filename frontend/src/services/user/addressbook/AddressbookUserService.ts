import { UserService } from '@/services/core/ApiService';
import { AddressBook, NameCard } from '@/types/addressbook';

class AddressbookUserService extends UserService {
    constructor() {
        super('/address-books');
    }

    /**
     * 주소록 목록 조회
     */
    async getAddressBooks(params: { pageIndex?: number; pageUnit?: number; searchWrd?: string; searchCnd?: string }) {
        return this.get<any>('', { 
            params: {
                page: (params.pageIndex || 1) - 1,
                size: params.pageUnit || 10,
                searchWrd: params.searchWrd,
                searchCnd: params.searchCnd
            }
        });
    }

    /**
     * 주소록 상세 조회
     */
    async getAddressBook(adbkId: string) {
        return this.get<any>(`/${adbkId}`);
    }

    /**
     * 주소록 등록
     */
    async createAddressBook(data: any) {
        return this.post<any>('', data);
    }

    /**
     * 주소록 수정
     */
    async updateAddressBook(adbkId: string, data: any) {
        return this.put<any>(`/${adbkId}`, data);
    }

    /**
     * 주소록 삭제
     */
    async deleteAddressBook(adbkId: string) {
        return this.delete<any>(`/${adbkId}`);
    }

    /**
     * 전사 사용자 주소록 검색 (상세 팝업용 등)
     */
    async searchUsers(searchWrd: string) {
        return this.get<any>('/search-users', {
            params: { searchWrd }
        });
    }
}

export const addressbookUserService = new AddressbookUserService();