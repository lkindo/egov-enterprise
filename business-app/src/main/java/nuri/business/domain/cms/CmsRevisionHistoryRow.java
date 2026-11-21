package nuri.business.domain.cms;

import java.time.LocalDateTime;

/** 게시 이력 목록용 행. 게시한 적 없는 페이지는 외부 조인의 게시본 번호가 비어 있다. */
public record CmsRevisionHistoryRow(Long contsRvsnSn, String contsTtl, String rvsnRsn,
                                    String frstRgtrId, LocalDateTime crtDt, boolean current) {
}
