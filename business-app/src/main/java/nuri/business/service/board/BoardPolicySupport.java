package nuri.business.service.board;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardSearchCondition;
import nuri.business.domain.board.BoardStatsResult;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.business.service.board.dto.PostingStatus;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.validation.Ymd;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.function.Function;

/**
 * {@link BoardService} 의 정적 보조: 조회 조건 조립(현재 사용자의 비밀글·게시 기간 열람 범위 포함),
 * 게시 기간 열람 판정과 게시 상태, 게시 기간 쓰기 규칙, 비밀글 정책, 상단 고정 규칙, 첨부 설정 검사, 날짜 입력 해석, 응답 변환.
 * 현재 사용자 판정은 {@code SecurityUtil} 로 읽는다. 조회·저장·트랜잭션과 회원 가드는 {@link BoardService} 에 남고,
 * 이 클래스는 저장소나 파일·사용자 등 다른 도메인 서비스에 결합하지 않는다.
 *
 * <p>[2026-10-23 ADR-0040 결정 3] 기간 판정은 기준일({@code today}, yyyyMMdd)을 인자로 받는다 — 호출부가 요청마다 한 번
 * {@link #todayYmd(Clock)} 로 계산해 넘긴다. 판정은 저장값을 정규화하지 않고 사전순으로 비교한다. 목록 술어(BoardPredicate)와
 * 첨부 판정(JdbcAttachmentReferenceResolver)이 SQL·문자열로 같은 비교를 하므로, 셋이 같은 글을 같게 판정한다.
 */
final class BoardPolicySupport {

    private BoardPolicySupport() { }

    /** 게시 기간 판정의 시간대 — 서비스 전반과 같은 Asia/Seoul 이다. */
    static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    static BoardSearchCondition buildArticleSearchCondition(String bbsId, String searchCnd, String searchWrd,
            String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
            String dateBasis, String today) {
        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(bbsId);
        condition.setUseYn("Y");
        condition.setSearchCnd(searchCnd);
        condition.setSearchWrd(searchWrd);
        condition.setOrderBy(orderBy);
        condition.setQnaSttsCd(qnaStatus);
        condition.setQnaCatCd(qnaCategory);
        condition.setEventDateBasis(parseDateBasis(dateBasis));
        // [ADR-0040 결정 5] 게시판 목록은 고정 글을 기본·'date' 정렬의 앞에 둔다(통합 검색은 두지 않는다).
        condition.setPinFirst(true);
        bindCurrentViewerVisibility(condition, today);

        /*
         * [2026-08-28] 파싱 실패를 **삼키지 않는다.**
         *
         * 종전에는 log.warn 한 줄만 남기고 condition 에 아무것도 넣지 않았다. 그래서
         * 형식이 어긋난 기간 조건은 화면에 아무 신호 없이 사라졌고 — 실제로 화면이
         * ISO 문자열(`toISOString()`)을 보내고 있었으므로 **기간 필터가 늘 무동작이었다** —
         * 사용자는 기간을 골라도 목록이 그대로인 것을 보며 "해당 기간에 글이 이만큼
         * 있구나" 로 잘못 읽었다.
         *
         * 조건을 못 읽으면 조용히 넓은 결과를 주는 것보다 거절하는 편이 안전하다.
         */
        condition.setStartDate(parseFilterDate(startDate, "startDate", LocalDate::atStartOfDay));
        condition.setEndDate(parseFilterDate(endDate, "endDate", date -> date.atTime(LocalTime.MAX)));
        condition.validateDates();
        return condition;
    }

