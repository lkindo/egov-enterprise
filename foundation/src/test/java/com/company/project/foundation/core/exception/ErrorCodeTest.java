package com.company.project.foundation.core.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class ErrorCodeTest {

    @Test
    @DisplayName("ErrorCode Getter ?‘ë™ ?ŒìŠ¤??)
    void testErrorCodeGetters() {
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;

        assertThat(errorCode.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode.getCode()).isEqualTo("C001");
        assertThat(errorCode.getMessage()).isEqualTo("Invalid Input Value");
    }

    @Test
    @DisplayName("ëª¨ë“  ErrorCode ê°’ì´ ?•ìƒ?ìœ¼ë¡??•ì˜?˜ì–´ ?ˆëŠ”ì§€ ?•ì¸")
    void testAllErrorCodeValues() {
        for (ErrorCode errorCode : ErrorCode.values()) {
            assertThat(errorCode.getStatus()).isNotNull();
            assertThat(errorCode.getCode()).isNotBlank();
            assertThat(errorCode.getMessage()).isNotBlank();
        }
    }
}
