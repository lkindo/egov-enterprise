import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Popup } from '@/types/foundation/banner';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
  createPopupOperation,
  deletePopupOperation,
  getPopupOperation,
  getPopupsOperation,
  updatePopupOperation,
} from '@/types/generated-operations';

/**
 * 팝업李관리님쒕퉬님(Admin)
 */
class PopupAdminService extends AdminService {
  constructor() {
    super('/popups', 'system');
  }

  /** 팝업李목록 조회 */
  async getPopupList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Popup>> {
    const sort = Array.isArray(params?.sort)
      ? params.sort.filter((value): value is string => typeof value === 'string')
      : typeof params?.sort === 'string'
        ? [params.sort]
        : undefined;
    const generatedConfig = config ? { ...config } : undefined;
    if (generatedConfig) delete generatedConfig.params;
    return this.executeGenerated(getPopupsOperation, {
      query: {
        ...(params?.searchWrd !== undefined || params?.searchKeyword !== undefined || params?.keyword !== undefined
          ? { searchWrd: params.searchWrd ?? params.searchKeyword ?? params.keyword }
          : {}),
        ...(params?.page !== undefined ? { page: params.page } : {}),
        ...(params?.size !== undefined ? { size: params.size } : {}),
        ...(sort !== undefined ? { sort } : {}),
      },
      config: generatedConfig,
    }) as Promise<PageResponse<Popup>>;
  }

  /** 팝업李님곸꽭 조회 */
  async getPopup(popupSn: number, config?: AxiosRequestConfig): Promise<Popup> {
    return this.executeGenerated(getPopupOperation, {
      path: { popupSn },
      config,
    }) as Promise<Popup>;
  }

  /** 팝업李등록 */
  async createPopup(data: Partial<Popup>, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(createPopupOperation, {
      body: data as GeneratedOperationRequest<'createPopup'>,
      config,
    });
  }

  /** 팝업李님섏젙 */
  async updatePopup(popupSn: number, data: Partial<Popup>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updatePopupOperation, {
      path: { popupSn },
      body: data as GeneratedOperationRequest<'updatePopup'>,
      config,
    });
  }

  /** 팝업李님삭제 */
  async deletePopup(popupSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deletePopupOperation, {
      path: { popupSn },
      config,
    });
  }
}

export const popupAdminService = new PopupAdminService();
