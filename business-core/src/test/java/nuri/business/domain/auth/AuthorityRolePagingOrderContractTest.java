package nuri.business.domain.auth;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("권한 롤 다중 페이지 안정 정렬 계약")
class AuthorityRolePagingOrderContractTest extends PersistenceTestSupport {

    private static final String ORDER_CLAUSE =
            ".orderBy(roleInfo.roleSort.asc().nullsLast(), roleInfo.roleId.asc())";

    @Autowired
    private RoleInfoRepository roleInfoRepository;

    @Autowired
    private AuthorityRoleRepository authorityRoleRepository;

    @Test
    @DisplayName("롤 순번이 같아도 두 페이지를 PK 순서로 중복·누락 없이 잇는다")
    void usesRoleIdAsStableTieBreaker() {
        roleInfoRepository.saveAll(List.of(
                role("PAGING_ROLE_C"),
                role("PAGING_ROLE_A"),
                role("PAGING_ROLE_B")));
        roleInfoRepository.flush();

        Page<AuthorRoleProjection> first = authorityRoleRepository.searchAuthorRoles(
                "AUTH_NONE", PageRequest.of(0, 2));
        Page<AuthorRoleProjection> second = authorityRoleRepository.searchAuthorRoles(
                "AUTH_NONE", PageRequest.of(1, 2));

        assertThat(first.getTotalElements()).isEqualTo(3);
        assertThat(second.getTotalElements()).isEqualTo(3);
        assertThat(List.of(first, second).stream()
                .flatMap(Page::stream)
                .map(AuthorRoleProjection::getRoleId))
                .containsExactly("PAGING_ROLE_A", "PAGING_ROLE_B", "PAGING_ROLE_C");
    }

    @Test
    @DisplayName("정렬 순번 뒤에는 PK tie-breaker가 offset보다 먼저 선언된다")
    void declaresStableOrderBeforeOffset() throws IOException {
        String source = Files.readString(
                Path.of("src", "main", "java", "nuri", "business", "domain", "auth",
                        "AuthorityRoleRepositoryImpl.java"),
                StandardCharsets.UTF_8);

        assertThat(source.indexOf(ORDER_CLAUSE)).isGreaterThanOrEqualTo(0);
        assertThat(source.indexOf(ORDER_CLAUSE))
                .isLessThan(source.indexOf(".offset(pageable.getOffset())"));
    }

    @Test
    @DisplayName("부정 제어: 비유일 순번만 정렬한 쿼리는 안정 정렬로 인정하지 않는다")
    void rejectsNonUniqueOrder() {
        String unstable = ".orderBy(roleInfo.roleSort.asc()).offset(pageable.getOffset())";

        assertThat(unstable).doesNotContain(ORDER_CLAUSE);
    }

    private static RoleInfo role(String roleId) {
        return RoleInfo.builder()
                .roleId(roleId)
                .roleNm(roleId)
                .roleSort(1)
                .build();
    }
}
