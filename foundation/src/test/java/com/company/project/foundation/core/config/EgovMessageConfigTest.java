package com.company.project.foundation.core.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.MessageSource;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("EgovMessageConfig 테스트")
class EgovMessageConfigTest {

    private final EgovMessageConfig config = new EgovMessageConfig();

    @Test
    @DisplayName("MessageSource 빈 생성 및 설정 확인")
    void testMessageSourceBean() {
        // When
        MessageSource messageSource = config.messageSource();

        // Then
        assertNotNull(messageSource);
        assertTrue(messageSource instanceof ReloadableResourceBundleMessageSource);
        assertEquals("UTF-8", ((ReloadableResourceBundleMessageSource) messageSource).getDefaultEncoding());
    }
}