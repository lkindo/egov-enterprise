package com.company.project.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.ApplicationContext;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.test.context.ActiveProfiles;
import com.company.project.TestJpaConfig;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.Map;

@SpringBootTest(classes = TestJpaConfig.class)
@ActiveProfiles("test")
@Transactional
@DisplayName("모든 JPA 레포지토리 자동 호출 테스트")
class RepositoryAutoTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("모든 Repository의 count() 호출하여 메타데이터 로드 및 쿼리 실행")
    void callAllRepositories() {
        Map<String, JpaRepository> repositories = applicationContext.getBeansOfType(JpaRepository.class);
        System.out.println("Found " + repositories.size() + " repositories");

        for (Map.Entry<String, JpaRepository> entry : repositories.entrySet()) {
            String beanName = entry.getKey();
            JpaRepository<?, ?> repo = entry.getValue();
            try {
                long count = repo.count();
                System.out.println("Repository " + beanName + " count: " + count);
            } catch (Throwable e) {
                System.err.println("Failed to call count on " + beanName + ": " + e.getMessage());
            }
        }
    }
}
