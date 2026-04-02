package com.company.project.foundation.domain.login;

import com.company.project.TestApplication;
import com.company.project.foundation.domain.user.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ContextConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ContextConfiguration(classes = TestApplication.class)
@DisplayName("LoginPolicyRepository ?åÏä§??)
class LoginPolicyRepositoryTest {

    @Autowired
    private LoginPolicyRepository loginPolicyRepository;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        // Create User for JOIN test
        User user = User.builder()
                .userId("TEST_USER")
                .userNm("?åÏä§???†Ï?")
                .esntlId("ESNTL_001")
                .password("test1234")
                .build();
        entityManager.persist(user);

        // Create LoginPolicy
        LoginPolicy policy = LoginPolicy.builder()
                .emplyrId("TEST_USER")
                .ipInfo("127.0.0.1")
                .dplctPermAt("Y")
                .lmttAt("N")
                .build();
        entityManager.persist(policy);
        
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö Í≤Ä???åÏä§??- ?ÑÏ≤¥ Ï°∞Ìöå")
    void searchAllTest() {
        // Given
        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        PageRequest pageable = PageRequest.of(0, 10);

        // When
        Page<LoginPolicySearchResult> result = loginPolicyRepository.search(condition, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEmplyrId()).isEqualTo("TEST_USER");
        assertThat(result.getContent().get(0).getRegYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö Í≤Ä???åÏä§??- ?¥Î¶Ñ Ï°∞Í±¥ (?±Í≥µ)")
    void searchByNameSuccessTest() {
        // Given
        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        condition.setSearchCondition("1");
        condition.setSearchKeyword("?åÏä§??);
        PageRequest pageable = PageRequest.of(0, 10);

        // When
        Page<LoginPolicySearchResult> result = loginPolicyRepository.search(condition, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserNm()).isEqualTo("?åÏä§???†Ï?");
    }

    @Test
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö Í≤Ä???åÏä§??- ?¥Î¶Ñ Ï°∞Í±¥ (Í≤∞Í≥º ?ÜÏùå)")
    void searchByNameNoResultTest() {
        // Given
        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        condition.setSearchCondition("1");
        condition.setSearchKeyword("Ï°¥Ïû¨?òÏ??äÎäî?¥Î¶Ñ");
        PageRequest pageable = PageRequest.of(0, 10);

        // When
        Page<LoginPolicySearchResult> result = loginPolicyRepository.search(condition, pageable);

        // Then
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("Î°úÍ∑∏???ïÏ±Ö Í≤Ä???åÏä§??- ?§Ïõå???ÜÏùå")
    void searchNoKeywordTest() {
        // Given
        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        condition.setSearchCondition("1");
        condition.setSearchKeyword("");
        PageRequest pageable = PageRequest.of(0, 10);

        // When
        Page<LoginPolicySearchResult> result = loginPolicyRepository.search(condition, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }
}
