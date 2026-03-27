package com.company.project.foundation.domain.login;

import com.company.project.foundation.TestApplication;
import com.company.project.foundation.domain.user.entity.User;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ContextConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ContextConfiguration(classes = TestApplication.class)
@DisplayName("LoginPolicyRepository 테스트")
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
                .userNm("테스트 유저")
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
    @DisplayName("로그인 정책 검색 테스트 - 전체 조회")
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
    @DisplayName("로그인 정책 검색 테스트 - 이름 조건 (성공)")
    void searchByNameSuccessTest() {
        // Given
        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        condition.setSearchCondition("1");
        condition.setSearchKeyword("테스트");
        PageRequest pageable = PageRequest.of(0, 10);

        // When
        Page<LoginPolicySearchResult> result = loginPolicyRepository.search(condition, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getUserNm()).isEqualTo("테스트 유저");
    }

    @Test
    @DisplayName("로그인 정책 검색 테스트 - 이름 조건 (결과 없음)")
    void searchByNameNoResultTest() {
        // Given
        LoginPolicySearchCondition condition = new LoginPolicySearchCondition();
        condition.setSearchCondition("1");
        condition.setSearchKeyword("존재하지않는이름");
        PageRequest pageable = PageRequest.of(0, 10);

        // When
        Page<LoginPolicySearchResult> result = loginPolicyRepository.search(condition, pageable);

        // Then
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("로그인 정책 검색 테스트 - 키워드 없음")
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
