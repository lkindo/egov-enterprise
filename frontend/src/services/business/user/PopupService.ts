import { UserService } from '@/services/core/ApiService';
import { PublicPopup } from '@/types/foundation/banner';
import { PopupPublicResponseResponseSchema } from '@/types/generated-zod';
import { AxiosRequestConfig } from 'axios';
import { getActivePopupsOperation, getPopup_1Operation } from '@/types/generated-operations';

/**
 * 팝업 서비스(User)
 */
class PopupUserService extends UserService {
  /**
   * 현재 활성 팝업 목록 조회
   * 게시 기간이 현재 포함된 공통 팝업들을 반환합니다
   */
  async getActivePopups(config?: AxiosRequestConfig): Promise<PublicPopup[]> {
    const response = await this.executeGenerated(getActivePopupsOperation, { config });
    return PopupPublicResponseResponseSchema.array().parse(response) as PublicPopup[];
  }

  /**
   * 특정 팝업 상세 조회
   */
  async getPopup(popupSn: number, config?: AxiosRequestConfig): Promise<PublicPopup> {
    const response = await this.executeGenerated(getPopup_1Operation, {
      path: { popupSn },
      config,
    });
    return PopupPublicResponseResponseSchema.parse(response) as PublicPopup;
  }
}

export const popupService = new PopupUserService();
