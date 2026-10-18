package nuri.business.service.board;

import nuri.business.domain.board.BoardDetailResult;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardSearchCondition;
import nuri.business.domain.board.BoardStatsResult;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardStatsResponse;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.function.Function;

/**
 * 게시판 조회 조건 정규화·게시 기간 판정·첨부 정책 검사 등 순수 게시판 도메인 보조.
 * 파일·사용자 등 타 도메인 서비스에 결합하지 않는다.
 */
final class BoardPolicySupport {

    private BoardPolicySupport() { }

    static BoardSearchCondition buildArticleSearchCondition(String bbsId, String searchCnd, String searchWrd,
            String orderBy, String startDate, String endDate, String qnaStatus, String qnaCategory,
            String dateBasis) {
        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setBbsId(bbsId);
        condition.setUseYn("Y");
        condition.setSearchCnd(searchCnd);
        condition.setSearchWrd(searchWrd);
        condition.setOrderBy(orderBy);
        condition.setQnaSttsCd(qnaStatus);
        condition.setQnaCatCd(qnaCategory);
        condition.setEventDateBasis(parseDateBasis(dateBasis));
        bindCurrentViewerVisibility(condition);
        condition.setStartDate(parseFilterDate(startDate, "startDate", LocalDate::atStartOfDay));
        condition.setEndDate(parseFilterDate(endDate, "endDate", date -> date.atTime(LocalTime.MAX)));
        condition.validateDates();
        return condition;
    }

    static BoardSearchCondition buildGlobalSearchCondition(String trimmed) {
        BoardSearchCondition condition = new BoardSearchCondition();
        condition.setUseYn("Y");
        condition.setExcludeCommunityBoards(true);
        condition.setSearchCnd("0");
        condition.setSearchWrd(trimmed);
        bindCurrentViewerVisibility(condition);
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

    static void bindCurrentViewerVisibility(BoardSearchCondition condition) {
        boolean secretPostAdminOverride = SecurityUtil.hasPermission("BOARD_READ_ALL");
        condition.setSecretPostAdminOverride(secretPostAdminOverride);
        condition.setViewerEsntlId(secretPostAdminOverride
                ? null
                : SecurityUtil.getCurrentEsntlId().orElse(null));
        // [2026-10-01 결정 23] 전체 열람 권한자가 아니면 게시 종료일을 집행한다(BoardPredicate).
        condition.setPostingOpenOn(secretPostAdminOverride ? null : todayYmd());
    }

    /** 게시 기간 판정의 기준일 — 서비스 전반과 같은 Asia/Seoul 이다. */
    static String todayYmd() {
        return LocalDate.now(ZoneId.of("Asia/Seoul"))
                .format(DateTimeFormatter.BASIC_ISO_DATE);
    }

    /** 게시 종료일이 기준일보다 이른가(빈 값은 기한 없음). */
    static boolean postingEnded(String pstEndYmd) {
        return StringUtils.hasText(pstEndYmd) && pstEndYmd.compareTo(todayYmd()) < 0;
    }

    /**
     * [2026-10-01 결정 23] 게시 종료일이 지난 글은 작성자·전체 열람 권한자만 연다. 남에게는 없는 글과 같다(404) —
     * 403 으로 답하면 번호만으로 글의 존재를 알 수 있다.
     */
    static void assertPostingVisible(BoardDetailResult detail) {
        if (postingEnded(detail.getPstEndYmd())
                && !SecurityUtil.hasPermission("BOARD_READ_ALL")
                && SecurityUtil.getCurrentEsntlId().filter(id -> id.equals(detail.getUserId())).isEmpty()) {
            throw new BusinessException(BoardErrorCode.ARTICLE_NOT_FOUND);
        }
    }

    /**
     * 새로 올릴 파일이 게시판 첨부 설정을 지키는가(2026-09-27 DIP B5 F9).
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
            return null;
        }
    }
}
