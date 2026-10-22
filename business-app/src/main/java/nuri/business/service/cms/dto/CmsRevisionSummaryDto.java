package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 게시 이력 한 건.
 *
 * @param revisionNumber 같은 페이지 안의 게시 순번(v1, v2 …)
 * @param current        지금 사용자에게 보이는 게시본이다
 */
@Schema(description = "콘텐츠 페이지 게시 이력")
public record CmsRevisionSummaryDto(Long contsRvsnSn, long revisionNumber, String contsTtl, String rvsnRsn,
                                    String frstRgtrId, LocalDateTime crtDt, boolean current) {
}
