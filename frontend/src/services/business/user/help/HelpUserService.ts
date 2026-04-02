import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface FAQ {
 faqId: string;
 qestnSj: string;
 qestnCn: string;
 answerCn: string;
 inqireCo: number;
 lastUpdusrPnttm: string;
}

export interface QNA {
 qaId: string;
 qestnSj: string;
 qestnCn: string;
 answerCn?: string;
 writngPassword?: string;
 wrterNm: string;
 writngDe: string;
 qnaProcessSttusCode: string; // 1: ?묒닔, 2: 泥섎━以 3: ?듬님꾨즺
}

/**
 * ?꾩留님쇳꽣 ?쒕퉬님(User)
 */
class HelpUserService extends UserService {
 constructor() {
 super('');
 }

 /** FAQ 紐⑸줉 조회 */
 async getFaqs(params: { searchWrd?: string }, config?: AxiosRequestConfig): Promise<FAQ[]> {
 // FAQ님蹂댄넻 ?꾩껜 紐⑸줉님媛몄삤님寃쎌슦媛 留롮쓬 (諛곌꼍 援ъ“님?곕씪 PageResponse님?섎룄 ?덉쑝님현재 UI님諛곗뿴 湲곕?)
 return this.get<FAQ[]>('/faqs', { ...config, params });
 }

 /** Q&A 紐⑸줉 조회 (?섏씠吏 */
 async getQnas(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<QNA>> {
 return this.get<PageResponse<QNA>>('/qnas', { ...config, params });
 }

 /** Q&A 등록 */
 async createQna(data: Partial<QNA>, config?: AxiosRequestConfig): Promise<void> {
 return this.post<void>('/qnas', data, config);
 }
}

export const helpUserService = new HelpUserService();
