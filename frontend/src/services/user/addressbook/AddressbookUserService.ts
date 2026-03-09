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
        const response = await this.get<any>('', {
            params: {
                page: (params.pageIndex || 1) - 1,
                size: params.pageUnit || 10,
                searchWrd: params.searchWrd,
                searchCnd: params.searchCnd
            }
        });
        return response.result; // Unwrap ApiResponse result (Page object)
    }

    /**
     * 주소록 상세 조회
     */
    async getAddressBook(adbkId: string) {
        const response = await this.get<any>(`/${adbkId}`);
        return response.result;
    }

    /**
     * 주소록 등록
     */
    async createAddressBook(data: any) {
        const response = await this.post<any>('', data);
        return response.result;
    }

    /**
     * 주소록 수정
     */
    async updateAddressBook(adbkId: string, data: any) {
        const response = await this.put<any>(`/${adbkId}`, data);
        return response.result;
    }

    /**
     * 주소록 삭제
     */
    async deleteAddressBook(adbkId: string) {
        const response = await this.delete<any>(`/${adbkId}`);
        return response.result;
    }

    /**
     * 사용자 검색 (주소록 대상자 검색)
     */
    async searchUsers(searchWrd: string) {
        const response = await this.get<any>('/search-users', {
            params: { searchWrd }
        });
        return response.result;
    }
}

export const addressbookUserService = new AddressbookUserService();
