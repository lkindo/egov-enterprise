package nuri.business.service.auth;

import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.dto.RoleManageDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/** Retired role-table API. Use typed grants in AuthorizationAdministrationService. */
@Service
@Transactional(readOnly = true)
public class RoleManageService {
    public Page<RoleManageDto> selectRoleList(BaseSearchDto searchVO) {
        throw new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    public RoleManageDto selectRole(String roleCode) {
        throw new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    public void insertRole(RoleManageDto dto) {
        throw new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    public void updateRole(RoleManageDto dto) {
        throw new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    public void deleteRole(String roleCode) {
        throw new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }

    public void deleteRoles(String[] roleCodes) {
        throw new nuri.foundation.core.exception.BusinessException(
                nuri.foundation.core.exception.CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED);
    }
}
