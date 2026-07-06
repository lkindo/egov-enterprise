import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { DeptSchedule, ScheduleSearchParams } from '@/types/business/schedule';

/**
 * 부서 일정 관리 서비스
 * 백엔드 ScheduleApiController (business-suite)와 연동
 */
class DeptScheduleService extends ApiService {
  constructor() {
    super('/schedules');
  }

  /**
   * 부서 일정 목록 조회
   * @param params 검색 파라미터
   * @returns 일정 페이지 결과
   */
  public async getDeptScheduleList(params: ScheduleSearchParams = {}): Promise<PageResponse<DeptSchedule>> {
    return this.get<PageResponse<DeptSchedule>>('/dept', { params });
  }

  /**
   * 월별 일정 데이터 조회
   * @param params { yearMonth: 'YYYY-MM' }
   * @returns 일정 배열
   */
  public async getDeptScheduleMonthList(params: { yearMonth: string }): Promise<DeptSchedule[]> {
    return this.get<DeptSchedule[]>('/monthly', { params });
  }

  /**
   * 기간 내 일정 조회
   * @param startDate 시작일
   * @param endDate 종료일
   * @returns 일정 배열
   */
  public async getDeptScheduleByRange(startDate: string, endDate: string): Promise<DeptSchedule[]> {
    return this.get<DeptSchedule[]>('/range', { params: { startDate, endDate } });
  }

  /**
   * 일정 상세 조회
   * @param id 일정 ID
   * @returns 일정 상세 정보
   */
  public async getDeptSchedule(id: string): Promise<DeptSchedule> {
    return this.get<DeptSchedule>(`/${id}`);
  }

  /**
   * 일정 등록
   * @param schedule 일정 정보
   * @returns 생성된 일정 정보
   */
  public async createDeptSchedule(schedule: Partial<DeptSchedule>): Promise<DeptSchedule> {
    return this.post<DeptSchedule>('', schedule);
  }

  /**
   * 일정 수정
   * @param id 일정 ID
   * @param schedule 수정할 일정 정보
   */
  public async updateDeptSchedule(id: string, schedule: Partial<DeptSchedule>): Promise<void> {
    return this.put<void>(`/${id}`, schedule);
  }

  /**
   * 일정 삭제
   * @param id 일정 ID
   */
  public async deleteDeptSchedule(id: string): Promise<void> {
    return this.delete<void>(`/${id}`);
  }
}

export const deptScheduleService = new DeptScheduleService();

export const getDeptScheduleList = deptScheduleService.getDeptScheduleList.bind(deptScheduleService);
export const getDeptScheduleMonthList = deptScheduleService.getDeptScheduleMonthList.bind(deptScheduleService);
export const getDeptScheduleByRange = deptScheduleService.getDeptScheduleByRange.bind(deptScheduleService);
export const getDeptSchedule = deptScheduleService.getDeptSchedule.bind(deptScheduleService);
export const createDeptSchedule = deptScheduleService.createDeptSchedule.bind(deptScheduleService);
export const updateDeptSchedule = deptScheduleService.updateDeptSchedule.bind(deptScheduleService);
export const deleteDeptSchedule = deptScheduleService.deleteDeptSchedule.bind(deptScheduleService);
