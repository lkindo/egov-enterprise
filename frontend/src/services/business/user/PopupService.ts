import { UserService } from '@/services/core/ApiService';
import { Popup } from '@/types/foundation/banner';
import { AxiosRequestConfig } from 'axios';

/**
 * ?앹뾽 ?쒕퉬님(User)
 */
class PopupUserService extends UserService {
 constructor() {
 super('/popups');
 }

 /**
 * 현재 활성 ?앹뾽 紐⑸줉 조회
 * 寃뚯떆 湲곌컙님현재 ?ы븿님怨듯넻 ?앹뾽?ㅼ쓣 諛섑솚?⑸땲님
 */
 async getActivePopups(config?: AxiosRequestConfig): Promise<Popup[]> {
 return this.get<Popup[]>('/active', config);
 }

 /**
 * ?뱀젙 ?앹뾽 ?곸꽭 조회
 */
 async getPopup(popupId: string, config?: AxiosRequestConfig): Promise<Popup> {
 return this.get<Popup>(`/${popupId}`, config);
 }
}

export const popupService = new PopupUserService();
