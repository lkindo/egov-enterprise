package nuri.migration.etl;

import nuri.migration.keymap.KeyMapRegistry;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.CodeMapper;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.transform.TypeConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ETL 실행기 — FK 위상정렬 → 스트리밍(keyset-fetch) 소스 조회 → 컬럼 매핑/코드맵/변환/타입강제/키맵 재작성 →
 * 배치·트랜잭션 타깃 적재.
 *
 * <p>재설계(2026-07-23): 기존 SKELETON(전량 메모리 로드 · 행단위 autocommit · 死 type/idStrategy · 무순서)을
 * 다음으로 대체했다 — (1) {@link TableOrderer} 위상정렬로 부모 먼저, (2) fetchSize 스트리밍으로 메모리 상한,
 * (3) {@link TypeConverter}로 {@code type} 활성화, (4) {@link KeyMapRegistry}로 {@code idStrategy} 채번 +
 * {@code fkRef} FK 번역(참조 무결성), (5) JDBC 배치 + 청크 트랜잭션(배치 실패 시 행단위 폴백으로 오류 격리).
 *
 * <p>남은 로드맵: keyset PK seek(현재 fetchSize 스트리밍), 자기참조 트리 2-pass, PG COPY 고속경로,
 * dead-letter 격리 테이블(현재 오류 리스트) — 설계문서 §7 참조.
 */
@Component
public class EtlExecutor {

    /** 스트리밍 fetch/배치 청크 크기. */
    private static final int CHUNK = 500;

    private final SourceIntrospector introspector;
    private final TransformerRegistry transformers;

    public EtlExecutor(SourceIntrospector introspector, TransformerRegistry transformers) {
        this.introspector = introspector;
        this.transformers = transformers;
    }

    public record TableResult(String sourceTable, String targetTable,
                              int read, int transformed, int written, List<String> errors) {}

    public List<TableResult> execute(MappingSpec spec, MigrationMode mode) {
        JdbcTemplate sourceJt = introspector.jdbc(spec.source());
        DataSource sourceDs = sourceJt.getDataSource();
        JdbcTemplate targetJt = spec.target() == null ? null : introspector.jdbc(spec.target());
        DataSource targetDs = targetJt == null ? null : targetJt.getDataSource();
        boolean commit = mode == MigrationMode.COMMIT && targetDs != null;

        KeyMapRegistry registry = new KeyMapRegistry();
        if (commit) {
            registry.ensureTable(targetJt);
            registry.preload(targetJt); // 재실행 멱등: 기존 대응 재사용
        }

        List<TableResult> results = new ArrayList<>();
        for (TableMapping t : TableOrderer.order(spec.tables())) {
            results.add(runTable(sourceDs, targetDs, spec, t, registry, commit));
        }
        if (commit) {
            try {
                registry.flushPending(targetJt); // 신규 키맵 대응 영속(감사·멱등)
            } catch (RuntimeException e) {
                // 키맵 영속 실패는 이관 자체를 무효화하지 않는다(인메모리 대응은 이미 적용됨).
            }
        }
        return results;
    }

    private TableResult runTable(DataSource sourceDs, DataSource targetDs, MappingSpec spec,
                                 TableMapping t, KeyMapRegistry reg, boolean commit) {
        List<String> errors = new ArrayList<>();
        List<String> targetCols = canonicalTargetColumns(t);
        String insertSql = buildInsertSql(t.target(), targetCols);
        String selectSql = "SELECT * FROM " + SourceIntrospector.qualifiedIdent(t.source())
                + (isBlank(t.where()) ? "" : " WHERE " + t.where());
        long[] c = {0, 0, 0}; // read, transformed, written

        Connection targetConn = null;
        try {
            if (commit) {
                targetConn = targetDs.getConnection();
                targetConn.setAutoCommit(false);
            }
            try (Connection sc = sourceDs.getConnection()) {
                sc.setAutoCommit(false); // PostgreSQL 서버 커서(스트리밍) 활성 조건
                try (PreparedStatement ps = sc.prepareStatement(selectSql)) {
                    ps.setFetchSize(CHUNK);
                    try (ResultSet rs = ps.executeQuery()) {
                        String[] labels = lowerLabels(rs.getMetaData());
                        List<Map<String, Object>> chunk = new ArrayList<>(CHUNK);
                        while (rs.next()) {
                            c[0]++;
                            chunk.add(readRow(rs, labels));
                            if (chunk.size() >= CHUNK) {
                                processChunk(chunk, spec, t, targetCols, insertSql, reg, targetConn, c, errors);
                                chunk.clear();
                            }
                        }
                        if (!chunk.isEmpty()) {
                            processChunk(chunk, spec, t, targetCols, insertSql, reg, targetConn, c, errors);
                        }
                    }
                }
                sc.commit();
            }
        } catch (SQLException e) {
            errors.add("이관 실패(" + t.source() + "): " + e.getMessage());
            safeRollback(targetConn);
        } finally {
            safeClose(targetConn);
        }
        return new TableResult(t.source(), t.target(), (int) c[0], (int) c[1], (int) c[2], errors);
    }