    static BoardSearchCondition buildGlobalSearchCondition(String trimmed, String today) {
        BoardSearchCondition condition = new BoardSearchCondition();
        // bbsId 를 비워 두면 게시판 한정 술어가 빠진다 — 활성 게시판(useYn='Y') 조인은
        //   searchArticles 쪽에 이미 있어 폐쇄된 게시판은 여전히 제외된다.
        condition.setUseYn("Y");
        // [2026-09-08 PD-CMTY-001] 통합 검색은 커뮤니티 귀속 게시판을 아예 제외한다.
        //   회원인지 여부를 검색 술어에 실어 나르는 대신(가입한 커뮤니티 집합을 매 검색마다
        //   조회해야 한다) 이 경로에서는 통째로 빼고, 회원은 커뮤니티 상세의 게시판 목록으로
        //   들어간다. 관리자도 제외한다 — 여기서만 열어 두면 같은 검색어가 사람마다 다른
        //   결과를 내는데 그 사실을 화면이 말하지 않는다.
        condition.setExcludeCommunityBoards(true);
        condition.setSearchCnd("0"); // 0 = 제목
        condition.setSearchWrd(trimmed);
        // 고정 우선은 게시판 단위 개념이라 여러 게시판을 섞는 통합 검색에는 두지 않는다(ADR-0040 결정 5).
        condition.setPinFirst(false);
        bindCurrentViewerVisibility(condition, today);
        return condition;
    }

    /** 통합 검색은 첫 페이지 상한만 제공한다 — 페이지를 넘겨 가며 전량 수집하는 경로를 만들지 않는다. */
    static Pageable capGlobalSearchPageable(Pageable pageable, int maxResults) {
        int size = Math.min(pageable.getPageSize(), maxResults);
        return PageRequest.of(0, size);
    }

    static BoardStatsResponse toStatsResponse(BoardStatsResult stats) {
        return BoardStatsResponse.builder()
                .totalArticles(stats.totalArticles())
                .totalViews(stats.totalViews())
                // [2026-08-29] 기여자가 없을 때 "System" 을 지어내지 않는다.
                //   글이 한 건도 없거나 작성자를 확정할 수 없는 게시판에서도 화면은
                //   '최다 기여자: System' 을 보여 줬다 — 실재하지 않는 계정을 사람처럼
                //   내세운 것이라, 관리자는 그런 사용자가 있다고 믿는다.
                //   null 을 그대로 내리면 화면이 '-' 로 렌더한다(없음과 있음을 구분).
                .topContributor(stats.topContributor())
                .build();
    }

