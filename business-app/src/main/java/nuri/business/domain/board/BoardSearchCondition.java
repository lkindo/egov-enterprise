package nuri.business.domain.board;

import lombok.Data;
import org.jspecify.annotations.NonNull;

@Data
public class BoardSearchCondition {
    @NonNull
    private String bbsId;
    private String searchCnd;
    private String searchWrd;
    private String useYn;
    private String frstRgtrId;
    private java.time.LocalDateTime startDate;
    private java.time.LocalDateTime endDate;
    private String orderBy; // "date", "views", "comments"
    private String qnaSttsCd;
    private String qnaCatCd;
    /** 기간 조건을 행사일(없으면 작성일)로 본다. 캘린더 템플릿용(DIP V6). */
    private boolean eventDateBasis;
    private String viewerEsntlId;
    private boolean secretPostAdminOverride;
    /**
     * 커뮤니티 귀속 게시판(tb_bbs_master.cmnty_sn IS NOT NULL)을 결과에서 제외할지.
     *
     * <p>[2026-09-08 PD-CMTY-001] 통합 검색 전용 축이다. 게시판 한정 목록은 진입 시점에
     * 회원 여부를 이미 판정하므로(BoardService.assertCommunityAccess) 이 값을 켜지 않는다.
     */
    private boolean excludeCommunityBoards;
    /**
     * [2026-10-01 결정 23] 게시 종료일 집행 기준일(yyyyMMdd, Asia/Seoul). 값이 있으면 종료일이 이 날보다 이른 글은
     * 작성자 본인(viewerEsntlId) 밖에서 빠진다. 전체 열람 권한자는 null 이라 모든 글을 본다.
     */
    private String postingOpenOn;
    // Default constructor for cases where full initialization isn't needed
    // immediately
    public BoardSearchCondition() {
        this.bbsId = "";
    }

    public BoardSearchCondition(@NonNull String bbsId) {
        this.bbsId = bbsId;
    }

    public void validateDates() {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new nuri.foundation.core.exception.BusinessException(
                "시작일은 종료일보다 빨라야 합니다.", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
