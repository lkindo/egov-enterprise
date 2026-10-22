package nuri.business.service.cms.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/** 지난 게시본 하나. 복원은 이 내용을 편집기에 불러와 새 초안으로 저장하는 동작이다(ADR-0039 결정 7). */
@Schema(description = "콘텐츠 페이지 게시본")
public record CmsRevisionDetailDto(Long contsRvsnSn, long revisionNumber, String contsTtl, String contsExpln,
                                   @Schema(description = "게시 당시 문서(형식 v1)") Object document,
                                   String rvsnRsn, String frstRgtrId, LocalDateTime crtDt) {
}
