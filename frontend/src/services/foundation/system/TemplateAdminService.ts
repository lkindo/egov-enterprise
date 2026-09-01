import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import type { components } from '@/types/generated-api';
import {
  insertTmplatInfoOperation,
  selectTmplatInfoDetailOperation,
  selectTmplatInfoListOperation,
} from '@/types/generated-operations';

/**
 * 템플릿 정보.
 *
 * [2026-08-29] 종전에는 같은 모양을 여기서 다시 선언했고, 그 사본에서 `tmpltId` 가
 * **선택 필드**였다. 실제로는 PK 이자 NOT NULL 이라 값 없이 보내면 등록이 항상 실패한다 —
 * 사본이 서버 계약보다 느슨해서 화면이 "안 보내도 되는 값" 으로 취급했다.
 * FE 헌법대로 생성 타입을 SSOT 로 되돌린다.
 */
export type TmplatInfo = components['schemas']['TemplateDto'];

class TemplateAdminService extends AdminService {
  constructor() {
    super('/templates');
  }

  /** 템플릿목록 조회 */
  async getTemplateList(config?: AxiosRequestConfig) {
    return this.executeGenerated(selectTmplatInfoListOperation, { config });
  }

  /** 템플릿 상세 조회 */
  async getTemplate(tmpltId: string, config?: AxiosRequestConfig) {
    return this.executeGenerated(selectTmplatInfoDetailOperation, {
      path: { tmpltId },
      config,
    });
  }

  /** 템플릿등록 */
  async createTemplate(tmplatInfo: TmplatInfo, config?: AxiosRequestConfig) {
    return this.executeGenerated(insertTmplatInfoOperation, { body: tmplatInfo, config });
  }
}

export const templateAdminService = new TemplateAdminService();
