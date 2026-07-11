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

    /** 테이블/컬럼 식별자 위생(식별자 문자만 허용) — 동적 SQL 인젝션 방지. */
    public static String ident(String identifier) {
        if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_$]*")) {
            throw new IllegalArgumentException("허용되지 않는 식별자: " + identifier);
        }
        return identifier;
    }
}
