import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { OnlinePollManageVO, OnlinePollItemVO, OnlinePollPartcptnVO, PollSearchParams } from '@/types/business/poll';
import { AxiosRequestConfig } from 'axios';

/**
 * ?⑤씪님설문(Poll) ?쒕퉬님 * 
 * NOTE: 님?쒕퉬?ㅻ뒗 ?덇굅님.do ?쒕쾭 ?붾뱶?ъ씤?몃? ?몄텧?섎뒗 怨쇰룄湲곗쟻 ?ㅽ럺님?좎님섍퀬 ?덉뒿?덈떎.
 * ?먯쭊?곸쑝濡?AdminService 湲곕컲님RESTful ?섍꼍?쇰줈 ?댄뻾님?덉젙?낅땲님
 */
class PollService extends ApiService {
 constructor() {
 super('/uss/olp/opm');
 }

 /** 설문 紐⑸줉 조회 */
 async getPollList(params: PollSearchParams, config?: AxiosRequestConfig): Promise<PageResponse<OnlinePollManageVO>> {
 return this.get<PageResponse<OnlinePollManageVO>>('/listOnlinePollManage.do', { ...config, params });
 }

 /** 설문 ?곸꽭 조회 */
 async getPollDetail(pollId: string, config?: AxiosRequestConfig): Promise<OnlinePollManageVO> {
 return this.get<OnlinePollManageVO>(`/detailOnlinePollManage.do`, { ...config, params: { pollId } });
 }

 /** 설문 등록 */
 async createPoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/registOnlinePollManage.do', poll, config);
 }

 /** 설문 ?섏젙 */
 async updatePoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/updtOnlinePollManage.do', poll, config);
 }

 /** 설문 님젣 */
 async deletePoll(pollId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.post(`/detailOnlinePollManage.do`, null, { ...config, params: { cmd: 'del', pollId } });
 }

 /** 설문 님ぉ 紐⑸줉 조회 */
 async getPollItemList(pollId: string, config?: AxiosRequestConfig): Promise<OnlinePollItemVO[]> {
 return this.get<OnlinePollItemVO[]>(`/listOnlinePollItem.do`, { ...config, params: { pollId } });
 }

 /** 설문 님ぉ 등록 */
 async createPollItem(item: Partial<OnlinePollItemVO>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/registOnlinePollItem.do', item, config);
 }

 /** 설문 님ぉ ?섏젙 */
 async updatePollItem(item: Partial<OnlinePollItemVO>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/updtOnlinePollItem.do', item, config);
 }

 /** 설문 님ぉ 님젣 */
 async deletePollItem(pollId: string, pollIemId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.post(`/delOnlinePollItem.do`, null, { ...config, params: { pollId, pollIemId } });
 }

 /** 설문 李몄뿬 */
 async participatePoll(participation: OnlinePollPartcptnVO, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/uss/olp/opp/registOnlinePollPartcptn.do'.replace('/uss/olp/opm', ''), participation, config); // Base path override hack if needed, or just use absolute
 }

  /** 설문 통계 寃곌낵 조회 */
  async getPollResult(pollId: string, config?: AxiosRequestConfig): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>('/uss/olp/opp/egovOnlinePollManageStatistics.do'.replace('/uss/olp/opm', ''), { ...config, params: { pollId } });
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
