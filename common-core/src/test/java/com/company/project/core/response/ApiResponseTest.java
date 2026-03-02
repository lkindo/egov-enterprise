package com.company.project.core.response;

import com.company.project.core.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class ApiResponseTest {

    @Test
    @DisplayName("성공 응답 생성 테스트")
    void successResponseTest() {
        String data = "test data";
        ApiResponse<String> response = ApiResponse.success(data);

        assertThat(response.success()).isTrue();
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.data()).isEqualTo(data);
        assertThat(response.timestamp()).isNotNull();
    }

    @Test
    @DisplayName("에러 응답 생성 테스트")
    void errorResponseTest() {
        ApiResponse<Object> response = ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE);

        assertThat(response.success()).isFalse();
        assertThat(response.status()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(response.code()).isEqualTo("C001");
        assertThat(response.data()).isNull();
    }

    @Test
    @DisplayName("커스텀 메시지 에러 응답 테스트")
    void errorWithCustomMessageTest() {
        String customMsg = "Custom error message";
        ApiResponse<Object> response = ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, customMsg);

        assertThat(response.message()).isEqualTo(customMsg);
        assertThat(response.success()).isFalse();
    }
}
