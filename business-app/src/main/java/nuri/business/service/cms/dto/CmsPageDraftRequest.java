package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * 초안 저장 요청(ADR-0039). 화면이 읽은 버전과 다르면 409 다. 주소는 게시 이력이 없을 때만 바꿀 수 있다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "콘텐츠 페이지 초안 저장 요청 — 게시본은 바뀌지 않는다")
public class CmsPageDraftRequest {

    @Schema(description = "주소 /pages/ 뒤 경로. 게시한 적이 있으면 지금 값과 같아야 한다", maxLength = 100)
    @NotBlank
    @Size(max = 100)
    @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$")
    private String contsPathNm;

    @Schema(description = "페이지 제목", maxLength = 256)
    @NotBlank
    @Size(max = 256)
    private String contsTtl;

    @Schema(description = "제목 아래 요약", maxLength = 4000)
    @Size(max = 4000)
    private String contsExpln;

    @Schema(description = "문서(형식 v1)")
    @NotNull
    private Map<String, Object> document;

    @Schema(description = "화면이 읽은 페이지 버전")
    @NotNull
    private Integer version;
}
