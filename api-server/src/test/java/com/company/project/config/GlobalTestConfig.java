package com.company.project.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

/**
 * api-server 테스트 환경에서 공통으로 사용되는 빈 설정
 */
@TestConfiguration
@Profile("test")
public class GlobalTestConfig {

    @Bean
    @Primary
    public JPAQueryFactory jpaQueryFactory() {
        return Mockito.mock(JPAQueryFactory.class);
    }

    @Bean
    @Primary
    public EntityManager entityManager() {
        return Mockito.mock(EntityManager.class);
    }

    @Bean(name = "entityManagerFactory")
    @Primary
    public EntityManagerFactory entityManagerFactory() {
        return Mockito.mock(EntityManagerFactory.class);
    }
}
