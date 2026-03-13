import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface Menu {
    menuNo: number;
    menuNm: string;
    progrmFileNm: string;
    upperMenuNo: number;
    menuOrdr: number;
    menuDc: string;
    relateImagePath: string;
    relateImageNm: string;
}

export interface MenuCreate {
    authorCode: string;
    menuNo: number;
    creatPersonId: string;
}

/**
 * 메뉴 관리 서비스 (Admin)
 */
class MenuAdminService extends AdminService {
    constructor() {
        super('/menus');
    }

    /** 메뉴 목록 조회 */
    async getMenuList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<Menu>> {
        const response = await this.get<any>('', {
            ...config,
            params: {
                ...params,
                searchWrd: params?.searchKeyword || params?.searchWrd || '',
            },
        });
        return response?.result || response;
    }

    /** 메뉴 전체 트리용 조회 */
    async getAllMenus(config?: AxiosRequestConfig): Promise<Menu[]> {
        const response = await this.get<any>('/all', config);
        return response?.result || response;
    }

    /** 메뉴 상세 조회 */
    async getMenu(menuNo: number, config?: AxiosRequestConfig): Promise<Menu> {
        const response = await this.get<any>(`/${menuNo}`, config);
        return response?.result || response;
    }

    /** 메뉴 등록 */
    async createMenu(data: Partial<Menu>, config?: AxiosRequestConfig): Promise<void> {
        return this.post('', data, config);
    }

    /** 메뉴 수정 */
    async updateMenu(menuNo: number, data: Partial<Menu>, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/${menuNo}`, data, config);
    }

    /** 메뉴 삭제 */
    async deleteMenu(menuNo: number, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/${menuNo}`, config);
    }

    /** 권한별 메뉴 생성 관리 목록 조회 */
    async getMenuCreationManageList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<MenuCreate>> {
        const response = await this.get<any>('/creation-manage', { ...config, params });
        return response?.result || response;
    }
}

export const menuAdminService = new MenuAdminService();
