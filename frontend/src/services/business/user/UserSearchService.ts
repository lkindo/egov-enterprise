import { UserService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';
import { searchAssignableUsersOperation } from '@/types/generated-operations';

/**
 * 담당자 지정용 사용자 검색 서비스.
 * 백엔드 UserApiController 연동 (GET /api/v1/users/search)
 *
 * ⚠ 관리자용 사용자 목록(`/admin/system/users`)과 혼동하지 말 것.
 *   그쪽은 주소·연락처·이메일까지 담은 전체 인적사항이라 일반 사용자 화면에서 쓰면 안 된다.
 *   담당자 선택처럼 "사람을 고르기만" 하는 화면은 반드시 이 서비스를 쓴다.
 */
class UserSearchService extends UserService {
  constructor() {
    super('/users');
  }

  /**
   * 담당자 검색. 성명 부분일치로 조회한다.
   *
   * 서버가 검색어 2자 미만이면 빈 목록을, 그 이상이면 최대 20건을 돌려준다
   * (인명부 전량 수집 방지). 페이징이 없는 것은 의도다 — 호출부에서 page 를 넘기지 말 것.
   */
  async searchAssignableUsers(keyword: string, config?: AxiosRequestConfig): Promise<UserSearchResult[]> {
    const generatedConfig = config ? { ...config } : undefined;
    if (generatedConfig && Object.hasOwn(generatedConfig, 'params')) delete generatedConfig.params;
    return this.executeGenerated(searchAssignableUsersOperation, {
      query: { keyword },
      config: generatedConfig,
    });
  }
}

/**
 * 담당자 검색 결과 1건. 백엔드 `UserSearchDto` 와 1:1 대응한다.
 *
 * 이 응답에는 개인정보(연락처·이메일·주소·생년월일)가 담기지 않는다. 서버가 의도적으로
 * 제외한 것이니, 화면에서 필요해 보이더라도 필드를 늘리기 전에 노출면부터 따져야 한다.
 */
export interface UserSearchResult {
  /**
   * 사용자 PK(esntlId). 부서 업무의 `picId` 가 저장하는 축이 바로 이 값이다 —
   * loginId 를 넣으면 담당자 이름이 조용히 비게 된다(정체성 축 함정).
   */
  esntlId?: string;
  /** 표시용 성명 */
  userNm?: string;
  /** 소속 부서명. 동명이인 구분용이며 미소속이면 비어 있다. */
  deptNm?: string;
}

export const userSearchService = new UserSearchService();

export const searchAssignableUsers = userSearchService.searchAssignableUsers.bind(userSearchService);