    /** 기간 기준 어휘 밖의 값은 조용히 작성일로 넓히지 않고 거절한다(기간 조건 파싱 실패와 같은 규칙). */
    static boolean parseDateBasis(String dateBasis) {
        if (!StringUtils.hasText(dateBasis) || "CREATED".equals(dateBasis)) {
            return false;
        }
        if ("EVENT".equals(dateBasis)) {
            return true;
        }
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                "dateBasis 는 CREATED 또는 EVENT 여야 합니다.");
    }

    /**
     * 현재 사용자의 열람 범위를 조건에 싣는다. 기준일({@code baseYmd})은 뷰어와 무관하게 늘 싣고, 게시 기간 집행
     * ({@code postingOpenOn})은 조회 대행 권한자(BOARD_READ_ALL)가 아닐 때만 싣는다.
     */
    static void bindCurrentViewerVisibility(BoardSearchCondition condition, String today) {
        boolean secretPostAdminOverride = SecurityUtil.hasPermission("BOARD_READ_ALL");
        condition.setSecretPostAdminOverride(secretPostAdminOverride);
        condition.setViewerEsntlId(secretPostAdminOverride
                ? null
                : SecurityUtil.getCurrentEsntlId().orElse(null));
        condition.setBaseYmd(today);
        // [2026-10-01 결정 23·2026-10-23 ADR-0040 결정 3] 전체 열람 권한자가 아니면 게시 기간(시작일·종료일)을 집행한다
        //   (BoardPredicate). 작성자 본인은 술어의 예외로 자기 글을 계속 본다.
        condition.setPostingOpenOn(secretPostAdminOverride ? null : today);
    }

    /**
     * 게시 기간 판정의 기준일(yyyyMMdd). 시계의 시간대와 무관하게 Asia/Seoul 날짜다 — 시험의 고정 시계가 UTC 여도 운영과 같은
     * 날짜 경계를 본다. 호출부는 요청마다 한 번 계산해 같은 값을 넘긴다(ADR-0040 결정 3).
     */
    static String todayYmd(Clock clock) {
        return LocalDate.ofInstant(clock.instant(), SERVICE_ZONE)
                .format(DateTimeFormatter.BASIC_ISO_DATE);
    }

    /** 게시 종료일이 기준일보다 앞인가. 비어 있으면 기한 없음이다(목록 술어 {@code postingOpenOn} 의 부정과 같다). */
    static boolean postingEnded(String pstEndYmd, String today) {
        return pstEndYmd != null && !pstEndYmd.isEmpty() && pstEndYmd.compareTo(today) < 0;
    }

    /** 게시 시작일이 기준일보다 뒤인가. 비어 있으면 곧바로 게시다(목록 술어 {@code postingStartedOn} 의 부정과 같다). */
    static boolean postingNotStarted(String pstBgngYmd, String today) {
        return pstBgngYmd != null && !pstBgngYmd.isEmpty() && pstBgngYmd.compareTo(today) > 0;
    }

    /**
     * 서버가 판정한 게시 상태(ADR-0040 결정 3, D-5). 종료일이 지났으면 ENDED, 아니고 시작일 전이면 SCHEDULED, 그 밖은 POSTING 이다 —
     * 종료는 되돌아오지 않는 사실이라 먼저 본다. 목록 조건 {@code BoardPredicate.postingStatusIs} 와 같은 우선순위다.
     */
    static PostingStatus postingStatusOf(String pstBgngYmd, String pstEndYmd, String today) {
        if (postingEnded(pstEndYmd, today)) {
            return PostingStatus.ENDED;
        }
        if (postingNotStarted(pstBgngYmd, today)) {
            return PostingStatus.SCHEDULED;
        }
        return PostingStatus.POSTING;
    }

    /**
     * [2026-10-01 결정 23·2026-10-23 ADR-0040 결정 3] 게시 기간 밖의 글(시작일 전·종료일 뒤)은 작성자·전체 열람 권한자만 연다.
     * 남에게는 없는 글과 같다(404) — 403 으로 답하면 번호만으로 글의 존재를 알 수 있다.
     */
    static void assertPostingVisible(BoardDetailResult detail, String today) {
        if (postingStatusOf(detail.getPstBgngYmd(), detail.getPstEndYmd(), today) != PostingStatus.POSTING
                && !SecurityUtil.hasPermission("BOARD_READ_ALL")
                && SecurityUtil.getCurrentEsntlId().filter(id -> id.equals(detail.getUserId())).isEmpty()) {
            throw new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND);
        }
    }

    // ── 게시 기간 쓰기 규칙(ADR-0040 결정 3·12) ─────────────────────────────────────

    /**
     * 요청의 게시 날짜를 저장 형식(yyyyMMdd)으로 읽는다. 비었거나 null 이면 null — 수정에서는 '바꾸지 않음'이다(D-19: 빈 문자열도
     * 저장값을 지우지 않는다. 종료일 해제는 운영 일괄 처리의 명시적 동작이다). DTO 의 형식 검사를 지나지 않는 서비스 직접 호출도
     * 하이픈 형식만 받고 달력에 없는 날짜는 거절한다 — 기간 판정이 사전순 비교라 형식이 어긋나면 판정이 조용히 틀린다.
     */
    static String requestedYmd(String raw) {
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        return Ymd.compact(raw);
    }

    /**
     * 예약 게시를 받지 않는 게시판은 오늘보다 뒤의 새 시작일을 거부한다(ADR-0040 결정 3·6). 설정은 새 미래 시작일만 막는다 —
     * 저장값과 같은 시작일을 다시 보낸 수정은 호출부가 변경으로 보지 않아 여기 오지 않는다.
     *
     * @param start 정규화한 요청 시작일({@link #requestedYmd}). null 이면 판정할 것이 없다.
     */
    static void assertFutureStartAllowed(BoardMaster master, String start, String today) {
        if (postingNotStarted(start, today) && !"Y".equals(master.getRsvtPstgPsbltyYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE,
                    "이 게시판은 예약 게시를 받지 않습니다. 게시 시작일은 오늘이나 그 이전으로 정해 주세요.");
        }
    }

    /**
     * 시작일 "변경"인가 — 정규화한 요청값이 정규화한 저장값과 다를 때만이다(ADR-0040 결정 3). 형식만 다른 같은 날짜(옛 하이픈
     * 저장값)는 변경이 아니다. 요청값이 null 이면 '바꾸지 않음'이다.
     */
    static boolean startDateChanged(String storedStart, String requestedStart) {
        return requestedStart != null && !requestedStart.equals(normalizeYmd(storedStart));
    }

    /** 버전이 비어 있는 옛 게시글의 안내. tb_bbs_item.version 은 NOT NULL 이 아니다(보정·전환은 별도 승인 대상, 설계서 §7 B1). */
    static final String UNVERSIONED_POST_MESSAGE = "버전 정보가 없는 옛 글이라 고칠 수 없습니다. 관리자에게 데이터 보정을 요청해 주세요.";

    /**
     * 버전이 비어 있는 옛 게시글은 고치지 않는다(fail-closed, 400 INVALID_STATE). 낙관적 잠금으로 겹친 저장을 막을 근거가 없고,
     * 버전을 올리는 저장은 Hibernate 가 NULL 을 늘리지 못해 500 이 된다. 409 는 쓰지 않는다 — 화면이 '다시 불러오면 된다' 로
     * 읽기 때문이다.
     */
    static void assertVersioned(Board board) {
        if (board.getVersion() == null) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, UNVERSIONED_POST_MESSAGE);
        }
    }

    /**
     * 게시가 시작된 글의 시작일은 게시글 전체 수정 권한(BOARD_UPDATE_ALL) 보유자만 바꾼다(ADR-0040 결정 3·4). 작성자가 공개된
     * 글의 시작일을 미래로 옮겨 게시 기준일 정렬의 맨 위로 올리는 것을 막는다. 공개 전(시작일이 기준일보다 뒤)이면 작성자도
     * 바꾼다. 같은 시작일을 다시 보낸 수정은 변경이 아니다.
     *
     * <p>소유 판정({@code findOwnedPost})은 호출부가 먼저 한다. 이 판정은 소유자에게 남는 추가 제한이다.
     *
     * <p>접근 제한자를 {@code public} 으로 적는다 — 클래스가 패키지 전용이라 공개 범위는 그대로이고, 인가 원장의 수동 가드 대조
     * (SecurityAuthAnnotationLinterTest, manualGuardPolicies)가 명시 접근 제한자로 메서드 본문을 찾는다.
     */
    public static void assertStartDateChangeAllowed(String storedStart, String requestedStart, String today) {
        if (!startDateChanged(storedStart, requestedStart)) {
            return;
        }
        if (!postingNotStarted(storedStart, today) && !SecurityUtil.hasPermission("BOARD_UPDATE_ALL")) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED,
                    "게시가 시작된 글의 시작일은 게시글 전체 수정 권한이 있어야 바꿀 수 있습니다.");
        }
    }

    /**
     * 합친 뒤의 게시 기간 순서. 요청에 한쪽 날짜만 오면 DTO 의 클래스 단위 검사({@code @YmdRange})가 보지 못하므로 저장값과
     * 합친 값으로 다시 본다. 비어 있는 쪽이 있으면 순서를 따지지 않는다.
     */
    static void assertPeriodOrder(String start, String end) {
        if (periodReversed(start, end)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "종료일은 시작일보다 빠를 수 없습니다.");
        }
    }

    /** 두 날짜가 모두 있고 시작이 종료보다 뒤인가. */
    static boolean periodReversed(String start, String end) {
        return start != null && !start.isEmpty() && end != null && !end.isEmpty()
                && normalizeYmd(start).compareTo(normalizeYmd(end)) > 0;
    }

    /**
     * 운영 화면 경로 전용: 오늘보다 이른 종료일로 바꾸지 않는다(설계서 §5.4 — 바로 내리기는 범위 밖). 작성 화면 경로의 과거
     * 종료일은 종전대로 받는다(D-13 비대칭).
     */
    static void assertEndNotPast(String end, String today) {
        if (end != null && !end.isEmpty() && end.compareTo(today) < 0) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "게시 종료일은 오늘이나 그 뒤로 정해 주세요. 오늘보다 이른 날로 바로 내리기는 지원하지 않습니다.");
        }
    }

    // ── 비밀글 정책(ADR-0040 결정 7) ─────────────────────────────────────────────

    /**
     * 저장할 비밀글 여부. 비밀글 정책이 REQUIRED 인 게시판은 요청과 관계없이 'Y' 다 — 요청이 'N' 이거나 비어 있어도, 공개 상태로 남아
     * 있던 옛 글을 고칠 때도 비밀글로 저장한다(열람 범위를 좁히기만 하므로 H3 위반이 아니다). 그 밖(NONE·OPTIONAL)은 지금처럼
     * 요청값, 요청이 없으면 저장값이다 — NONE 은 도움말 1:1 문의가 보내는 'Y' 를 그대로 지킨다(Q&A 게시판, H3). 선택 UI 를 두는
     * 것(OPTIONAL)은 화면의 몫이라 서버 동작은 NONE 과 같다.
     *
     * <p>[2026-10-29] 요청도 저장값도 없으면 'N' 이다(등록·답글, 또는 NULL 로 남은 옛 글의 수정). 종전에는 NULL 로 저장돼 공개 FAQ 응답
     * 계약(scrtYn 'N')과 어긋났다. 열람 판정은 모두 NULL 을 공개 글로 보므로 'N' 저장은 열람 범위를 바꾸지 않는다. 저장값이 있으면
     * 지금처럼 그 값을 둔다.
     *
     * @param stored 수정이면 지금 저장값, 등록·답글이면 null
     */
    static String resolveSecretYn(BoardMaster master, String requested, String stored) {
        if (master.requiresPrivatePosts()) {
            return "Y";
        }
        if (requested != null) {
            return requested;
        }
        return stored != null ? stored : "N";
    }

    // ── 상단 고정 규칙(ADR-0040 결정 5) ─────────────────────────────────────────────

    /**
     * 기준일에 상단 고정 중인가 — 고정 표시가 Y 이고 종료일이 기준일과 같거나 뒤다(종료일 당일까지 고정). 목록 술어
     * {@code BoardPredicate.pinActiveOn}·상한 집계 {@code BoardRepository#countActivePins} 와 같은 사전순 비교다.
     */
    static boolean pinActive(String upendFixYn, String upendFixEndYmd, String today) {
        return "Y".equals(upendFixYn) && upendFixEndYmd != null && upendFixEndYmd.compareTo(today) >= 0;
    }

    /** 고정 요청의 Y·N. DTO 검사를 지나지 않는 서비스 직접 호출도 그 밖의 값은 400 으로 거절한다. */
    static boolean parsePinRequest(String upendFixYn) {
        if ("Y".equals(upendFixYn)) {
            return true;
        }
        if ("N".equals(upendFixYn)) {
            return false;
        }
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "upendFixYn 은 Y 또는 N 이어야 합니다.");
    }

    /**
     * 고정할 때의 종료일(ADR-0040 결정 5). 요청이 비었으면 오늘부터 게시판의 고정 기본 일수 뒤, 있으면 그 날이다. 오늘보다 이른
     * 날은 400 이다(오늘은 받는다 — 오늘 하루 고정).
     */
    static String pinEndYmd(BoardMaster master, String requestedEnd, String today) {
        String end = requestedYmd(requestedEnd);
        if (end == null) {
            return LocalDate.parse(today, DateTimeFormatter.BASIC_ISO_DATE)
                    .plusDays(master.getUpendFixBscDayCnt().longValue())
                    .format(DateTimeFormatter.BASIC_ISO_DATE);
        }
        if (end.compareTo(today) < 0) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "고정 종료일은 오늘이나 그 뒤로 정해 주세요.");
        }
        return end;
    }

    /**
     * 고정을 받는 게시판인가(ADR-0040 결정 5·6). 설정은 새 고정만 막는다 — 해제는 이 판정을 지나지 않고, 이미 고정된 글은 종료일까지
     * 그대로다.
     */
    static void assertPinsAccepted(BoardMaster master) {
        if (!"Y".equals(master.getUpendFixPsbltyYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "이 게시판은 상단 고정을 받지 않습니다.");
        }
    }

    /**
     * 새 고정이 상한을 지키는가(ADR-0040 결정 5). 새로 고정 중이 되는 글 수와 지금 고정 중인 글 수의 합이 상한을 넘으면 거부한다.
     * 이미 고정 중인 글(종료일만 바뀌는 글)은 새로 세지 않는다 — 상한을 낮춘 뒤에도 그 글의 종료일은 바꿀 수 있다.
     *
     * @param newlyActive 이 요청으로 새로 고정 중이 되는 글 수
     * @param active      지금 고정 중인 글 수(마스터 행을 잠근 뒤 센 값)
     */
    static void assertPinLimit(BoardMaster master, long newlyActive, long active) {
        long limit = master.getUpendFixUplmtNocs().longValue();
        if (newlyActive > 0 && active + newlyActive > limit) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE,
                    "이 게시판은 상단 고정을 최대 " + limit + "건까지 둡니다(지금 " + active + "건). "
                            + "다른 고정을 해제하거나 상한을 올린 뒤 다시 고정해 주세요.");
        }
    }

    /**
     * 새로 올릴 파일이 게시판 첨부 설정을 지키는가(2026-09-27 DIP B5 F9). 종전에는 설정이 저장될 뿐 집행자가 없어,
     * 첨부를 3개·5MB 로 정한 게시판에도 요청당 20개·10MB 까지 붙었다.
     *
     * @param existing 이미 글에 붙은 파일 수
     */
    static void assertNewFilesAllowed(BoardMaster master, int existing, List<MultipartFile> files) {
        List<MultipartFile> incoming = files == null ? List.of()
                : files.stream().filter(file -> file != null && !file.isEmpty()).toList();
        if (incoming.isEmpty()) return;
        assertAttachmentPolicy(master, existing, incoming.size());
        Long maxBytes = master.getAtchPsbltyFileSz();
        if (maxBytes != null && maxBytes > 0) {
            for (MultipartFile file : incoming) {
                if (file.getSize() > maxBytes) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                            "이 게시판은 파일 하나당 최대 " + describeBytes(maxBytes) + "까지 받습니다.");
                }
            }
        }
    }

    /** 첨부 허용 여부와 파일 수. 파일 수가 0 이하이거나 비어 있으면 게시판 상한이 없다(서버 전역 상한만 적용). */
    static void assertAttachmentPolicy(BoardMaster master, int existing, int incoming) {
        if (incoming <= 0) return;
        if (!"Y".equals(master.getFileAtchPsbltyYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "이 게시판은 파일 첨부를 받지 않습니다.");
        }
        Integer maxFiles = master.getAtchPsbltyFileQty();
        if (maxFiles != null && maxFiles > 0 && existing + incoming > maxFiles) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "이 게시판은 첨부 파일을 최대 " + maxFiles + "개까지 받습니다.");
        }
    }

    /**
     * 미리 올린 첨부 묶음을 글에 새로 붙일 때 게시판 첨부 설정(허용·파일 수·파일당 크기)을 지키는가.
     *
     * <p>[2026-10-26 ADR-0043, SET-02] 종전에는 등록만 파일 수를 보고 크기는 보지 않았고, JSON 수정은 묶음을 바꿔도 설정을 전혀 보지
     * 않았다. 그래서 첨부를 끄거나 줄인 게시판에도 미리 올린 묶음으로 파일이 붙었다(DEC-OPS-173 ②의 집행 빈틈). 묶음이 바뀔 때만
     * 부른다 — 화면은 수정에서 같은 묶음 번호를 다시 보내므로, 이미 붙은 파일은 설정을 줄여도 그대로 둔다(전향 적용).
     *
     * @param fileSizes 묶음 안 파일의 크기(바이트). 크기를 모르는 항목은 null 이고 크기 검사에서 뺀다
     */
    static void assertAttachedGroupAllowed(BoardMaster master, List<Long> fileSizes) {
        List<Long> sizes = fileSizes == null ? List.of() : fileSizes;
        assertAttachmentPolicy(master, 0, sizes.size());
        Long maxBytes = master.getAtchPsbltyFileSz();
        if (maxBytes != null && maxBytes > 0) {
            for (Long size : sizes) {
                if (size != null && size > maxBytes) {
                    throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                            "이 게시판은 파일 하나당 최대 " + describeBytes(maxBytes) + "까지 받습니다.");
                }
            }
        }
    }

    /** Q&A 화면 유형 템플릿 — 해결 상태를 가진 게시판은 이것뿐이다(화면 BoardTemplates 와 같은 판정). */
    static final String QNA_TEMPLATE_ID = nuri.business.service.board.dto.BoardLayoutIds.QNA;

    /**
     * Q&A 상태 값을 이 게시판이 받는가. [2026-10-26 ADR-0043] 상태 값은 Q&A 화면 유형 게시판의 글만 가진다 — 다른 게시판에 보낸 값은
     * 400 이다. 보내지 않으면(null) 통과한다(등록은 기본값, 수정은 저장값). 값의 어휘(OPEN·SOLVED)는 요청 검사가 본다.
     */
    static void assertQnaStatusAllowed(BoardMaster master, String qnaSttsCd) {
        if (qnaSttsCd != null && !QNA_TEMPLATE_ID.equals(master.getTmpltId())) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "Q&A 상태는 Q&A 게시판의 글에만 둘 수 있습니다.");
        }
    }

    static String describeBytes(long bytes) {
        long mb = 1024L * 1024L;
        return bytes % mb == 0 ? (bytes / mb) + "MB" : bytes + "바이트";
    }

    static BoardDto toPublicFaqDetailDto(BoardDetailResult detail) {
        return BoardDto.builder()
                .bbsId(detail.getBbsId())
                .pstSn(detail.getPstSn())
                .pstTtl(detail.getPstTtl())
                .pstCn(detail.getPstCn())
                .inqCnt(detail.getInqCnt())
                .crtDt(detail.getCrtDt())
                .useYn(detail.getUseYn())
                .scrtYn(detail.getScrtYn())
                .build();
    }

    /**
     * 목록 기간 필터의 날짜 한쪽을 읽는다. 값이 없으면 {@code null}(조건 없음)이고,
     * 형식이 어긋나면 400 으로 거절한다 — 조용히 무시하면 필터가 걸린 척하는 목록이 된다.
     */
    static LocalDateTime parseFilterDate(String raw, String field,
            Function<LocalDate, LocalDateTime> toDateTime) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            return toDateTime.apply(LocalDate.parse(raw));
        } catch (DateTimeParseException e) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    field + " 는 yyyy-MM-dd 형식이어야 합니다: " + raw);
        }
    }

    /**
     * 게시 시작/종료일자(YYYY-MM-DD 또는 YYYYMMDD)를 물리 컬럼 표준(YYYYMMDD, varchar(8))으로 정규화한다.
     * V2_18 스키마 동기화 — 하이픈 데이터 유입 경로 봉쇄.
     */
    static String normalizeYmd(String ymd) {
        return ymd == null ? null : ymd.replace("-", "");
    }

    static LocalDateTime parseDateTime(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return null;
        try {
            if (dateStr.length() == 10) {
                return LocalDate.parse(dateStr).atStartOfDay();
            }
            return LocalDateTime.parse(dateStr);
        } catch (DateTimeParseException e) {
            // null·빈 값은 위에서 걸렀으므로 parse 가 던지는 것은 이 예외뿐이다. 형식이 어긋난 행사 일자는
            // 종전대로 없는 값으로 둔다(형식 오류를 400 으로 거절할지는 별도 결정 — 목록 필터의 parseFilterDate 와 다르다).
            return null;
        }
    }
}
