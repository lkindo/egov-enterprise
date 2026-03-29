import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Popup } from '@/types/foundation/banner';

/**
 * 팝업창 관리 서비스 (Admin)
 */
class PopupAdminService extends AdminService {
  constructor() {
    super('/popups');
  }

  /** 팝업창 목록 조회 */
  async getPopupList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Popup>> {
    return this.get<PageResponse<Popup>>('', { ...config, params });
  }

  /** 팝업창 상세 조회 */
  async getPopup(popupId: string, config?: AxiosRequestConfig): Promise<Popup> {
    return this.get<Popup>(`/${popupId}`, config);
  }

  /** 팝업창 등록 */
  async createPopup(data: Partial<Popup>, config?: AxiosRequestConfig): Promise<Popup> {
    return this.post<Popup>('', data, config);
  }

  /** 팝업창 수정 */
  async updatePopup(popupId: string, data: Partial<Popup>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${popupId}`, data, config);
  }

  /** 팝업창 삭제 */
  async deletePopup(popupId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${popupId}`, config);
  }

  /** 팝업창 일괄 삭제 */
  async deletePopups(popupIds: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.post('/delete', { popupIds }, config);
  }
}

export const popupAdminService = new PopupAdminService();
