package nuri.business.service.informalsanction;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Set;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

/**
 * 결재 목록 조회 조건(2026-09-26 DIP B5 F4) — 제목 검색어·요청일 기간·문서 상태.
 *
 * <p>값이 비어 있으면 조건이 없다. 해석할 수 없는 값은 조용히 무시하지 않고 400 으로 거부한다 — 무시하면 사용자는
 * 조건이 걸린 결과로 읽는다(로그 기간 판정 {@code LogSearchPeriod} 과 같은 원칙).
 */
public record ApprovalListFilter(String keywordPattern, String fromYmd, String toYmd, String status) {

    public static final ApprovalListFilter NONE = new ApprovalListFilter(null, null, null, null);
    static final int KEYWORD_MAX = 100;
    private static final Set<String> STATUSES = Set.of("A", "C", "R", "W");

    public static ApprovalListFilter of(String keyword, String fromYmd, String toYmd, String status) {
        String trimmed = keyword == null ? "" : keyword.trim();
        if (trimmed.length() > KEYWORD_MAX) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "검색어는 " + KEYWORD_MAX + "자 이내로 입력해 주세요.");
        }
        String from = compactDate(fromYmd);
        String to = compactDate(toYmd);
        if (from != null && to != null && from.compareTo(to) > 0) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "조회 시작일이 종료일보다 늦습니다.");
        }
        String normalizedStatus = status == null || status.isBlank() ? null : status.trim();
        if (normalizedStatus != null && !STATUSES.contains(normalizedStatus)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "알 수 없는 결재 상태입니다.");
        }
        return new ApprovalListFilter(trimmed.isEmpty() ? null : "%" + escapeLike(trimmed.toLowerCase(Locale.ROOT)) + "%",
                from, to, normalizedStatus);
    }

    /** 대기함은 늘 대기 문서라 상태 조건을 받지 않는다. */
    public ApprovalListFilter withoutStatus() {
        return new ApprovalListFilter(keywordPattern, fromYmd, toYmd, null);
    }

    private static String compactDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim().replace("-", ""), DateTimeFormatter.BASIC_ISO_DATE)
                    .format(DateTimeFormatter.BASIC_ISO_DATE);
        } catch (DateTimeParseException e) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "조회 기간은 yyyy-MM-dd 형식으로 입력해 주세요.");
        }
    }

    /**
     * LIKE 의 와일드카드를 글자로 찾게 한다. 질의는 {@code escape '!'} 를 쓴다 — 백슬래시는 Java 문자열 안에서
     * 작은따옴표 이스케이프와 겹쳐 JPQL 이 빈 이스케이프 문자로 읽혔다(앱 시작 시 질의 검증 실패로 실측).
     */
    private static String escapeLike(String value) {
        return value.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
