import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Popup } from '@/types/foundation/banner';

/**
 * 팝업李관리님쒕퉬님(Admin)
 */
class PopupAdminService extends AdminService {
  constructor() {
    super('/popups', 'system');
  }

  /** 팝업李목록 조회 */
  async getPopupList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Popup>> {
    return this.get<PageResponse<Popup>>('', { ...config, params });
  }

  /** 팝업李님곸꽭 조회 */
  async getPopup(popupId: string, config?: AxiosRequestConfig): Promise<Popup> {
    return this.get<Popup>(`/${popupId}`, config);
  }

  /** 팝업李등록 */
  async createPopup(data: Partial<Popup>, config?: AxiosRequestConfig): Promise<Popup> {
    return this.post<Popup>('', data, config);
  }

  /** 팝업李님섏젙 */
  async updatePopup(popupId: string, data: Partial<Popup>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${popupId}`, data, config);
  }

  /** 팝업李님삭제 */
  async deletePopup(popupId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${popupId}`, config);
  }

  /** 팝업李님쇨큵 님젣 */
  async deletePopups(popupIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.post('/delete', { popupIds }, config);
  }
}

export const popupAdminService = new PopupAdminService();
