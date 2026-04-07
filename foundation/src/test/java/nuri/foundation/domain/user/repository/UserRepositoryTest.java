package nuri.foundation.domain.user.repository;

import nuri.foundation.domain.user.entity.EnterpriseUser;
import nuri.foundation.domain.user.entity.GeneralUser;
import nuri.foundation.domain.user.entity.Role;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UserRepository 테스트")
class UserRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager em;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .userId("testUser")
                .esntlId("USR_000000000001")
                .userNm("테스트유저")
                .password("password")
                .emailAdres("test@example.com")
                .role(Role.USER)
                .build();
        userRepository.save(testUser);
    }

    @Test
    @DisplayName("사용자 ID로 조회")
    void findById() {
        Optional<User> found = userRepository.findById("testUser");
        assertThat(found).isPresent();
        assertThat(found.get().getUserNm()).isEqualTo("테스트유저");
    }

    @Test
    @DisplayName("esntlId로 조회")
    void findByEsntlId() {
        Optional<User> found = userRepository.findByEsntlId("USR_000000000001");
        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("사용자 검색 기능 (QueryDSL)")
    void searchUsers() {
        // Given
        User adminUser = User.builder()
                .userId("adminUser")
                .esntlId("USR_000000000002")
                .userNm("관리자")
                .password("password")
                .role(Role.ADMIN)
                .build();
        userRepository.save(adminUser);

        // When - Role로 검색
        Page<User> result = userRepository.searchUsers("ADMIN", null, null, PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("adminUser");

        // When - 이름으로 검색
        result = userRepository.searchUsers(null, "USER_NM", "테스트", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("아이디 중복 체크 (User, Enterprise, General 통합)")
    void checkIdDplct() {
        // Given
        EnterpriseUser enterpriseUser = EnterpriseUser.builder()
                .entrprsmberId("entUser")
                .esntlId("ENT_001")
                .entrprsMberPassword("password")
                .build();
        em.persist(enterpriseUser);

        GeneralUser generalUser = GeneralUser.builder()
                .mberId("genUser")
                .esntlId("GEN_001")
                .mberNm("일반회원")
                .password("password")
                .build();
        em.persist(generalUser);
        em.flush();

        // When & Then
        assertThat(userRepository.checkIdDplct("testUser")).isGreaterThan(0);
        assertThat(userRepository.checkIdDplct("entUser")).isGreaterThan(0);
        assertThat(userRepository.checkIdDplct("genUser")).isGreaterThan(0);
        assertThat(userRepository.checkIdDplct("nonExist")).isEqualTo(0);
    }

    @Test
    @DisplayName("권한 정보를 포함한 모든 사용자 조회")
    void findAllWithAuthorities() {
        List<Object[]> result = userRepository.findAllWithAuthorities();
        assertThat(result).isNotEmpty();
    }
}
