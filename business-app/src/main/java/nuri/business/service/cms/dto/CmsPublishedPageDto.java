package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/** 사용자에게 보이는 게시본. 초안이나 지난 게시본은 이 응답으로 나가지 않는다. */
@Schema(description = "게시된 콘텐츠 페이지")
public record CmsPublishedPageDto(String contsPathNm, String contsTtl, String contsExpln,
                                  @Schema(description = "게시 문서(형식 v1)") Object document,
                                  long revisionNumber, LocalDateTime publishedAt) {
}
