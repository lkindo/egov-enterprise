package nuri.business.service.memoreport.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.databind.JsonNode;
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

    /** 기존 application/json 문자열 본문과 신규 객체 본문을 함께 수용한다. */
    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static MemoInstructionRequest fromJson(JsonNode node) {
        if (node != null && node.isTextual()) {
            return new MemoInstructionRequest(node.textValue());
        }
        if (node != null && node.isObject() && node.path("drctnMttr").isTextual()) {
            return new MemoInstructionRequest(node.path("drctnMttr").textValue());
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
