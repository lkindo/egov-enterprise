package com.company.project.domain.user;

import com.company.project.domain.config.QuerydslConfig;
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

@DataJpaTest
@Import(QuerydslConfig.class)
@ActiveProfiles("test")
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        userRepository.save(java.util.Objects.requireNonNull(User.builder()
                .userId("user1")
                .userNm("홍길동")
                .role(Role.USER)
                .password("pass1")
                .esntlId("USR1")
                .build()));

        userRepository.save(java.util.Objects.requireNonNull(User.builder()
                .userId("admin1")
                .userNm("관리자")
                .role(Role.ADMIN)
                .password("pass2")
                .esntlId("ADM1")
                .build()));
    }

    @Test
    @DisplayName("아이디로 사용자 검색")
    void searchByUserId() {
        Page<User> result = userRepository.searchUsers(null, "0", "user1",
                java.util.Objects.requireNonNull(PageRequest.of(0, 10)));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("이름으로 사용자 검색")
    void searchByUserNm() {
        Page<User> result = userRepository.searchUsers(null, "1", "관리자",
                java.util.Objects.requireNonNull(PageRequest.of(0, 10)));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserNm()).isEqualTo("관리자");
    }

    @Test
    @DisplayName("역할(Role) 필터링")
    void searchByRole() {
        Page<User> result = userRepository.searchUsers("ADMIN", null, null,
                java.util.Objects.requireNonNull(PageRequest.of(0, 10)));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("아이디 중복 체크")
    void checkIdDplct() {
        int count = userRepository.checkIdDplct("user1");
        assertThat(count).isEqualTo(1);

        int nonExistCount = userRepository.checkIdDplct("newuser");
        assertThat(nonExistCount).isEqualTo(0);
    }
}
