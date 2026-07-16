import { UserService } from '@/services/core/ApiService';
import { Banner } from '@/types/foundation/banner';
import { AxiosRequestConfig } from 'axios';

/**
 * 배너 서비스(User)
 * 메인화면 노출 배너 조회. 관리자 전용(/admin/system/banners)이 아닌 사용자 경로(/api/v1/banners)를 사용해
 * 일반 사용자 대시보드에서 403 없이 활성 배너를 받는다. (팝업의 PopupUserService와 동일 패턴)
 */
class BannerUserService extends UserService {
  constructor() {
    super('/banners');
  }

  /** 메인화면 노출 배너 목록 */
  async getReflectedBanners(config?: AxiosRequestConfig): Promise<Banner[]> {
    return this.get<Banner[]>('/reflected', config);
  }
}

export const bannerService = new BannerUserService();
