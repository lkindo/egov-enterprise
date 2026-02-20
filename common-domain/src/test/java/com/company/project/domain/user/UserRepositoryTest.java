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
                .userNm("??삳쭔??)
                .role(Role.USER)
                .password("pass1")
                .esntlId("USR1")
                .build()));

        userRepository.save(java.util.Objects.requireNonNull(User.builder()
                .userId("admin1")
                .userNm("?온?귐딆쁽")
                .role(Role.ADMIN)
                .password("pass2")
                .esntlId("ADM1")
                .build()));
    }

    @Test
    @DisplayName("?袁⑹뵠?遺얠쨮 ?????野꺜??)
    void searchByUserId() {
        Page<User> result = userRepository.searchUsers(null, "0", "user1",
                java.util.Objects.requireNonNull(PageRequest.of(0, 10)));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("??已??곗쨮 ?????野꺜??)
    void searchByUserNm() {
        Page<User> result = userRepository.searchUsers(null, "1", "?온?귐딆쁽",
                java.util.Objects.requireNonNull(PageRequest.of(0, 10)));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserNm()).isEqualTo("?온?귐딆쁽");
    }

    @Test
    @DisplayName("??釉?Role) ?袁り숲筌?)
    void searchByRole() {
        Page<User> result = userRepository.searchUsers("ADMIN", null, null,
                java.util.Objects.requireNonNull(PageRequest.of(0, 10)));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRole()).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("?袁⑹뵠??餓λ쵎??筌ｋ똾寃?)
    void checkIdDplct() {
        int count = userRepository.checkIdDplct("user1");
        assertThat(count).isEqualTo(1);

        int nonExistCount = userRepository.checkIdDplct("newuser");
        assertThat(nonExistCount).isEqualTo(0);
    }
}
