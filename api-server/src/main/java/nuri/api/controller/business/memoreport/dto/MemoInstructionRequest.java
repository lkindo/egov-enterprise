package nuri.api.controller.business.memoreport.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 메모보고 지시사항 입력 계약. */
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
