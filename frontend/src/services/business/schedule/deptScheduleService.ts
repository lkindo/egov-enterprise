import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { DeptSchedule, ScheduleSearchParams } from '@/types/business/schedule';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
  createScheduleOperation,
  deleteScheduleOperation,
  getDeptScheduleListOperation,
  getMonthlyScheduleOperation,
  getScheduleByDateRangeOperation,
  getScheduleOperation,
  updateScheduleOperation,
} from '@/types/generated-operations';

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
    const pageIndex = params.pageIndex ?? params.pageNo;
    return this.executeGenerated(getDeptScheduleListOperation, {
      query: {
        ...(pageIndex !== undefined ? { pageIndex } : {}),
        ...(params.size !== undefined ? { pageUnit: params.size } : {}),
        ...(params.schdlNm !== undefined ? { schdlNm: params.schdlNm } : {}),
      },
    }) as Promise<PageResponse<DeptSchedule>>;
  }

  /**
   * 월별 일정 데이터 조회
   * @param params { yearMonth: 'yyyyMM' } — ⚠ 하이픈 없는 6자여야 한다.
   *   ScheduleRepository.findMonthlySchedules 가 CONCAT(:yearMonth,'01') / CONCAT(:yearMonth,'31') 로
   *   varchar(8) 'yyyyMMdd' 컬럼과 문자열 비교하므로, 'yyyy-MM' 을 보내면 예외 없이 조용히 0건이 된다.
   * @returns 일정 배열 (PageResponse 봉투가 아니라 배열이 그대로 온다)
   */
  public async getDeptScheduleMonthList(params: { yearMonth: string }): Promise<DeptSchedule[]> {
    return this.executeGenerated(getMonthlyScheduleOperation, { query: params }) as Promise<DeptSchedule[]>;
  }

  /**
   * 기간 내 일정 조회
   * @param startDate 시작일
   * @param endDate 종료일
   * @returns 일정 배열
   */
  public async getDeptScheduleByRange(startDate: string, endDate: string): Promise<DeptSchedule[]> {
    return this.executeGenerated(getScheduleByDateRangeOperation, {
      query: { startDate, endDate },
    }) as Promise<DeptSchedule[]>;
  }

  /**
   * 일정 상세 조회
   * @param schdlSn 일정 일련번호
   * @returns 일정 상세 정보
   */
  public async getDeptSchedule(schdlSn: number): Promise<DeptSchedule> {
    return this.executeGenerated(getScheduleOperation, {
      path: { schdlSn },
    }) as Promise<DeptSchedule>;
  }

  /**
   * 일정 등록
   * @param schedule 일정 정보. 날짜(schdlBgngYmd/schdlEndYmd)는 'yyyyMMdd' 8자여야 한다(@Size(max=8)).
   *   schdlSn(PK)과 schdlPicId(담당자)는 보내지 않아도 된다 — DB가 채번하고 서버가 인증 주체로 고정한다.
   * @returns 생성된 일정의 숫자 일련번호
   */
  public async createDeptSchedule(schedule: Partial<DeptSchedule>): Promise<number> {
    return this.executeGenerated(createScheduleOperation, {
      body: schedule as GeneratedOperationRequest<'createSchedule'>,
    });
  }

  /**
   * 일정 수정
   * @param schdlSn 일정 일련번호
   * @param schedule 수정할 일정 정보
   */
  public async updateDeptSchedule(schdlSn: number, schedule: Partial<DeptSchedule>): Promise<void> {
    return this.executeGenerated(updateScheduleOperation, {
      path: { schdlSn },
      body: schedule as GeneratedOperationRequest<'updateSchedule'>,
    });
  }

  /**
   * 일정 삭제
   * @param schdlSn 일정 일련번호
   */
  public async deleteDeptSchedule(schdlSn: number): Promise<void> {
    return this.executeGenerated(deleteScheduleOperation, {
      path: { schdlSn },
    });
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
