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
 * 콘텐츠 페이지 만들기 요청(ADR-0039). 길이는 {@code tb_cms_conts} 의 미러다. 문서 구조는 서버 검증기가 판정한다.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "콘텐츠 페이지 만들기 요청 — 초안으로 시작한다")
public class CmsPageCreateRequest {

    @Schema(description = "주소 /pages/ 뒤 경로. 영문 소문자·숫자·하이픈", maxLength = 100, example = "service-guide")
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

    @Schema(description = "문서(형식 v1: schemaVersion·sections). 허용 구조는 서버 검증기가 판정한다")
    @NotNull
    private Map<String, Object> document;
}
