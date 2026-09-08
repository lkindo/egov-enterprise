package nuri.business.domain.board;

import lombok.Data;
import org.springframework.lang.NonNull;

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
    private String viewerEsntlId;
    private boolean secretPostAdminOverride;
    /**
     * 커뮤니티 귀속 게시판(tb_bbs_master.cmnty_sn IS NOT NULL)을 결과에서 제외할지.
     *
     * <p>[2026-09-08 PD-CMTY-001] 통합 검색 전용 축이다. 게시판 한정 목록은 진입 시점에
     * 회원 여부를 이미 판정하므로(BoardService.assertCommunityAccess) 이 값을 켜지 않는다.
     */
    private boolean excludeCommunityBoards;
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
