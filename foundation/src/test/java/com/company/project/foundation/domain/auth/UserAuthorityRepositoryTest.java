package com.company.project.foundation.domain.auth;

import com.company.project.foundation.domain.user.entity.DeptManage;
import com.company.project.foundation.domain.user.repository.DeptManageRepository;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("UserAuthorityRepository 테스트")
class UserAuthorityRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private UserAuthorityRepository userAuthorityRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DeptManageRepository deptManageRepository;

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("사용자별 권한 그룹 조회 테스트 (QueryDSL)")
    void searchAuthorGroupsTest() {
        // Given
        User user = User.builder()
                .esntlId("USR_001")
                .userId("tester")
                .userNm("Tester Name")
                .password("pass")
                .empStatus("P")
                .orgnztId("ORGNZT_001")
                .build();
        userRepository.save(user);

        UserAuthority auth = UserAuthority.builder()
                .uniqId("USR_001")
                .authorCode("ROLE_USER")
                .build();
        userAuthorityRepository.save(auth);

        em.flush();
        em.clear();

        // When
        Page<AuthorGroupProjection> results = userAuthorityRepository.searchAuthorGroups("1", "tester", PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).isNotEmpty();
        assertThat(results.getContent().get(0).getUserId()).isEqualTo("tester");
        assertThat(results.getContent().get(0).getAuthorCode()).isEqualTo("ROLE_USER");
        assertThat(results.getContent().get(0).getRegYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("부서별 권한 조회 테스트 (QueryDSL)")
    void searchDeptAuthorsTest() {
        // Given
        DeptManage dept = DeptManage.builder()
                .orgnztId("DEPT_001")
                .orgnztNm("Department 1")
                .build();
        deptManageRepository.save(dept);

        User user = User.builder()
                .esntlId("USR_002")
                .userId("deptUser")
                .userNm("Dept User")
                .orgnztId("DEPT_001")
                .password("p")
                .empStatus("P")
                .build();
        userRepository.save(user);

        em.flush();
        em.clear();

        // When
        Page<DeptAuthorProjection> results = userAuthorityRepository.searchDeptAuthors("DEPT_001", PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).isNotEmpty();
        assertThat(results.getContent().get(0).getDeptNm()).isEqualTo("Department 1");
        assertThat(results.getContent().get(0).getUserId()).isEqualTo("deptUser");
    }
}
