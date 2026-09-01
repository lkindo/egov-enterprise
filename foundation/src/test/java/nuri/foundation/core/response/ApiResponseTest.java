package nuri.foundation.core.response;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ApiResponse 테스트")
class ApiResponseTest {

    @Test
    @DisplayName("성공 응답 생성 테스트")
    void testSuccessResponse() {
        // Given
        String data = "test data";

        // When
        ApiResponse<String> response = ApiResponse.success(data);

        // Then
        assertTrue(response.success());
        assertEquals(200, response.status());
        assertEquals("Success", response.message());
        assertEquals(data, response.data());
        assertNotNull(response.timestamp());
    }

    @Test
    @DisplayName("에러 응답 생성 테스트")
    void testErrorResponse() {
        // Given
        ErrorCode errorCode = CommonErrorCode.INTERNAL_SERVER_ERROR;

        // When
        ApiResponse<Void> response = ApiResponse.error(errorCode);

        // Then
        assertFalse(response.success());
        assertEquals(500, response.status());
        assertEquals(errorCode.getCode(), response.code());
    }

    @Test
    @DisplayName("timestamp는 OpenAPI date-time과 같은 ISO-8601 형식으로 직렬화한다")
    void timestampUsesIso8601WireFormat() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        String json = objectMapper.writeValueAsString(ApiResponse.success("data"));
        String timestamp = objectMapper.readTree(json).path("timestamp").asText();

        assertTrue(timestamp.contains("T"), timestamp);
        assertFalse(timestamp.contains(" "), timestamp);
    }
}
