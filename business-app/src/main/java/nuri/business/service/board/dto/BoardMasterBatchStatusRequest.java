package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 게시판 마스터 사용여부 일괄 변경 요청 DTO
 *
 * <p>필드명은 프론트엔드 전송 본문({@code {bbsIds, useYn}})과 동일하게 유지한다. (백엔드 헌법 제3조)</p>
 *
 * <p>[2026-10-26 ADR-0043, SET-12] 입력 계약 원장에 등재하면서 api-server 컨트롤러 패키지에서 게시판 DTO 패키지로 옮겼다 — 같은 DTO 의
 * 길이·필수 표적이 같은 기능(게시판) 소유여야 생성물에서 함께 남고 빠진다(input-contract-mirror-census-contract). 요청 형태는 그대로다.</p>
 */
@Schema(description = "게시판 마스터 사용여부 일괄 변경 요청")
public record BoardMasterBatchStatusRequest(

        @ArraySchema(
                arraySchema = @Schema(description = "대상 게시판 ID 목록"),
                schema = @Schema(implementation = String.class),
                minItems = 1,
                maxItems = 100)
        @NotEmpty(message = "{validation.required}")
        @Size(min = 1, max = 100, message = "게시판 ID는 한 번에 1개 이상 100개까지 처리할 수 있습니다.")
        List<String> bbsIds,

        // [2026-10-26 ADR-0043, SET-12] 필수다 — 종전에는 빠진 요청이 NOT NULL 컬럼에 null 을 쓰려다 저장 단계에서 실패했다.
        //   형식은 입력 계약 원장(enumBindings)의 정규형이다.
        @Schema(description = "사용여부(Y: 활성, N: 비활성)", allowableValues = { "Y", "N" },
                requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "{validation.required}")
        @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
        @Size(max = 1)
        String useYn) {
}
