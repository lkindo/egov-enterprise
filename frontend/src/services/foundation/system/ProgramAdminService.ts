import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

import { Program } from '@/types/foundation/program';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
 createProgramOperation,
 deleteProgramOperation,
 getProgramListOperation,
 getProgramOperation,
 updateProgramOperation,
} from '@/types/generated-operations';

/**
 * 프로그램 관리 서비스 (Admin)
 */
class ProgramAdminService extends AdminService {
 constructor() {
 super('/programs');
 }

 /** 프로그램 목록 조회 */
 async getProgramList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Program>> {
 const pageIndex = params?.pageIndex
 ?? params?.pageNo
 ?? (params?.page !== undefined ? params.page + 1 : undefined);
 const pageUnit = params?.pageUnit
 ?? params?.size
 ?? (typeof params?.pageSize === 'number' ? params.pageSize : undefined);
 const generatedConfig = config ? { ...config } : undefined;
 if (generatedConfig) delete generatedConfig.params;
 return this.executeGenerated(getProgramListOperation, {
 query: {
 ...(pageIndex !== undefined ? { pageIndex } : {}),
 ...(pageUnit !== undefined ? { pageUnit } : {}),
 ...(params?.searchCondition !== undefined ? { searchCondition: params.searchCondition } : {}),
 searchKeyword: params?.searchKeyword || params?.searchWrd || '',
 },
 config: generatedConfig,
 }) as Promise<PageResponse<Program>>;
 }

  /** 프로그램 상세 조회 */
 async getProgram(progrmFileNm: string, config?: AxiosRequestConfig): Promise<Program> {
 return this.executeGenerated(getProgramOperation, {
 path: { progrmFileNm },
 config,
 }) as Promise<Program>;
 }

  /** 프로그램 등록 */
 async createProgram(data: Partial<Program>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(createProgramOperation, {
 body: data as GeneratedOperationRequest<'createProgram'>,
 config,
 });
 }

  /** 프로그램 수정 */
 async updateProgram(progrmFileNm: string, data: Partial<Program>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(updateProgramOperation, {
 path: { progrmFileNm },
 body: data as GeneratedOperationRequest<'updateProgram'>,
 config,
 });
 }

  /** 프로그램 삭제 */
 async deleteProgram(progrmFileNm: string, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(deleteProgramOperation, {
 path: { progrmFileNm },
 config,
 });
 }
}

export const programAdminService = new ProgramAdminService();
