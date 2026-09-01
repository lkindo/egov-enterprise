import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { DeptJobVO, DeptJobBxVO } from '@/types/business/deptJob';
import { AxiosRequestConfig } from 'axios';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
  createDeptJobBoxOperation,
  createDeptJobOperation,
  deleteDeptJobBoxOperation,
  deleteDeptJobOperation,
  getDeptJobBoxListOperation,
  getDeptJobBoxOperation,
  getDeptJobListOperation,
  getDeptJobOperation,
  updateDeptJobBoxOperation,
  updateDeptJobOperation,
} from '@/types/generated-operations';

/**
 * 부서업무 관리 서비스(User)
 * 백엔드 DeptJobApiController 연동 (/api/v1/dept-jobs)
 */
class DeptJobUserService extends UserService {
  constructor() {
    super('/dept-jobs');
  }

  /**
   * 부서 업무함 목록 조회
   */
  async getDeptJobBoxes(
    params: { 
      page?: number; 
      size?: number; 
      searchWrd?: string;
      deptId?: string;
    }, 
    config?: AxiosRequestConfig
  ): Promise<PageResponse<DeptJobBxVO>> {
    return this.executeGenerated(getDeptJobBoxListOperation, {
      query: {
        ...(params.page !== undefined ? { pageIndex: params.page + 1 } : {}),
        ...(params.size !== undefined ? { pageUnit: params.size } : {}),
        ...(params.searchWrd !== undefined ? { searchWrd: params.searchWrd } : {}),
        ...(params.deptId !== undefined ? { deptId: params.deptId } : {}),
      },
      config,
    }) as Promise<PageResponse<DeptJobBxVO>>;
  }

  /**
   * 부서 업무함 상세 조회
   */
  async getDeptJobBox(deptTaskBoxSn: number, config?: AxiosRequestConfig): Promise<DeptJobBxVO> {
    return this.executeGenerated(getDeptJobBoxOperation, {
      path: { deptTaskBoxSn },
      config,
    }) as Promise<DeptJobBxVO>;
  }

  /**
   * 부서 업무함 등록
   */
  async createDeptJobBox(data: Partial<DeptJobBxVO>, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(createDeptJobBoxOperation, {
      body: data as GeneratedOperationRequest<'createDeptJobBox'>,
      config,
    });
  }

