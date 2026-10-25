package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 관리 목록의 한 행.
 *
 * @param status             DRAFT(한 번도 게시하지 않음)·PUBLISHED·UNPUBLISHED(게시 중지)·ARCHIVED (ADR-0042)
 * @param unpublishedChanges 게시 중인데 저장한 초안이 게시본과 다르다
 * @param home               업무 홈 맨 위에 보이도록 지정된 페이지다
 * @param publishedAt        지금 보이는 게시본을 게시한 시각(게시 중이 아니면 없음)
 */
@Schema(description = "콘텐츠 페이지 목록 행")
public record CmsPageSummaryDto(Long contsSn, String contsPathNm, String contsTtl,
                                @Schema(allowableValues = {"DRAFT", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"}) String status,
                                boolean unpublishedChanges, boolean home, Integer version, LocalDateTime mdfcnDt,
                                LocalDateTime publishedAt) {
}