    private void processChunk(List<Map<String, Object>> chunk, MappingSpec spec, TableMapping t,
                              List<String> targetCols, String insertSql, KeyMapRegistry reg,
                              Connection targetConn, long[] c, List<String> errors) {
        List<Object[]> batch = new ArrayList<>(chunk.size());
        for (Map<String, Object> row : chunk) {
            try {
                Map<String, Object> out = transformRow(row, spec, t, reg);
                c[1]++;
                Object[] args = new Object[targetCols.size()];
                for (int i = 0; i < targetCols.size(); i++) {
                    args[i] = out.get(targetCols.get(i));
                }
                batch.add(args);
            } catch (RuntimeException e) {
                errors.add("행 변환 실패(" + t.source() + "): " + e.getMessage());
            }
        }
        if (targetConn != null && !batch.isEmpty()) {
            c[2] += writeBatch(targetConn, insertSql, batch, t.target(), errors);
        }
    }

    private Map<String, Object> transformRow(Map<String, Object> src, MappingSpec spec, TableMapping t, KeyMapRegistry reg) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (ColumnMapping col : t.columns()) {
            Object value;
            if (col.constant() != null) {
                value = col.constant();
            } else if (col.source() != null) {
                value = src.get(col.source().toLowerCase());
                if (col.codemap() != null && spec.codemaps().containsKey(col.codemap())) {
                    value = CodeMapper.map(spec.codemaps().get(col.codemap()), value == null ? null : value.toString());
                }
                value = transformers.apply(col.transform(), value);
                value = TypeConverter.convert(col.type(), value);
                value = applyFkRef(col, value, reg);
            } else {
                value = null;
            }
            out.put(col.target(), value);
        }
        IdStrategy id = t.idStrategy();
        if (id != null && id.column() != null) {
            Object legacy = id.sourceKey() == null ? null : src.get(id.sourceKey().toLowerCase());
            String newKey = reg.mintOrGet(t.source(), legacy == null ? null : legacy.toString(), id.generator());
            out.put(id.column(), newKey);
        }
        return out;
    }

    /** 자식 FK 값을 부모 키맵으로 신규 키에 번역. 미매핑(고아)은 예외로 격리(행 변환 실패). null 은 통과. */
    private Object applyFkRef(ColumnMapping col, Object value, KeyMapRegistry reg) {
        if (col.fkRef() == null || col.fkRef().isBlank() || value == null) {
            return value;
        }
        String translated = reg.translate(col.fkRef(), value.toString());
        if (translated == null) {
            throw new IllegalStateException("FK 고아: 부모 '" + col.fkRef() + "' 키맵에 '" + value + "' 없음");
        }
        return translated;
    }

    private int writeBatch(Connection conn, String sql, List<Object[]> batch, String table, List<String> errors) {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (Object[] args : batch) {
                bind(ps, args);
                ps.addBatch();
            }
            ps.executeBatch();
            conn.commit();
            return batch.size();
        } catch (SQLException e) {
            safeRollback(conn);
            return writeRowByRow(conn, sql, batch, table, errors); // 배치 실패 → 행단위로 나쁜 행 격리
        }
    }

    private int writeRowByRow(Connection conn, String sql, List<Object[]> batch, String table, List<String> errors) {
        int written = 0;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (Object[] args : batch) {
                try {
                    bind(ps, args);
                    ps.executeUpdate();
                    conn.commit();
                    written++;
                } catch (SQLException ex) {
                    safeRollback(conn);
                    errors.add("INSERT 실패(" + table + "): " + ex.getMessage());
                }
            }
        } catch (SQLException e) {
            errors.add("INSERT 준비 실패(" + table + "): " + e.getMessage());
        }
        return written;
    }

    private static void bind(PreparedStatement ps, Object[] args) throws SQLException {
        for (int i = 0; i < args.length; i++) {
            ps.setObject(i + 1, args[i]);
        }
    }

    private static List<String> canonicalTargetColumns(TableMapping t) {
        List<String> cols = new ArrayList<>();
        for (ColumnMapping c : t.columns()) {
            if (c.target() != null && !cols.contains(c.target())) {
                cols.add(c.target());
            }
        }
        IdStrategy id = t.idStrategy();
        if (id != null && id.column() != null && !cols.contains(id.column())) {
            cols.add(id.column());
        }
        return cols;
    }

    private static String buildInsertSql(String table, List<String> cols) {
        String colList = String.join(", ", cols.stream().map(SourceIntrospector::ident).toList());
        String placeholders = String.join(", ", cols.stream().map(c -> "?").toList());
        return "INSERT INTO " + SourceIntrospector.qualifiedIdent(table) + " (" + colList + ") VALUES (" + placeholders + ")";
    }

    private static String[] lowerLabels(ResultSetMetaData md) throws SQLException {
        String[] labels = new String[md.getColumnCount()];
        for (int i = 0; i < labels.length; i++) {
            labels[i] = md.getColumnLabel(i + 1).toLowerCase();
        }
        return labels;
    }

    private static Map<String, Object> readRow(ResultSet rs, String[] labels) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        for (int i = 0; i < labels.length; i++) {
            row.put(labels[i], rs.getObject(i + 1));
        }
        return row;
    }

    private static void safeRollback(Connection conn) {
        if (conn == null) {
            return;
        }
        try {
            conn.rollback();
        } catch (SQLException ignore) {
            // 롤백 실패는 원인 오류를 덮지 않도록 무시
        }
    }

    private static void safeClose(Connection conn) {
        if (conn == null) {
            return;
        }
        try {
            conn.close();
        } catch (SQLException ignore) {
            // close 실패 무시
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
