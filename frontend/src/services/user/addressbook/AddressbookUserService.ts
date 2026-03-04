import { UserService } from '@/services/core/ApiService';
import { AddressBook, NameCard } from '@/types/addressbook';

class AddressbookUserService extends UserService {
    constructor() {
        super('/address-books');
    }

    /**
     * 주소록 목록 조회
     */
    async getAddressBooks(params: { page?: number; size?: number; searchWrd?: string }) {
        return this.get<any>('', { params });
    }

    /**
     * 명함 상세 조회 (사용자 검색 결과용)
     */
    async getNameCard(id: string) {
        return this.get<any>(`/namecards/${id}`);
    }

    /**
     * 전사 사용자 주소록 검색
     */
    async searchUsers(keyword: string) {
        return this.get<any>('/users', {
            params: { keyword }
        });
    }
}

export const addressbookUserService = new AddressbookUserService();