package com.company.project.core.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BusinessExceptionTest {

    @Test
    @DisplayName("BusinessException 생성 및 ErrorCode 매핑 테스트")
    void businessExceptionTest() {
        ErrorCode errorCode = ErrorCode.ENTITY_NOT_FOUND;
        BusinessException exception = new BusinessException(errorCode);

        assertThat(exception.getErrorCode()).isEqualTo(errorCode);
        assertThat(exception.getMessage()).isEqualTo(errorCode.getMessage());
    }

    @Test
    @DisplayName("커스텀 메시지를 가진 BusinessException 테스트")
    void businessExceptionWithCustomMessageTest() {
        String customMsg = "Specific entity not found";
        BusinessException exception = new BusinessException(customMsg, ErrorCode.ENTITY_NOT_FOUND);

        assertThat(exception.getMessage()).isEqualTo(customMsg);
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.ENTITY_NOT_FOUND);
    }
}