  /**
   * 부서 업무함 수정
   */
  async updateDeptJobBox(deptTaskBoxSn: number, data: Partial<DeptJobBxVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateDeptJobBoxOperation, {
      path: { deptTaskBoxSn },
      body: data as GeneratedOperationRequest<'updateDeptJobBox'>,
      config,
    });
  }

  /**
   * 부서 업무함 삭제
   */
  async deleteDeptJobBox(deptTaskBoxSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteDeptJobBoxOperation, {
      path: { deptTaskBoxSn },
      config,
    });
  }

  /**
   * 부서 업무 목록 조회
   */
  async getDeptJobList(
    params: {
      /** 1-based 페이지 번호 */
      pageIndex?: number;
      /** 페이지당 건수 */
      pageUnit?: number;
      searchWrd?: string;
      /**
       * '0' 업무명 · '1' 업무내용 · '2' 담당자ID.
       *
       * ⚠ [2026-08-29 정정] 종전 주석은 "미지정 시 서버가 업무명으로 처리한다" 였는데
       * **사실이 아니다.** DeptJobService 는 조건이 위 셋 중 하나일 때만 술어를 붙이고,
       * 미지정이면 아무것도 거르지 않는다 — 즉 검색어를 넣어도 전체 목록이 돌아온다.
       * 이 잘못된 주석 때문에 호출부가 조건을 생략한 채로 남아 있었다.
       * 검색을 의도하면 반드시 조건을 함께 보낸다.
       */
      searchCondition?: string;
      deptTaskBoxSn?: number;
      deptId?: string;
      /**
       * 소유 스코프. 'mine'(기본) = 내가 담당자인 업무만, 'dept' = 부서 전체.
       * 서버도 미지정 시 'mine' 으로 해석하지만, 의도가 드러나도록 항상 명시해 보낸다
       * (서버 기본값이 바뀌어도 화면 토글 상태가 그대로 반영되게).
       */
      scope?: 'mine' | 'dept';
    },
    config?: AxiosRequestConfig
  ): Promise<PageResponse<DeptJobVO>> {
    // ⚠ page/size 로 보내지 않는다. ApiService 의 자동 매핑은 size → recordCountPerPage 인데
    //   이 엔드포인트(및 형제 /boxes)는 pageUnit 을 읽으므로, 자동 매핑에 기대면 페이지 크기가
    //   조용히 무시되고 서버 기본값 10건에 고정된다. 서버가 실제로 읽는 이름으로 직접 보낸다.
    return this.executeGenerated(getDeptJobListOperation, {
      query: {
        pageIndex: params.pageIndex ?? 1,
        pageUnit: params.pageUnit ?? 10,
        scope: params.scope ?? 'mine',
        ...(params.searchWrd ? { searchWrd: params.searchWrd } : {}),
        ...(params.searchCondition ? { searchCondition: params.searchCondition } : {}),
        ...(params.deptTaskBoxSn ? { deptTaskBoxSn: params.deptTaskBoxSn } : {}),
        ...(params.deptId ? { deptId: params.deptId } : {}),
      },
      config,
    }) as Promise<PageResponse<DeptJobVO>>;
  }

  /**
   * 부서 업무 상세 조회
   */
  async getDeptJob(deptTaskSn: number, config?: AxiosRequestConfig): Promise<DeptJobVO> {
    return this.executeGenerated(getDeptJobOperation, {
      path: { deptTaskSn },
      config,
    }) as Promise<DeptJobVO>;
  }

  /**
   * 부서 업무 등록
   */
  async createDeptJob(data: Partial<DeptJobVO>, config?: AxiosRequestConfig): Promise<number> {
    // 서버가 채번한 식별자를 돌려준다(등록 직후 상세로 이동하기 위해 필요).
    return this.executeGenerated(createDeptJobOperation, {
      body: data as GeneratedOperationRequest<'createDeptJob'>,
      config,
    });
  }

  /**
   * 부서 업무 수정
   */
  async updateDeptJob(deptTaskSn: number, data: Partial<DeptJobVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateDeptJobOperation, {
      path: { deptTaskSn },
      body: data as GeneratedOperationRequest<'updateDeptJob'>,
      config,
    });
  }

  /**
   * 부서 업무 삭제
   */
  async deleteDeptJob(deptTaskSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteDeptJobOperation, {
      path: { deptTaskSn },
      config,
    });
  }
}

export const deptJobUserService = new DeptJobUserService();

// Individual function exports for legacy/functional styles
export const getDeptJobBoxes = deptJobUserService.getDeptJobBoxes.bind(deptJobUserService);
export const getDeptJobBox = deptJobUserService.getDeptJobBox.bind(deptJobUserService);
export const createDeptJobBox = deptJobUserService.createDeptJobBox.bind(deptJobUserService);
export const updateDeptJobBox = deptJobUserService.updateDeptJobBox.bind(deptJobUserService);
export const deleteDeptJobBox = deptJobUserService.deleteDeptJobBox.bind(deptJobUserService);

export const getDeptJobList = deptJobUserService.getDeptJobList.bind(deptJobUserService);
export const getDeptJob = deptJobUserService.getDeptJob.bind(deptJobUserService);
export const createDeptJob = deptJobUserService.createDeptJob.bind(deptJobUserService);
export const updateDeptJob = deptJobUserService.updateDeptJob.bind(deptJobUserService);
export const deleteDeptJob = deptJobUserService.deleteDeptJob.bind(deptJobUserService);
