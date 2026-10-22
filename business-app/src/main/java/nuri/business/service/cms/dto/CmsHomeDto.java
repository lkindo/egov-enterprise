package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 업무 홈 소개 지정 상태.
 *
 * @param contsSn 지정된 페이지(없으면 지정 없음)
 * @param version 홈 설정 버전(페이지 버전과 따로 센다)
 */
@Schema(description = "업무 홈 소개 지정")
public record CmsHomeDto(Long contsSn, String contsPathNm, String contsTtl, Integer version) {
}
