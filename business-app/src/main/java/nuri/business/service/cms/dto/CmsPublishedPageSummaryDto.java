package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 사용자 화면의 안내 페이지 목록 한 행(ADR-0042). 지금 보이는 게시본의 제목·요약만 싣는다.
 *
 * @param publishedAt 지금 보이는 게시본을 게시한 시각
 */
@Schema(description = "게시된 콘텐츠 페이지 목록 행")
public record CmsPublishedPageSummaryDto(String contsPathNm, String contsTtl, String contsExpln,
                                         LocalDateTime publishedAt) {
}
