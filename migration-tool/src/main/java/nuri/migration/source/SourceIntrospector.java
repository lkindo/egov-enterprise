package nuri.migration.source;

import nuri.migration.model.MappingSpec.DbConfig;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/** 소스 DB {@code information_schema} 를 조회해 {@link SourceCatalog} 를 만든다(읽기 전용). */
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

    public SourceCatalog introspect(DbConfig cfg, List<String> tableNames) {
        JdbcTemplate jt = jdbc(cfg);
        List<SourceCatalog.SourceTable> tables = new ArrayList<>();
        for (String table : tableNames) {
            List<SourceCatalog.SourceColumn> cols = jt.query(
                    "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
                            + "WHERE lower(table_name) = lower(?) ORDER BY ordinal_position",
                    (rs, i) -> new SourceCatalog.SourceColumn(
                            rs.getString("column_name"),
                            rs.getString("data_type"),
                            "YES".equalsIgnoreCase(rs.getString("is_nullable"))),
                    table);
            long count = 0L;
            try {
                Long c = jt.queryForObject("SELECT count(*) FROM " + ident(table), Long.class);
                count = c == null ? 0L : c;
            } catch (RuntimeException ignore) {
                // 행수 조회 실패(권한/부재) 시 0 — 인트로스펙션은 계속한다.
            }
            tables.add(new SourceCatalog.SourceTable(table, cols, count));
        }
        return new SourceCatalog(tables);
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
