package nuri.foundation.domain.user.repository;


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
        Optional<User> found = userRepository.findByUserId("testUser");
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
    @DisplayName("아이디 중복 체크 (통합된 User 테이블 내 중복 검증)")
    void checkIdDplct() {
        // Given
        User entUser = User.builder()
                .userId("entUser")
                .esntlId("ENT_001")
                .userNm("기업회원")
                .password("password")
                .userType("ENT")
                .role(Role.USER)
                .build();
        userRepository.save(entUser);

        User genUser = User.builder()
                .userId("genUser")
                .esntlId("GEN_001")
                .userNm("일반회원")
                .password("password")
                .userType("GNR")
                .role(Role.USER)
                .build();
        userRepository.save(genUser);
        em.flush();
        em.clear();

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

    @Test
    @DisplayName("getPagedUserList - 키워드 없음")
    void getPagedUserList_NoKeyword() {
        var result = userRepository.getPagedUserList(null, PageRequest.of(0, 10));
        assertThat(result.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("getPagedUserList - 키워드 있음")
    void getPagedUserList_WithKeyword() {
        var result = userRepository.getPagedUserList("testUser", PageRequest.of(0, 10));
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("searchUsers - 그 외 다양한 조건 분기")
    void searchUsers_VariousConditions() {
        // 0 상태
        var result = userRepository.searchUsers("0", null, null, PageRequest.of(0, 10));
        assertThat(result).isNotNull();

        // 잘못된 Role
        result = userRepository.searchUsers("INVALID_ROLE", null, null, PageRequest.of(0, 10));
        assertThat(result).isNotNull();

        // 조건 0 (ID)
        result = userRepository.searchUsers(null, "0", "test", PageRequest.of(0, 10));
        assertThat(result.getContent()).isNotEmpty();

        // 조건 USER_ID
        result = userRepository.searchUsers(null, "USER_ID", "test", PageRequest.of(0, 10));
        assertThat(result.getContent()).isNotEmpty();

        // 조건 OFFM_TELNO
        testUser.setOffmTelno("010-1234-5678");
        userRepository.save(testUser);
        em.flush();
        em.clear();
        result = userRepository.searchUsers(null, "OFFM_TELNO", "1234", PageRequest.of(0, 10));
        assertThat(result.getContent()).isNotEmpty();

        // 조건 알 수 없음
        result = userRepository.searchUsers(null, "99", "test", PageRequest.of(0, 10));
        assertThat(result.getContent()).isNotEmpty();
    }
}
