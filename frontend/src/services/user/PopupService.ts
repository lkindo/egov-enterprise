import { UserService } from '@/services/core/ApiService';
import { Popup } from '@/types/banner';
import { AxiosRequestConfig } from 'axios';

/**
 * 팝업 서비스 (User)
 */
class PopupUserService extends UserService {
 constructor() {
 super('/popups');
 }

 /**
 * 현재 활성 팝업 목록 조회
 * 게시 기간이 현재 포함된 공통 팝업들을 반환합니다.
 */
 async getActivePopups(config?: AxiosRequestConfig): Promise<Popup[]> {
 return this.get<Popup[]>('/active', config);
 }

 /**
 * 특정 팝업 상세 조회
 */
 async getPopup(popupId: string, config?: AxiosRequestConfig): Promise<Popup> {
 return this.get<Popup>(`/${popupId}`, config);
 }
}

export const popupService = new PopupUserService();
