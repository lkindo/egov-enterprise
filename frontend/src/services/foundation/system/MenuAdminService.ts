import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
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
 modernRoute?: string;
}

export interface MenuCreate {
 authorCode: string;
 menuNo: number;
 creatPersonId: string;
}

/**
 * 硫붾돱 愿由님쒕퉬님(Admin)
 */
class MenuAdminService extends AdminService {
 constructor() {
 super('/menus');
 }

 /** 硫붾돱 紐⑸줉 조회 */
 async getMenuList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Menu>> {
 return this.get<PageResponse<Menu>>('', {
 ...config,
 params: {
 ...params,
 searchWrd: params?.searchKeyword || params?.searchWrd || '',
 },
 });
 }

 /** 硫붾돱 ?꾩껜 ?몃━님조회 */
 async getAllMenus(config?: AxiosRequestConfig): Promise<Menu[]> {
 return this.get<Menu[]>('/all', config);
 }

 /** 硫붾돱 ?곸꽭 조회 */
 async getMenu(menuNo: number, config?: AxiosRequestConfig): Promise<Menu> {
 return this.get<Menu>(`/${menuNo}`, config);
 }

 /** 硫붾돱 등록 */
 async createMenu(data: Partial<Menu>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** 硫붾돱 ?섏젙 */
 async updateMenu(menuNo: number, data: Partial<Menu>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${menuNo}`, data, config);
 }

  /** 硫붾돱 ?쒖꽌 ?쇨큵 ?섏젙 - API 紐낆꽭님?곕Ⅸ 寃쎈줈 ?섏젙 (/batch-order) */
  async updateMenuOrder(data: Partial<Menu>[], config?: AxiosRequestConfig): Promise<void> {
    // 80?ш컻님硫붾돱 ?낅뜲?댄듃 遺?섎? 怨좊젮?섏뿬 ??꾩븘님120珥덈줈 ?님?곗옣
    return this.put('/batch-order', data, { ...config, timeout: 120000 });
  }

 /** 硫붾돱 님젣 */
 async deleteMenu(menuNo: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${menuNo}`, config);
 }

 /** 沅뚰븳蹂?硫붾돱 ?앹꽦 愿由?紐⑸줉 조회 */
 async getMenuCreationManageList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<MenuCreate>> {
 return this.get<PageResponse<MenuCreate>>('/creation-manage', { ...config, params });
 }

 /** 沅뚰븳蹂?硫붾돱 ?좊떦 ?님*/
 async saveMenuCreation(authorCode: string, menuNos: number[], config?: AxiosRequestConfig): Promise<void> {
 return this.post(`/creation/${authorCode}`, menuNos, config);
 }
}

export const menuAdminService = new MenuAdminService();
