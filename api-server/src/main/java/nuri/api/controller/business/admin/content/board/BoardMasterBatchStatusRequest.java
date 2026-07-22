package nuri.api.controller.business.admin.content.board;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;

import java.util.List;

/**
 * 게시판 마스터 사용여부 일괄 변경 요청 DTO
 *
 * <p>필드명은 프론트엔드 전송 본문({@code {bbsIds, useYn}})과 동일하게 유지한다. (백엔드 헌법 제3조)</p>
 */
@Schema(description = "게시판 마스터 사용여부 일괄 변경 요청")
public record BoardMasterBatchStatusRequest(

        @Schema(description = "대상 게시판 ID 목록")
        @NotEmpty(message = "{validation.required}")
        List<String> bbsIds,

        @Schema(description = "사용여부(Y: 활성, N: 비활성)", allowableValues = { "Y", "N" })
        @Pattern(regexp = "[YN]", message = "{validation.pattern}")
        String useYn) {
}
