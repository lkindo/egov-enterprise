package nuri.business.service.memoreport.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 메모보고 지시사항 입력 계약.
 *
 * <p>[2026-09-24] api-server 에서 이 도메인 패키지로 옮겼다. 컨트롤러는 demo pack 과 함께 빠지는데 이 DTO 는
 * demo 타입을 참조하지 않아, 축소 프로필에 참조처 없는 파일로 남았다.
 */
@Schema(description = "메모보고 지시사항 요청")
public class MemoInstructionRequest {

    @Schema(description = "지시사항", minLength = 1, maxLength = 2000)
    @NotBlank
    @Size(min = 1, max = 2000)
    private String drctnMttr;

    public MemoInstructionRequest() {
    }

    public MemoInstructionRequest(String drctnMttr) {
        this.drctnMttr = drctnMttr;
    }

    /**
     * 기존 application/json 문자열 본문과 신규 객체 본문을 함께 수용한다.
     *
     * <p>[2026-09-24 ADR-0024] 위임 대상을 {@code Object} 로 둔다. Jackson 2·3 모두 문자열 본문은 {@code String},
     * 객체 본문은 {@code Map} 으로 넘긴다. 종전 {@code com.fasterxml...JsonNode} 는 Jackson 3 변환기에서 만들 수
     * 없는 타입이라 500 이었다. 문자열이 아닌 값은 종전처럼 비워 {@code @NotBlank} 가 400 으로 거절한다.
     */
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static MemoInstructionRequest fromJson(Object body) {
        if (body instanceof String text) {
            return new MemoInstructionRequest(text);
        }
        if (body instanceof java.util.Map<?, ?> fields && fields.get("drctnMttr") instanceof String text) {
            return new MemoInstructionRequest(text);
        }
        return new MemoInstructionRequest(null);
    }

    public String getDrctnMttr() {
        return drctnMttr;
    }

    public void setDrctnMttr(String drctnMttr) {
        this.drctnMttr = drctnMttr;
    }
}
