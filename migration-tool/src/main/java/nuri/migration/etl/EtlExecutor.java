package nuri.migration.etl;

import nuri.migration.model.MappingSpec;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.CodeMapper;
import nuri.migration.transform.TransformerRegistry;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ETL 실행기 — 소스 행 조회 → 컬럼 매핑/변환/코드매핑/상수 적용 →
 * {@code DRY_RUN}(카운트·오류 집계, 쓰기 없음) 또는 {@code COMMIT}(타깃 배치 INSERT).
 *
 * <p>SKELETON 확장점(설계 §2.2/§5): FK 위상정렬·{@code migration_checkpoint} 재개·keyset 페이징·
 * 정교한 타입 변환은 TODO. 현재는 단순 순차·전체 조회 기반.
 */
@Component
public class EtlExecutor {

    private final SourceIntrospector introspector;
    private final TransformerRegistry transformers;

    public EtlExecutor(SourceIntrospector introspector, TransformerRegistry transformers) {
        this.introspector = introspector;
        this.transformers = transformers;
    }

    public record TableResult(String sourceTable, String targetTable,
                              int read, int transformed, int written, List<String> errors) {}

    public List<TableResult> execute(MappingSpec spec, MigrationMode mode) {
        JdbcTemplate source = introspector.jdbc(spec.source());
        JdbcTemplate target = spec.target() == null ? null : introspector.jdbc(spec.target());
        List<TableResult> results = new ArrayList<>();
        for (MappingSpec.TableMapping t : spec.tables()) {
            results.add(runTable(source, target, spec, t, mode));
        }
        return results;
    }

    private TableResult runTable(JdbcTemplate source, JdbcTemplate target, MappingSpec spec,
                                 MappingSpec.TableMapping t, MigrationMode mode) {
        List<String> errors = new ArrayList<>();
        String sql = "SELECT * FROM " + SourceIntrospector.ident(t.source())
                + (isBlank(t.where()) ? "" : " WHERE " + t.where());
        List<Map<String, Object>> rows = source.queryForList(sql);

        List<Map<String, Object>> transformed = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            try {
                transformed.add(transformRow(row, spec, t));
            } catch (RuntimeException e) {
                errors.add("행 변환 실패(" + t.source() + "): " + e.getMessage());
            }
        }

        int written = 0;
        if (mode == MigrationMode.COMMIT && target != null && !transformed.isEmpty()) {
            written = insertRows(target, t.target(), transformed, errors);
        }
        return new TableResult(t.source(), t.target(), rows.size(), transformed.size(), written, errors);
    }

    private Map<String, Object> transformRow(Map<String, Object> src, MappingSpec spec, MappingSpec.TableMapping t) {
        Map<String, Object> lower = new LinkedHashMap<>();
        src.forEach((k, v) -> lower.put(k.toLowerCase(), v));

        Map<String, Object> out = new LinkedHashMap<>();
        for (MappingSpec.ColumnMapping c : t.columns()) {
            Object value;
            if (c.constant() != null) {
                value = c.constant();
            } else if (c.source() != null) {
                value = lower.get(c.source().toLowerCase());
                if (c.codemap() != null && spec.codemaps().containsKey(c.codemap())) {
                    value = CodeMapper.map(spec.codemaps().get(c.codemap()), value == null ? null : value.toString());
                }
                value = transformers.apply(c.transform(), value);
            } else {
                value = null;
            }
            out.put(c.target(), value);
        }
        return out;
    }

    private int insertRows(JdbcTemplate target, String table, List<Map<String, Object>> rows, List<String> errors) {
        List<String> cols = new ArrayList<>(rows.get(0).keySet());
        String colList = String.join(", ", cols.stream().map(SourceIntrospector::ident).toList());
        String placeholders = String.join(", ", cols.stream().map(c -> "?").toList());
        String sql = "INSERT INTO " + SourceIntrospector.ident(table) + " (" + colList + ") VALUES (" + placeholders + ")";

        int written = 0;
        for (Map<String, Object> row : rows) {
            Object[] args = cols.stream().map(row::get).toArray();
            try {
                target.update(sql, args);
                written++;
            } catch (RuntimeException e) {
                errors.add("INSERT 실패(" + table + "): " + e.getMessage());
            }
        }
        return written;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
