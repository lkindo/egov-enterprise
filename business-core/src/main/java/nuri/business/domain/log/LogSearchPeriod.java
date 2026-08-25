package nuri.business.domain.log;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;

/**
 * 로그 조회 기간 파라미터의 단일 해석 규칙.
 *
 * <p>[왜 필요한가 — 2026-08-26 실측]
 * 로그 저장소 5종이 같은 파라미터({@code searchBgnDe}/{@code searchEndDe})를 <b>서로 다른 형식</b>으로
 * 해석하고 있었다.
 *
 * <ul>
 *   <li>{@code SysLog} — {@code ocrnYmd}(8자리 컬럼)와 하이픈 제거 없이 문자열 비교</li>
 *   <li>{@code LoginLog} — {@code yyyyMMdd} 로 파싱</li>
 *   <li>{@code PrivacyLog} — {@code yyyy-MM-dd} 로 파싱</li>
 *   <li>{@code UserLog}·{@code WebLog} — 하이픈을 제거한 뒤 비교(둘 다 수용)</li>
 * </ul>
 *
 * <p>진짜 위험은 형식이 다르다는 것 자체가 아니라 <b>틀렸을 때 조용하다는 것</b>이었다.
 * 파싱 실패는 {@code catch} 가 조건을 {@code null} 로 만들어 <b>필터가 통째로 무시</b>됐고,
 * 문자열 비교가 어긋나면 <b>빈 결과</b>가 나왔다. 두 경우 모두 화면은 "기간을 좁혔다"고 보여 주는데
 * 실제 결과는 전체이거나 0건이다 — 감사·장애 조사에서 잘못된 결론으로 직결된다.
 *
 * <p>이 클래스는 두 형식을 모두 받아들이되, <b>해석할 수 없는 값은 조용히 버리지 않고
 * {@link BusinessException} 으로 즉시 실패</b>시킨다. 조건을 못 지킨 조회 결과를 정상처럼
 * 돌려주는 것보다 400 으로 알려 주는 편이 언제나 안전하다.
 *
 * <p>⚠ 한쪽만 주어진 기간은 조건 없음으로 본다. 저장소가 {@code between} 을 쓰므로 한쪽만으로는
 * 범위가 성립하지 않으며, 이때 한쪽 값을 임의로 보정하면 사용자가 지정하지 않은 범위를
 * 시스템이 만들어 내는 셈이 된다.
 */
public final class LogSearchPeriod {

    /**
     * 8자리 연월일(예: {@code 20260826}). 저장소 컬럼 표준(연월일C8)과 같은 형식이다.
     *
     * <p>⚠ {@code uuuu} + {@link ResolverStyle#STRICT} 다. 기본 SMART 리졸버는 존재하지 않는 날짜를
     * <b>말일로 보정</b>해 버려서({@code 20260231} → 2026-02-28) 사용자가 지정하지 않은 기간을
     * 시스템이 만들어 낸다 — 실측으로 확인한 뒤 STRICT 로 바꿨다.
     */
    private static final DateTimeFormatter COMPACT =
            DateTimeFormatter.ofPattern("uuuuMMdd").withResolverStyle(ResolverStyle.STRICT);

    private LogSearchPeriod() {
    }

    /** 시작·종료가 모두 주어졌는지. 한쪽만 있으면 기간 조건이 성립하지 않는다. */
    public static boolean isComplete(String searchBgnDe, String searchEndDe) {
        return StringUtils.hasText(searchBgnDe) && StringUtils.hasText(searchEndDe);
    }

    /**
     * 두 형식({@code yyyyMMdd}, {@code yyyy-MM-dd})을 모두 받아 8자리 문자열로 정규화한다.
     *
     * @throws BusinessException 해석할 수 없는 값일 때. 조용히 무시하지 않는 것이 이 메서드의 요점이다.
     */
    public static String toCompact(String value, String parameterName) {
        return toLocalDate(value, parameterName).format(COMPACT);
    }

    /**
     * 두 형식을 모두 받아 {@link LocalDate} 로 해석한다.
     *
     * @throws BusinessException 해석할 수 없는 값일 때.
     */
    public static LocalDate toLocalDate(String value, String parameterName) {
        String trimmed = value == null ? "" : value.trim();
        String digitsOnly = trimmed.replace("-", "");

        if (digitsOnly.length() != 8) {
            throw invalid(parameterName, trimmed);
        }
        try {
            return LocalDate.parse(digitsOnly, COMPACT);
        } catch (DateTimeParseException e) {
            throw invalid(parameterName, trimmed);
        }
    }

    private static BusinessException invalid(String parameterName, String value) {
        return new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                parameterName + " 는 yyyyMMdd 또는 yyyy-MM-dd 형식이어야 합니다: '" + value + "'");
    }
}
