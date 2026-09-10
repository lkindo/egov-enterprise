package nuri.business.service.auth;

import java.util.List;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.service.auth.dto.RoleManageDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RetiredAuthorizationServiceTest {
    @Test
    void roleCatalogAndWritesAreExplicitlyRetired() {
        var service=new RoleManageService();
        List<Runnable> calls=List.of(() -> service.selectRoleList(new BaseSearchDto()),()->service.selectRole("ROLE_ADMIN"),
                ()->service.insertRole(new RoleManageDto()),()->service.updateRole(new RoleManageDto()),
                ()->service.deleteRole("ROLE_ADMIN"),()->service.deleteRoles(new String[]{"ROLE_ADMIN"}));
        for(var call:calls) assertRetired(call);
    }
    @Test
    void unversionedRoleAssignmentsCannotMutateNewGrants() {
        var service=new AuthorRoleManageService();
        assertRetired(()->service.selectAuthorRoleList("ROLE_ADMIN",new BaseSearchDto()));
        assertRetired(()->service.insertAuthorRole("ROLE_ADMIN",List.of("ROLE_SYSTEM")));
    }
    private static void assertRetired(Runnable call) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(BusinessException.class,
                error -> org.assertj.core.api.Assertions.assertThat(error.getErrorCode()).isEqualTo(CommonErrorCode.AUTHORIZATION_ENDPOINT_RETIRED));
    }
}
