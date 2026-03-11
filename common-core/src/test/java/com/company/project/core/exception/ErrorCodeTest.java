package com.company.project.core.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class ErrorCodeTest {

    @Test
    @DisplayName("ErrorCode Getter 작동 테스트")
    void testErrorCodeGetters() {
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;

        assertThat(errorCode.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorCode.getCode()).isEqualTo("C001");
        assertThat(errorCode.getMessage()).isEqualTo("Invalid Input Value");
    }

    @Test
    @DisplayName("모든 ErrorCode 값이 정상적으로 정의되어 있는지 확인")
    void testAllErrorCodeValues() {
        for (ErrorCode errorCode : ErrorCode.values()) {
            assertThat(errorCode.getStatus()).isNotNull();
            assertThat(errorCode.getCode()).isNotBlank();
            assertThat(errorCode.getMessage()).isNotBlank();
        }
    }
}
