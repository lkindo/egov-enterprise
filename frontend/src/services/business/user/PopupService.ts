import { UserService } from '@/services/core/ApiService';
import { Popup } from '@/types/foundation/banner';
import { AxiosRequestConfig } from 'axios';
import { getActivePopupsOperation, getPopup_1Operation } from '@/types/generated-operations';

/**
 * 팝업 서비스(User)
 */
class PopupUserService extends UserService {
  constructor() {
    super('/popups');
  }

  /**
   * 현재 활성 팝업 목록 조회
   * 게시 기간이 현재 포함된 공통 팝업들을 반환합니다
   */
  async getActivePopups(config?: AxiosRequestConfig): Promise<Popup[]> {
    return this.executeGenerated(getActivePopupsOperation, { config }) as Promise<Popup[]>;
  }

  /**
   * 특정 팝업 상세 조회
   */
  async getPopup(popupSn: number, config?: AxiosRequestConfig): Promise<Popup> {
    return this.executeGenerated(getPopup_1Operation, {
      path: { popupSn },
      config,
    }) as Promise<Popup>;
  }
}

export const popupService = new PopupUserService();
