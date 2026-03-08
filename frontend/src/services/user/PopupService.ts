import { UserService } from '@/services/core/ApiService';
import { Popup } from '@/types/banner';

class PopupUserService extends UserService {
    constructor() {
        super('/popups');
    }

    /**
     * ??뽮쉐 ??밸씜 筌뤴뫖以?鈺곌퀬??
     * ????뺣궖??嚥≪뮄????????⑤벊???癒?퐣 ?紐꾪뀱??몃빍??
     */
    async getActivePopups(config?: any) {
        return this.get<any>('/active', config);
    }

    /**
     * ?諭????밸씜 ?怨멸쉭 鈺곌퀬??
     */
    async getPopup(popupId: string, config?: any) {
        return this.get<any>(`/${popupId}`, config);
    }
}

export const popupService = new PopupUserService();
