package nuri.api.controller.foundation.controller.system.policy;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 시스템 정책 수정 요청 DTO
 *
 * <p>필드명은 DB 컬럼 표준(tb_plcy_manage.plcy_ttl / plcy_cn) 및
 * 프론트엔드 전송 필드와 동일하게 유지한다. (백엔드 헌법 제3조)</p>
 */
@Schema(description = "시스템 정책 수정 요청 DTO")
public record PolicyUpdateRequest(

        @Schema(description = "정책 제목")
        @NotBlank(message = "{validation.required}")
        @Size(max = 100, message = "{validation.size.max}")
        String plcyTtl,

        @Schema(description = "정책 내용")
        @NotBlank(message = "{validation.required}")
        @Size(max = 4000, message = "{validation.size.max}")
        String plcyCn,

        @Schema(description = "낙관적 잠금 버전(V2_155). 조회한 값을 수정 요청에 그대로 돌려보내며 이미 있는 정책을 고칠 때 필수다 "
                + "— 다르면 409. 등록과 없는 유형의 첫 저장에서는 무시한다.")
        @jakarta.validation.constraints.Min(0)
        Integer version) {

    /** 버전 없는 요청(등록) — 기존 호출 모양을 유지한다. */
    public PolicyUpdateRequest(String plcyTtl, String plcyCn) {
        this(plcyTtl, plcyCn, null);
    }
}
