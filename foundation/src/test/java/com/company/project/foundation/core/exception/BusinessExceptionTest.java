package com.company.project.foundation.core.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class BusinessExceptionTest {

    @Test
    @DisplayName("BusinessException ?ùÏÑ± Î∞?ErrorCode Îß§Ìïë ?åÏä§??)
    void businessExceptionTest() {
        ErrorCode errorCode = ErrorCode.ENTITY_NOT_FOUND;
        BusinessException exception = new BusinessException(errorCode);

        assertThat(exception.getErrorCode()).isEqualTo(errorCode);
        assertThat(exception.getMessage()).isEqualTo(errorCode.getMessage());
    }

    @Test
    @DisplayName("Ïª§Ïä§?Ä Î©îÏãúÏßÄÎ•?Í∞ÄÏß?BusinessException ?åÏä§??)
    void businessExceptionWithCustomMessageTest() {
        String customMsg = "Specific entity not found";
        BusinessException exception = new BusinessException(customMsg, ErrorCode.ENTITY_NOT_FOUND);

        assertThat(exception.getMessage()).isEqualTo(customMsg);
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.ENTITY_NOT_FOUND);
    }
}
