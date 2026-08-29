package nuri.api.controller.business.admin.content.board;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 게시판 마스터 사용여부 일괄 변경 요청 DTO
 *
 * <p>필드명은 프론트엔드 전송 본문({@code {bbsIds, useYn}})과 동일하게 유지한다. (백엔드 헌법 제3조)</p>
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

        @Schema(description = "사용여부(Y: 활성, N: 비활성)", allowableValues = { "Y", "N" })
        @Pattern(regexp = "[YN]", message = "{validation.pattern}")
        String useYn) {
}
