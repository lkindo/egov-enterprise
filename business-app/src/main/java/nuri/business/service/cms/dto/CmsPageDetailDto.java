package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 관리 화면의 페이지 하나 — 초안 문서와 게시 상태.
 *
 * @param document          저장된 초안 문서(형식 v1)
 * @param pathLocked        게시한 적이 있어 주소를 바꿀 수 없다
 * @param publishedRevision 지금 보이는 게시본(없으면 미게시·게시 중지)
 */
@Schema(description = "콘텐츠 페이지 상세(초안)")
public record CmsPageDetailDto(Long contsSn, String contsPathNm, String contsTtl, String contsExpln,
                               @Schema(description = "초안 문서(형식 v1)") Object document,
                               @Schema(allowableValues = {"DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"}) String status,
                               boolean unpublishedChanges, boolean home, boolean pathLocked, Integer version,
                               CmsRevisionSummaryDto publishedRevision, long revisionCount, LocalDateTime mdfcnDt) {
}
