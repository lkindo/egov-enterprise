package com.company.project.domain.user.repository;

import com.company.project.domain.config.RepositoryTestConfig;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "spring.main.allow-bean-definition-overriding=true")
@Import(RepositoryTestConfig.class)
@ActiveProfiles("test")
class UserRepositorySearchIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.save(User.builder()
                .userId("admin01")
                .userNm("관리자")
                .esntlId("USR001")
                .role(Role.ADMIN)
                .password("testpass")
                .build());

        userRepository.save(User.builder()
                .userId("user01")
                .userNm("홍길동")
                .esntlId("USR002")
                .role(Role.USER)
                .password("testpass")
                .build());
    }

    @Test
    @DisplayName("사용자 아이디 검색 테스트")
    void searchByUserIdTest() {
        // When: 아이디(0)로 'admin' 검색
        Page<User> result = userRepository.searchUsers(null, "0", "admin", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("admin01");
    }

    @Test
    @DisplayName("사용자 이름 검색 테스트")
    void searchByUserNmTest() {
        // When: 이름(1)으로 '홍길동' 검색
        Page<User> result = userRepository.searchUsers(null, "1", "홍길동", PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserNm()).isEqualTo("홍길동");
    }

    @Test
    @DisplayName("권한 필터링 검색 테스트")
    void searchByRoleTest() {
        // When: ADMIN 권한으로 필터링
        Page<User> result = userRepository.searchUsers("ADMIN", null, null, PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("아이디 중복 체크 테스트")
    void checkIdDplctTest() {
        // When
        int count = userRepository.checkIdDplct("admin01");
        int nonExistCount = userRepository.checkIdDplct("newuser");

        // Then
        assertThat(count).isGreaterThan(0);
        assertThat(nonExistCount).isEqualTo(0);
    }
}
