package nuri.migration.lookup;

/**
 * 컬럼 매핑의 {@code source} 가 조회 조인의 컬럼을 가리키는 표기 {@code alias.COLUMN}(ADR-0029 L3d). 소스 컬럼 식별자에는
 * 점이 들어갈 수 없으므로({@code SourceIntrospector.ident}) 점이 있는 표기는 조회 컬럼이다. 별칭이 선언됐는지와 각 부분의
 * 형식은 {@link LookupRules} 가 본다.
 */
public record LookupRef(String alias, String column) {

    /** 실행기가 조회 값을 넣는 행 키({@code alias.column}, 소문자). 주 표의 컬럼 키와 겹치지 않는다. */
    public String rowKey() {
        return alias + "." + column.toLowerCase(java.util.Locale.ROOT);
    }

    /** 점이 있는 표기면 별칭과 컬럼으로 나눈다. 점이 없거나 비었으면 null — 주 표의 컬럼이다. */
    public static LookupRef parse(String source) {
        if (source == null) {
            return null;
        }
        int dot = source.indexOf('.');
        if (dot < 0) {
            return null;
        }
        return new LookupRef(source.substring(0, dot), source.substring(dot + 1));
    }
}
