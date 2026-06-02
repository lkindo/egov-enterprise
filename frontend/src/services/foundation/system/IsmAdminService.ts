import { ApiService, AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface InfrmlSanctn {
 infrmlSanctnId: string;
 jobSe?: string;
 jobSeCode: string;
 applcntId: string;
 confmrerId?: string;
 sanctnerId?: string;
 confmAt: 'Y' | 'N' | 'R' | 'A';
 sancltNm: string;
 returnResn?: string;
 reqstDe?: string;
 frstRgtrId?: string;
 lastMdfrId?: string;
}

/**
 * 약식결재(Informal Sanction) 관리 서비스(Admin)
 */
class IsmAdminService extends ApiService {
  constructor() {
    super('admin/system/ism');
  }

  /** 대기 신청 목록 조회 */
  async getPendingList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<InfrmlSanctn>> {
    return this.get<PageResponse<InfrmlSanctn>>('', { ...config, params: { ...params, type: 'received' } });
  }

  /** 신청 내역 목록 조회 */
  async getHistoryList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<InfrmlSanctn>> {
    return this.get<PageResponse<InfrmlSanctn>>('', { ...config, params });
  }

 /** 신청 상세 조회 */
 async getInfrmlSanctn(id: string, config?: AxiosRequestConfig): Promise<InfrmlSanctn> {
 return this.get<InfrmlSanctn>(`/${id}`, config);
 }

 /** 신청 등록 */
 async createInfrmlSanctn(data: Partial<InfrmlSanctn>, config?: AxiosRequestConfig): Promise<InfrmlSanctn> {
 return this.post<InfrmlSanctn>('', data, config);
 }

 /** 신청 수정 */
 async updateInfrmlSanctn(id: string, data: Partial<InfrmlSanctn>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

  /** 신청 승인/반려 */
  async confirmInfrmlSanctn(id: string, status: string, reason?: string, config?: AxiosRequestConfig): Promise<void> {
    return this.patch(`/${id}/confirm`, null, { 
      ...config, 
      params: { 
        confmAt: status === 'C' ? 'Y' : 'R', // Controller expects 'Y' or 'R'
        returnResn: reason 
      } 
    });
  }

 /** 신청 삭제 */
 async deleteInfrmlSanctn(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, config);
 }
}

export const ismAdminService = new IsmAdminService();
