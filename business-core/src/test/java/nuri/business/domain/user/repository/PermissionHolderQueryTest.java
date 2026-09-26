package nuri.business.domain.user.repository;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import nuri.business.domain.auth.AuthorityGrant;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.user.entity.Role;
import nuri.business.domain.user.entity.User;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * 알림 수신자를 고르는 권한 보유자 조회(2026-09-26 DIP B5 F1).
 *
 * <p>그룹 배정과 그 그룹의 기능 권한을 거쳐 사용 중(P)인 사용자만 돌려주는가를 본다. 메뉴 배정(NAVIGATION)은
 * 기능 권한이 아니고, 쓰지 않는 계정에게 알림을 보내면 아무도 처리하지 않는다.
 */
@DisplayName("권한 보유자 조회")
class PermissionHolderQueryTest extends PersistenceTestSupport {

    @Autowired private UserRepository userRepository;
    @Autowired private EntityManager em;

    @Test
    @DisplayName("기능 권한을 그룹으로 가진 사용 중 사용자만 — 메뉴 배정·비활성 계정·다른 권한은 빠진다")
    void returnsActiveHoldersOfOperationPermissionOnly() {
        user("USR_HOLDER", "holder", "P");
        user("USR_INACTIVE", "inactive", "D");
        user("USR_NAV_ONLY", "navonly", "P");
        user("USR_OTHER", "other", "P");
        assign("USR_HOLDER", "GRP_APPROVER");
        assign("USR_INACTIVE", "GRP_APPROVER");
        assign("USR_NAV_ONLY", "GRP_NAV");
        assign("USR_OTHER", "GRP_OTHER");
        em.persist(AuthorityGrant.create("GRP_APPROVER", "OPERATION", "COMMUNITY_APPROVE"));
        em.persist(AuthorityGrant.create("GRP_NAV", "NAVIGATION", "COMMUNITY_APPROVE"));
        em.persist(AuthorityGrant.create("GRP_OTHER", "OPERATION", "COMMUNITY_READ_ALL"));
        em.flush();

        assertThat(userRepository.findActiveEsntlIdsHoldingPermission("COMMUNITY_APPROVE"))
                .containsExactly("USR_HOLDER");
    }

    @Test
    @DisplayName("두 그룹으로 같은 권한을 가져도 한 번만 돌려준다")
    void deduplicatesHoldersAcrossGroups() {
        user("USR_TWICE", "twice", "P");
        assign("USR_TWICE", "GRP_A");
        assign("USR_TWICE", "GRP_B");
        em.persist(AuthorityGrant.create("GRP_A", "OPERATION", "COMMUNITY_APPROVE"));
        em.persist(AuthorityGrant.create("GRP_B", "OPERATION", "COMMUNITY_APPROVE"));
        em.flush();

        assertThat(userRepository.findActiveEsntlIdsHoldingPermission("COMMUNITY_APPROVE"))
                .containsExactly("USR_TWICE");
    }

    private void user(String esntlId, String loginId, String status) {
        User user = User.builder().esntlId(esntlId).userId(loginId).userNm(loginId).pswd("x").role(Role.USER).build();
        user.updateStatus(status);
        em.persist(user);
    }

    private void assign(String esntlId, String group) {
        em.persist(UserAuthority.builder().scrtyDcsnTrgtId(esntlId).authrtId(group).mbrTypeCd("USR03").build());
    }
}
