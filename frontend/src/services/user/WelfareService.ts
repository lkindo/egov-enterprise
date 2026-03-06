import { ApiService } from '@/services/core/ApiService';

export interface WelfareReward {
    rwardId: string;
    rwardNm: string;
    rwardDe: string;
    rwardKnd: string;
    userNm: string;
    rwardCn: string;
}

export interface Ctsnn {
    ctsnnId: string;
    ctsnnNm: string;
    ctsnnDe: string;
    ctsnnCode: string; // 1:결혼, 2:부고..
    userNm: string;
    trgetNm: string;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}

class WelfareService extends ApiService {
    constructor() {
        super('/uss/ion');
    }

    async getRewards(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<WelfareReward>> {
        return this.get<PageResult<WelfareReward>>('/rewards', { params });
    }

    async getCtsnns(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<Ctsnn>> {
        return this.get<PageResult<Ctsnn>>('/ctsnn', { params });
    }
}

export const welfareService = new WelfareService();
