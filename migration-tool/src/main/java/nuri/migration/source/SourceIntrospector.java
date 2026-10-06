package nuri.migration.source;

import nuri.migration.model.MappingSpec.DbConfig;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

/**
 * 매핑의 {@link DbConfig} 로 JdbcTemplate 을 만들고, 동적 SQL 에 들어갈 식별자를 위생 검사한다.
 *
 * <p>[2026-10-07] Phase 4b 골격의 {@code introspect}(스키마 무한정 information_schema 조회 + count)와
 * 그 결과 타입 {@code SourceCatalog} 는 ADR-0008 adapter discovery 로 대체된 뒤 소비처가 없어 걷었다.</p>
 */
@Component
public class SourceIntrospector {

    /** {@link DbConfig} 로부터 JdbcTemplate 생성(소스/타깃 공통). */
    public JdbcTemplate jdbc(DbConfig cfg) {
        DriverManagerDataSource ds = new DriverManagerDataSource(cfg.url(), cfg.username(), cfg.password());
        if (cfg.driver() != null && !cfg.driver().isBlank()) {
            ds.setDriverClassName(cfg.driver());
        }
        return new JdbcTemplate(ds);
    }

    /** 단일 식별자 위생(식별자 문자만 허용) — 동적 SQL 인젝션 방지. */
    public static String ident(String identifier) {
        if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_$]*")) {
            throw new IllegalArgumentException("허용되지 않는 식별자: " + identifier);
        }
        return identifier;
    }

    /**
     * 스키마 한정 식별자 위생 — {@code schema.table} 각 세그먼트를 {@link #ident}로 검증 후 재결합.
     * 레거시 govt DB 에 흔한 {@code SCOTT.EMP}/{@code dbo.USERS} 를 수용한다(인젝션 안전).
     * (따옴표/비ASCII·한글 식별자의 dialect 별 quoting 은 로드맵 P0 — 여기서는 스키마 한정까지만 완화.)
     */
    public static String qualifiedIdent(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("허용되지 않는 식별자: " + identifier);
        }
        String[] parts = identifier.split("\\.");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                sb.append('.');
            }
            sb.append(ident(parts[i]));
        }
        return sb.toString();
    }
}
