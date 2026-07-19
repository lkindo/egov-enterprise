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
   * @param params { yearMonth: 'yyyyMM' } — ⚠ 하이픈 없는 6자여야 한다.
   *   ScheduleRepository.findMonthlySchedules 가 CONCAT(:yearMonth,'01') / CONCAT(:yearMonth,'31') 로
   *   varchar(8) 'yyyyMMdd' 컬럼과 문자열 비교하므로, 'yyyy-MM' 을 보내면 예외 없이 조용히 0건이 된다.
   * @returns 일정 배열 (PageResponse 봉투가 아니라 배열이 그대로 온다)
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
   * @param schedule 일정 정보. 날짜(schdlBgngYmd/schdlEndYmd)는 'yyyyMMdd' 8자여야 한다(@Size(max=8)).
   *   schdlId(PK)와 schdlPicId(담당자)는 보내지 않아도 된다 — 서버가 채번하고 인증 주체로 고정한다.
   * @returns 생성된 일정의 **ID 문자열** (백엔드는 ApiResponse<String> 을 반환한다. 종전 선언인
   *   Promise<DeptSchedule> 은 런타임 값과 어긋난 거짓 타입이었고 패스스루라 컴파일러가 잡지 못했다.)
   */
  public async createDeptSchedule(schedule: Partial<DeptSchedule>): Promise<string> {
    return this.post<string>('', schedule);
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
