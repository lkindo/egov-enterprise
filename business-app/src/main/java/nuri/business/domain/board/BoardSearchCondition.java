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
    // "views"·"comments" 는 그 열을 먼저 보고, 그 밖(비어 있음·"date"·모르는 값)은 게시 기준일 순이다(2026-10-23 ADR-0040 결정 4).
    private String orderBy;
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
     * 게시 기간 집행 기준일(yyyyMMdd, Asia/Seoul) — [2026-10-01 결정 23] 종료일, [2026-10-23 ADR-0040 결정 3] 시작일. 값이 있으면
     * 시작일이 이 날보다 뒤이거나 종료일이 이 날보다 앞인 글은 작성자 본인(viewerEsntlId) 밖에서 빠진다. 조회 대행 권한자
     * (BOARD_READ_ALL)는 null 이라 모든 글을 본다. 이름은 종전 그대로 둔다(뜻만 기간 전체로 넓혔다).
     */
    private String postingOpenOn;
    /**
     * [2026-10-23 ADR-0040 결정 3] 서버 기준일(yyyyMMdd, Asia/Seoul) — 뷰어와 무관하게 늘 채운다. 게시 상태 조건과 정렬의 고정 판정이
     * 쓴다. {@link #postingOpenOn} 은 가시성이라 조회 대행 권한자에게는 비어 있어, 상태 조건을 그 값으로 걸 수 없다.
     */
    private String baseYmd;
    /** [2026-10-23 ADR-0040 결정 3] 게시 상태 조건(SCHEDULED·POSTING·ENDED). null 이면 조건 없음. 가시성과 독립이다. */
    private nuri.business.service.board.dto.PostingStatus postingStatus;
    /**
     * [ADR-0040 결정 5, B2] 상단 고정 조건 — true 면 기준일({@link #baseYmd})에 고정 중인 글, false 면 그 밖의 글이다. null 이면 조건
     * 없음. 가시성과 독립이다.
     */
    private Boolean pinned;
    /**
     * [ADR-0040 결정 5, B2] 게시판 목록의 기본·'date' 정렬(조회순·댓글순이 아닌 정렬)에서 기준일에 고정 중인 글을 앞에 둘지.
     * 게시판 단위 목록만 켜고 통합 검색은 끈다.
     */
    private boolean pinFirst;
    /**
     * [2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판(tb_bbs_master.use_yn='N')의 글도 목록에 싣는다. 게시판 한정 목록에서
     * 호출부가 조회 대행 권한(BOARD_READ_ALL)과 사용 안 함을 이미 판정한 경우에만 켠다(BoardService.getBoardPosts).
     * 통합 검색·통계·업무 홈 카드는 켜지 않는다 — 이용자와 같은 결과를 보인다.
     */
    private boolean includeInactiveBoard;
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
