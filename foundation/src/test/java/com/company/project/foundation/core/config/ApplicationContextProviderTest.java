package com.company.project.foundation.core.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(classes = ApplicationContextProvider.class)
@ActiveProfiles("test")
@DisplayName("ApplicationContextProvider 테스트")
class ApplicationContextProviderTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("애플리케이션 컨텍스트 주입 확인")
    void testContextLoads() {
        assertNotNull(applicationContext);
        assertNotNull(ApplicationContextProvider.getApplicationContext());
    }

    @Test
    @DisplayName("getBean 메서드 작동 확인")
    void testGetBean() {
        ApplicationContextProvider provider = ApplicationContextProvider.getApplicationContext().getBean(ApplicationContextProvider.class);
        assertNotNull(provider);
        assertTrue(ApplicationContextProvider.getBean(ApplicationContextProvider.class) instanceof ApplicationContextProvider);
    }
}