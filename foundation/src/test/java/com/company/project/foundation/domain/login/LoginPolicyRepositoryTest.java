package com.company.project.foundation.domain.login;

import com.company.project.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@DisplayName("LoginPolicyRepository 테스트")
class LoginPolicyRepositoryTest extends PersistenceTestSupport {

    @Autowired
    private LoginPolicyRepository repository;

    @Test
    @DisplayName("리포지토리 주입 확인")
    void testInjected() {
        assertNotNull(repository);
    }
}