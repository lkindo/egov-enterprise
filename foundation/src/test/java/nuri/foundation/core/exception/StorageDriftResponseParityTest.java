package nuri.foundation.core.exception;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.foundation.core.storage.StorageObjectMissingException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * 저장소 드리프트 404 는 <b>일반 404 와 구별할 수 없어야</b> 한다.
 *
 * <p>[왜 이 계약인가 — 2026-08-26]
 * 드리프트를 별도 예외로 올린 이유는 <b>서버가 남기는 기록</b>을 바꾸기 위해서다(WARN 에 묻히던
 * 파일 유실을 ERROR + 저장 경로로). 응답까지 달라지면 그것은 <b>존재 여부 누출</b>이다 — 요청자가
 * "레코드는 있는데 파일만 없다"와 "애초에 없다"를 구분할 수 있게 되고, 그 차이는 열거 공격의
 * 신호가 된다.
 *
 * <p>여기서는 두 가지를 동시에 증명한다: Spring 이 <b>더 구체적인 핸들러를 실제로 고르는지</b>
 * (직접 호출이 아니라 디스패치로), 그리고 그 결과 응답이 일반 404 와 <b>완전히 같은지</b>.
 */
@DisplayName("저장소 드리프트 404 는 일반 404 와 구별되지 않는다")
class StorageDriftResponseParityTest {

    /** 두 종류의 404 를 각각 던지는 최소 컨트롤러. */
    @RestController
    static class ThrowingController {

        @GetMapping("/plain")
        String plain() {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        }

        @GetMapping("/drift")
        String drift() {
            throw new StorageObjectMissingException("general/2026", "gone.png");
        }
    }

    private final MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new ThrowingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    @DisplayName("상태·본문이 완전히 같다 — 응답만 보고는 드리프트를 알 수 없다")
    void driftResponseIsIndistinguishableFromOrdinaryNotFound() throws Exception {
        MvcResult plain = mockMvc.perform(get("/plain").accept(MediaType.APPLICATION_JSON)).andReturn();
        MvcResult drift = mockMvc.perform(get("/drift").accept(MediaType.APPLICATION_JSON)).andReturn();

        assertThat(drift.getResponse().getStatus())
                .isEqualTo(plain.getResponse().getStatus())
                .isEqualTo(404);

        String plainBody = plain.getResponse().getContentAsString();
        String driftBody = drift.getResponse().getContentAsString();

        /*
         * 본문 문자열을 통째로 비교하면 안 된다 — `ApiResponse` 는 `LocalDateTime.now()` 를 담고,
         * 두 요청은 같은 시각에 일어나지 않는다. Windows 는 시계 분해능이 거칠어 두 값이 우연히
         * 같아 통과하지만 Linux 에서는 항상 다르다(2026-08-26 CI 실측 — 로컬 green, CI red).
         * 지키려는 것은 "타임스탬프까지 같다" 가 아니라 "타임스탬프 말고는 다른 게 없다" 다.
         */
        ObjectMapper mapper = new ObjectMapper();
        TypeReference<Map<String, Object>> asMap = new TypeReference<>() {};
        Map<String, Object> plainFields = mapper.readValue(plainBody, asMap);
        Map<String, Object> driftFields = mapper.readValue(driftBody, asMap);
        assertThat(plainFields).containsKey("timestamp");
        plainFields.remove("timestamp");
        driftFields.remove("timestamp");
        assertThat(driftFields).isEqualTo(plainFields);

        // 저장 경로·파일명은 서버 로그에만 남는다 — 응답에 새어 나오면 그 자체가 정보 누출이다.
        assertThat(driftBody).doesNotContain("general/2026").doesNotContain("gone.png");
    }
}
