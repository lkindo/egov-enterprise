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
        String plcyCn) {
}
