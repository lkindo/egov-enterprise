import { ApiService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface ExternalHr {
 extrlUserId: string;
 ncrdId: string;
 extrlUserNm: string;
 cmpnyNm: string;
 deptNm: string;
 emailAdres: string;
 telno: string;
 mbtlnum: string;
 createdDate: string;
}

export interface Reward {
 rewardId: string;
 rewardNm: string;
 rewardDe: string;
 rewardLevel: string;
 rewardCn: string;
 createdDate: string;
}

/**
 * 운영지원 관리 서비스 (Admin)
 */
class OperationAdminService extends ApiService {
 constructor() {
 super('/admin/operation');
 }

 /**
 * 외부인사정보 목록 조회
 */
 async getExternalHrList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<ExternalHr>> {
 return this.get<PageResponse<ExternalHr>>('/external-hr', { ...config, params });
 }

 /**
 * 외부인사정보 등록
 */
 async createExternalHr(data: Partial<ExternalHr>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/external-hr', data, config);
 }

 /**
 * 포상 목록 조회
 */
 async getRewardList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Reward>> {
 return this.get<PageResponse<Reward>>('/rewards', { ...config, params });
 }

 /**
 * 포상 정보 등록
 */
 async createReward(data: Partial<Reward>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/rewards', data, config);
 }
}

export const operationAdminService = new OperationAdminService();
