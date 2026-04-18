import { consultAdminService } from '../admin/help/ConsultAdminService';
import { PaginationResponse } from '@/types/foundation/system';
import { CnsltVO, CnsltSearchParams } from '@/types/business/consult';

/**
 * @deprecated Use consultAdminService instead. 
 * 하위 호환성을 위해 유지되는 래퍼 함수들입니다.
 */
export const getCnsltList = async (params: CnsltSearchParams): Promise<PaginationResponse<CnsltVO>> => {
  const result = await consultAdminService.getConsultations({
    ...params,
    keyword: params.searchKeyword || params.keyword || ''
  });
  return {
    list: result.list,
    totalCount: result.totalCount
  };
};

export const getCnslt = consultAdminService.getConsultation.bind(consultAdminService);
export const createCnslt = consultAdminService.createConsultation.bind(consultAdminService);
export const answerCnslt = consultAdminService.answerConsultation.bind(consultAdminService);
export const deleteCnslt = consultAdminService.deleteConsultation.bind(consultAdminService);

export { consultAdminService };
