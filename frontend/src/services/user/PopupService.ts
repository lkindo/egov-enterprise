import { UserService } from '@/services/core/ApiService';
import { Popup } from '@/types/banner';

class PopupUserService extends UserService {
    constructor() {
        super('/popups');
    }

    /**
     * 활성 팝업 목록 조회
     * 대시보드(로그인 전/후 공용)에서 호출됩니다.
     */
    async getActivePopups(config?: any) {
        return this.get<any>('/active', config);
    }

    /**
     * 특정 팝업 상세 조회
     */
    async getPopup(popupId: string, config?: any) {
        return this.get<any>(`/${popupId}`, config);
    }
}

export const popupService = new PopupUserService();
