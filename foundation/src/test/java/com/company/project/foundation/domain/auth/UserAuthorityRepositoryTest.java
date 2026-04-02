package com.company.project.foundation.domain.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("UserAuthorityRepository 테스트")
class UserAuthorityRepositoryTest {

    @Autowired
    private UserAuthorityRepository userAuthorityRepository;

    @Test
    @DisplayName("리포지토리 빈 주입 확인")
    void testRepositoryInjected() {
        assertNotNull(userAuthorityRepository);
    }
}