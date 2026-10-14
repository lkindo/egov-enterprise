package nuri.migration.domain;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 자리표시 값의 단일 정본이다. 프로파일러의 값 모양({@code ValuePattern})과 표준 도메인 변환기({@link DomainValues})가
 * 모두 이 상수로 판정한다 — 둘이 다른 목록을 들면 추정과 실행이 같은 값을 다르게 센다.
 *
 * <p>자리표시 날짜는 8자리와 하이픈 형태만이다. 슬래시·점·일시·14자리 표기와 시간형 객체는 자리표시로 보지 않고 그
 * 모양의 값으로 판정한다(추정기와 같다).</p>
 */
public final class DomainPlaceholders {

    /** 8자리 자리표시 날짜. 같은 표기의 숫자형 값도 자리표시다. */
    public static final List<String> DATE8 = List.of("99991231", "00000000");
    /** 하이픈 자리표시 날짜. */
    public static final List<String> DATE_DASHED = List.of("9999-12-31", "0000-00-00");
    /** 값이 없다는 뜻의 문자. 프로파일러가 세기만 하고 변환기는 판정하지 않는다. */
    public static final List<String> TEXT = List.of("-", ".", "N/A", "n/a", "NULL", "null");

    private DomainPlaceholders() {}

    /** 목록의 값과 정확히 같은 문자에만 맞는 정규식. */
    public static String regex(List<String> values) {
        return values.stream().map(Pattern::quote).collect(Collectors.joining("|"));
    }
}
