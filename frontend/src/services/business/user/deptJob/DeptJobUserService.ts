import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import {
  type DeptJobBoxInput,
  type DeptJobBxVO,
  type DeptJobInput,
  type DeptJobVO,
} from '@/types/business/deptJob';
import { AxiosRequestConfig } from 'axios';
import {
  createDeptJobBoxOperation,
  createDeptJobOperation,
  deleteDeptJobBoxOperation,
  deleteDeptJobOperation,
  getDeptJobBoxListOperation,
  getDeptJobBoxOperation,
  getDeptJobListOperation,
  getDeptJobOperation,
  reassignDeptJobOperation,
  updateDeptJobBoxOperation,
  updateDeptJobOperation,
} from '@/types/generated-operations';

/**
 * 부서업무 관리 서비스(User)
 * 백엔드 DeptJobApiController 연동 (/api/v1/dept-jobs)
 */
class DeptJobUserService extends ApiService {
  /**
   * 부서 업무함 목록 조회
   */
  async getDeptJobBoxes(
    params: { 
      /** 1부터 세는 페이지 번호(ADR-0036). */
      page?: number; 
      size?: number; 
      searchWrd?: string;
      deptId?: string;
    }, 
    config?: AxiosRequestConfig
  ): Promise<PageResponse<DeptJobBxVO>> {
    return this.executeGenerated(getDeptJobBoxListOperation, {
      query: {
        ...(params.page !== undefined ? { page: params.page } : {}),
        ...(params.size !== undefined ? { size: params.size } : {}),
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
  async createDeptJobBox(data: DeptJobBoxInput, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(createDeptJobBoxOperation, {
      body: data,
      config,
    });
  }

  /**
   * 부서 업무함 수정
   */
  async updateDeptJobBox(deptTaskBoxSn: number, data: DeptJobBoxInput, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateDeptJobBoxOperation, {
      path: { deptTaskBoxSn },
      body: data,
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
      /** 1부터 세는 페이지 번호(ADR-0036) */
      page?: number;
      /** 페이지당 건수 */
      size?: number;
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
    // [ADR-0036] 서버가 다른 목록과 같은 page(1부터)·size 를 받는다 — 종전 pageIndex·pageUnit 이름을 걷었다.
    return this.executeGenerated(getDeptJobListOperation, {
      query: {
        page: params.page ?? 1,
        size: params.size ?? 10,
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
  async createDeptJob(data: DeptJobInput, config?: AxiosRequestConfig): Promise<number> {
    // 서버가 채번한 식별자를 돌려준다(등록 직후 상세로 이동하기 위해 필요).
    return this.executeGenerated(createDeptJobOperation, {
      body: data,
      config,
    });
  }

  /**
   * 부서 업무 수정
   */
  async updateDeptJob(deptTaskSn: number, data: DeptJobInput, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateDeptJobOperation, {
      path: { deptTaskSn },
      body: data,
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

  /**
   * 담당자만 다시 지정한다(2026-10-01 결정 22). 등록자는 맡긴 업무의 담당자를 바꿀 수 있지만 내용은 고칠 수 없다.
   * picId 는 esntlId 다(로그인 ID 가 아니다).
   */
  async reassignDeptJob(deptTaskSn: number, picId: string, version: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(reassignDeptJobOperation, {
      path: { deptTaskSn },
      body: { picId, version },
      config,
    });
  }
}

export const deptJobUserService = new DeptJobUserService();
