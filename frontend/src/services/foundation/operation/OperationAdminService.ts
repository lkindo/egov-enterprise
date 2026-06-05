import { ApiService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

interface ExternalHr {
 extrlUserId: string;
 ncrdId: string;
 extrlUserNm: string;
 cmpnyNm: string;
 deptNm: string;
 emailAdres: string;
 telno: string;
 mbtlnum: string;
 crtDt?: string;
}

interface Reward {
 rewardId: string;
 rewardNm: string;
 rewardDe: string;
 rewardLevel: string;
 rewardCn: string;
 crtDt?: string;
}

/**
 * ?댁쁺吏님관리님쒕퉬님(Admin)
 */
class OperationAdminService extends ApiService {
 constructor() {
 super('/admin/operation');
 }

 /**
 * ?몃님몄궗정보 목록 조회
 */
 async getExternalHrList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<ExternalHr>> {
 return this.get<PageResponse<ExternalHr>>('/external-hr', { ...config, params });
 }

 /**
 * ?몃님몄궗정보 등록
 */
 async createExternalHr(data: Partial<ExternalHr>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/external-hr', data, config);
 }

 /**
 * ъ긽 목록 조회
 */
 async getRewardList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Reward>> {
 return this.get<PageResponse<Reward>>('/rewards', { ...config, params });
 }

 /**
 * ъ긽 정보 등록
 */
 async createReward(data: Partial<Reward>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/rewards', data, config);
 }
}

export const operationAdminService = new OperationAdminService();
