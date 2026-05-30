package nuri.business.domain.auth;

import nuri.business.domain.user.entity.DeptManage;
import nuri.business.domain.user.entity.Role;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import jakarta.persistence.EntityManager;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UserAuthorityRepository 통합 테스트")
class UserAuthorityRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private UserAuthorityRepository userAuthorityRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager em;

    private User testUser;
    private UserAuthority testAuthority;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .userId("testUser")
                .esntlId("USR_AUTH_001")
                .userNm("권한테스트")
                .pswd("password")
                .role(Role.USER)
                .groupId("GROUP_01")
                .build();
        userRepository.save(testUser);

        testAuthority = UserAuthority.builder()
                .scrtyDcsnTrgtId("USR_AUTH_001")
                .authrtId("ROLE_ADMIN")
                .mbrTypeCd("USR03")
                .build();
        userAuthorityRepository.save(testAuthority);
        em.flush();
    }

    @Test
    @DisplayName("고유 ID 목록으로 권한 목록 조회")
    void findByUniqIdIn() {
        List<UserAuthority> result = userAuthorityRepository.findByScrtyDcsnTrgtIdIn(Collections.singletonList("USR_AUTH_001"));
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAuthrtId()).isEqualTo("ROLE_ADMIN");
    }

    @Test
    @DisplayName("권한 그룹 검색 (QueryDSL)")
    void searchAuthorGroups() {
        // When - 사용자 ID로 검색
        Page<AuthorGroupProjection> result = userAuthorityRepository.searchAuthorGroups("1", "testUser", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("testUser");
        assertThat(result.getContent().get(0).getAuthrtId()).isEqualTo("ROLE_ADMIN");

        // When - 사용자명으로 검색
        result = userAuthorityRepository.searchAuthorGroups("2", "권한", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);

        // When - 그룹 ID로 검색
        result = userAuthorityRepository.searchAuthorGroups("3", "GROUP_01", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("부서별 권한 검색 (QueryDSL)")
    void searchDeptAuthors() {
        // Given
        DeptManage dept = DeptManage.builder()
                .ognzId("DEPT_001")
                .ognzNm("테스트부서")
                .build();
        em.persist(dept);

        testUser.setOrgnztId("DEPT_001");
        userRepository.save(testUser);
        em.flush();

        // When
        Page<DeptAuthorProjection> result = userAuthorityRepository.searchDeptAuthors("DEPT_001", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getDeptCode()).isEqualTo("DEPT_001");
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("권한 그룹 검색 - 페이지네이션 없음")
    void searchAuthorGroups_Unpaged() {
        // When - unpaged
        Page<AuthorGroupProjection> result = userAuthorityRepository.searchAuthorGroups("1", "testUser", org.springframework.data.domain.Pageable.unpaged());

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("부서별 권한 검색 - 페이지네이션 없음")
    void searchDeptAuthors_Unpaged() {
        // Given
        DeptManage dept = DeptManage.builder()
                .ognzId("DEPT_001")
                .ognzNm("테스트부서")
                .build();
        em.persist(dept);
        testUser.setOrgnztId("DEPT_001");
        userRepository.save(testUser);
        em.flush();

        // When
        Page<DeptAuthorProjection> result = userAuthorityRepository.searchDeptAuthors("DEPT_001", org.springframework.data.domain.Pageable.unpaged());

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("권한 그룹 검색 - 알 수 없는 조건")
    void searchAuthorGroups_UnknownCondition() {
        // When - 알 수 없는 조건은 조건 필터링 무시
        Page<AuthorGroupProjection> result = userAuthorityRepository.searchAuthorGroups("99", "keyword", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("권한 그룹 검색 - 검색어 없음")
    void searchAuthorGroups_NoKeyword() {
        // When - 검색어 없음
        Page<AuthorGroupProjection> result = userAuthorityRepository.searchAuthorGroups("1", "", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).isNotEmpty();
    }
}