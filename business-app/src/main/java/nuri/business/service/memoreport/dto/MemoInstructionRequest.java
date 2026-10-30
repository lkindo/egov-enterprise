package nuri.business.service.memoreport.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 메모보고 지시사항 입력 계약.
 *
 * <p>[2026-09-24] api-server 에서 이 도메인 패키지로 옮겼다. 컨트롤러는 demo pack 과 함께 빠지는데 이 DTO 는
 * demo 타입을 참조하지 않아, 축소 프로필에 참조처 없는 파일로 남았다.
 */
@Schema(description = "메모보고 지시사항 요청")
public class MemoInstructionRequest {

    public static final String READ_TOKEN_PATTERN = "^[a-f0-9]{64}$";

    @Schema(description = "지시사항", minLength = 1, maxLength = 2000)
    @NotBlank
    @Size(min = 1, max = 2000)
    private String drctnMttr;

    @Schema(description = "상세에서 확인한 본문·첨부의 내용 비교 토큰", minLength = 64, maxLength = 64)
    @NotBlank
    @Size(min = 64, max = 64)
    @Pattern(regexp = READ_TOKEN_PATTERN)
    private String instructionReadToken;

    public MemoInstructionRequest() {
    }

    public MemoInstructionRequest(String drctnMttr, String instructionReadToken) {
        this.drctnMttr = drctnMttr;
        this.instructionReadToken = instructionReadToken;
    }

    /**
     * 두 필드가 문자열인 객체만 받는다. 토큰 없는 옛 문자열 요청을 최신 내용으로 보충하지 않는다.
     *
     * <p>Object 위임으로 JSON 숫자·불린을 문자열로 자동 변환하지 않는다. 잘못된 타입은 비워
     * {@code @NotBlank} 가 400으로 거절하며 Jackson 3와 호환되지 않는 Jackson 2 JsonNode는 쓰지 않는다.
     */
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static MemoInstructionRequest fromJson(Object body) {
        if (body instanceof java.util.Map<?, ?> fields) {
            return new MemoInstructionRequest(
                    fields.get("drctnMttr") instanceof String text ? text : null,
                    fields.get("instructionReadToken") instanceof String token ? token : null);
        }
        return new MemoInstructionRequest(null, null);
    }

    public String getDrctnMttr() {
        return drctnMttr;
    }

    public void setDrctnMttr(String drctnMttr) {
        this.drctnMttr = drctnMttr;
    }

    public String getInstructionReadToken() {
        return instructionReadToken;
    }

    public void setInstructionReadToken(String instructionReadToken) {
        this.instructionReadToken = instructionReadToken;
    }
}
