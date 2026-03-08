import { UserService } from '@/services/core/ApiService';
import { AddressBook, NameCard } from '@/types/addressbook';

class AddressbookUserService extends UserService {
    constructor() {
        super('/address-books');
    }

    /**
     * 雅뚯눘?쇗에?筌뤴뫖以?鈺곌퀬??
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
     * 雅뚯눘?쇗에??怨멸쉭 鈺곌퀬??
     */
    async getAddressBook(adbkId: string) {
        const response = await this.get<any>(`/${adbkId}`);
        return response.result;
    }

    /**
     * 雅뚯눘?쇗에??源낆쨯
     */
    async createAddressBook(data: any) {
        const response = await this.post<any>('', data);
        return response.result;
    }

    /**
     * 雅뚯눘?쇗에???륁젟
     */
    async updateAddressBook(adbkId: string, data: any) {
        const response = await this.put<any>(`/${adbkId}`, data);
        return response.result;
    }

    /**
     * 雅뚯눘?쇗에?????
     */
    async deleteAddressBook(adbkId: string) {
        const response = await this.delete<any>(`/${adbkId}`);
        return response.result;
    }

    /**
     * ?袁⑷텢 ?????雅뚯눘?쇗에?野꺜??(?怨멸쉭 ??밸씜????
     */
    async searchUsers(searchWrd: string) {
        const response = await this.get<any>('/search-users', {
            params: { searchWrd }
        });
        return response.result;
    }
}

export const addressbookUserService = new AddressbookUserService();
