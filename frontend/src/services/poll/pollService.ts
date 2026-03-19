import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';
import { OnlinePollManageVO, OnlinePollItemVO, OnlinePollPartcptnVO, PollSearchParams } from '@/types/poll';
import { AxiosRequestConfig } from 'axios';

/**
 * 온라인 설문(Poll) 서비스
 * 
 * NOTE: 이 서비스는 레거시 .do 서버 엔드포인트를 호출하는 과도기적 스펙을 유지하고 있습니다.
 * 점진적으로 AdminService 기반의 RESTful 환경으로 이행할 예정입니다.
 */
class PollService extends ApiService {
 constructor() {
 super('/uss/olp/opm');
 }

 /** 설문 목록 조회 */
 async getPollList(params: PollSearchParams, config?: AxiosRequestConfig): Promise<PageResponse<OnlinePollManageVO>> {
 return this.get<PageResponse<OnlinePollManageVO>>('/listOnlinePollManage.do', { ...config, params });
 }

 /** 설문 상세 조회 */
 async getPollDetail(pollId: string, config?: AxiosRequestConfig): Promise<OnlinePollManageVO> {
 return this.get<OnlinePollManageVO>(`/detailOnlinePollManage.do`, { ...config, params: { pollId } });
 }

 /** 설문 등록 */
 async createPoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/registOnlinePollManage.do', poll, config);
 }

 /** 설문 수정 */
 async updatePoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/updtOnlinePollManage.do', poll, config);
 }

 /** 설문 삭제 */
 async deletePoll(pollId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.post(`/detailOnlinePollManage.do`, null, { ...config, params: { cmd: 'del', pollId } });
 }

 /** 설문 항목 목록 조회 */
 async getPollItemList(pollId: string, config?: AxiosRequestConfig): Promise<OnlinePollItemVO[]> {
 return this.get<OnlinePollItemVO[]>(`/listOnlinePollItem.do`, { ...config, params: { pollId } });
 }

 /** 설문 항목 등록 */
 async createPollItem(item: Partial<OnlinePollItemVO>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/registOnlinePollItem.do', item, config);
 }

 /** 설문 항목 수정 */
 async updatePollItem(item: Partial<OnlinePollItemVO>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/updtOnlinePollItem.do', item, config);
 }

 /** 설문 항목 삭제 */
 async deletePollItem(pollId: string, pollIemId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.post(`/delOnlinePollItem.do`, null, { ...config, params: { pollId, pollIemId } });
 }

 /** 설문 참여 */
 async participatePoll(participation: OnlinePollPartcptnVO, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/uss/olp/opp/registOnlinePollPartcptn.do'.replace('/uss/olp/opm', ''), participation, config); // Base path override hack if needed, or just use absolute
 }

 /** 설문 통계 결과 조회 */
 async getPollResult(pollId: string, config?: AxiosRequestConfig): Promise<any> {
 return this.get('/uss/olp/opp/egovOnlinePollManageStatistics.do'.replace('/uss/olp/opm', ''), { ...config, params: { pollId } });
 }
}

export const pollService = new PollService();

// Backward compatibility exports
export const getPollList = pollService.getPollList.bind(pollService);
export const getPollDetail = pollService.getPollDetail.bind(pollService);
export const createPoll = pollService.createPoll.bind(pollService);
export const updatePoll = pollService.updatePoll.bind(pollService);
export const deletePoll = pollService.deletePoll.bind(pollService);
export const getPollItemList = pollService.getPollItemList.bind(pollService);
export const createPollItem = pollService.createPollItem.bind(pollService);
export const updatePollItem = pollService.updatePollItem.bind(pollService);
export const deletePollItem = pollService.deletePollItem.bind(pollService);
export const participatePoll = pollService.participatePoll.bind(pollService);
export const getPollResult = pollService.getPollResult.bind(pollService);
