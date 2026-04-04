package com.company.project.foundation.domain.log;

import com.company.project.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@DisplayName("LoginLogRepository 테스트")
class LoginLogRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private LoginLogRepository repository;

    @Test
    @DisplayName("리포지토리 주입 확인")
    void testInjected() {
        assertNotNull(repository);
    }
}