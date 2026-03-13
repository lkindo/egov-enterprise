import { AdminService } from '@/services/core/ApiService';
import { SearchParams } from '@/types/system';

export interface GroupInfo {
    groupId: string;
    groupNm: string;
    groupDc?: string;
    groupCreatDe?: string;
}

/**
 * 사용자 그룹 관리 서비스 (Admin)
 */
class GroupAdminService extends AdminService {
    constructor() {
        super('/groups');
    }

    /** 그룹 목록 조회 */
    async getGroupList(params?: SearchParams, config?: any) {
        const response = await this.get<any>('', { ...config, params });
        return response?.result || response;
    }

    /** 그룹 상세 조회 */
    async getGroup(groupId: string, config?: any) {
        const response = await this.get<any>(`/${groupId}`, config);
        return response?.result || response;
    }

    /** 그룹 등록 */
    async createGroup(data: Partial<GroupInfo>, config?: any) {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 그룹 수정 */
    async updateGroup(groupId: string, data: Partial<GroupInfo>, config?: any) {
        const response = await this.put<any>(`/${groupId}`, data, config);
        return response?.result || response;
    }

    /** 그룹 삭제 */
    async deleteGroup(groupId: string, config?: any) {
        const response = await this.delete<any>(`/${groupId}`, config);
        return response?.result || response;
    }
}

export const groupAdminService = new GroupAdminService();
