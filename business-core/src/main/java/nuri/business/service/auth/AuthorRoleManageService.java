package nuri.business.service.auth;

import nuri.business.domain.auth.AuthorRoleProjection;
import nuri.business.domain.common.BaseSearchDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/** Retired role-table API. Use typed grants in AuthorizationAdministrationService. */
@Service
@Transactional(readOnly = true)
public class AuthorRoleManageService {
    public Page<AuthorRoleProjection> selectAuthorRoleList(String authrtCd, BaseSearchDto searchVO) {
        throw new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    public void insertAuthorRole(String authrtCd, List<String> roleCds) {
        throw new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }
}
