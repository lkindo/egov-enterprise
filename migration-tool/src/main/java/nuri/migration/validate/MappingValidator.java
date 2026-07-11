package nuri.migration.validate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.migration.model.MappingSpec;
import nuri.migration.transform.TransformerRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 매핑의 TARGET 이 표준 스키마({@code db_columns.json})에 실재하는지 검증(DB 헌법 제2조 강제).
 *
 * <p>{@code db_columns.json} 은 {@code {table_name, column_name}} 배열(코드젠 스냅샷). 부재 시
 * 실재 검증을 스킵하고 경고만 남긴다(오프라인 관용). 경로는 {@code migration.db-columns-path}.
 */
@Component
public class MappingValidator {

    private final TransformerRegistry transformers;
    private final String dbColumnsPath;
    private final ObjectMapper json = new ObjectMapper();

    public MappingValidator(TransformerRegistry transformers,
                            @Value("${migration.db-columns-path:db_columns.json}") String dbColumnsPath) {
        this.transformers = transformers;
        this.dbColumnsPath = dbColumnsPath;
    }

    public ValidationResult validate(MappingSpec spec) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Set<String> targetColumns = loadTargetColumns(warnings);

        for (MappingSpec.TableMapping t : spec.tables()) {
            if (isBlank(t.target())) {
                errors.add("타깃 테이블 미지정: source=" + t.source());
                continue;
            }
            for (MappingSpec.ColumnMapping c : t.columns()) {
                if (isBlank(c.target())) {
                    errors.add(t.target() + ": 타깃 컬럼 미지정");
                    continue;
                }
                if (!targetColumns.isEmpty()) {
                    String key = (t.target() + "." + c.target()).toLowerCase();
                    if (!targetColumns.contains(key)) {
                        errors.add("표준 스키마에 없는 타깃 컬럼: " + key);
                    }
                }
                if (!isBlank(c.transform()) && !transformers.has(c.transform())) {
                    warnings.add(t.target() + "." + c.target() + ": 미등록 변환기 '" + c.transform() + "'");
                }
                if (!isBlank(c.codemap()) && !spec.codemaps().containsKey(c.codemap())) {
                    errors.add(t.target() + "." + c.target() + ": 정의되지 않은 코드맵 '" + c.codemap() + "'");
                }
                if (c.source() == null && c.constant() == null) {
                    warnings.add(t.target() + "." + c.target() + ": source·const 모두 없음(값 미결정)");
                }
            }
        }
        return new ValidationResult(errors, warnings);
    }

    private Set<String> loadTargetColumns(List<String> warnings) {
        Set<String> set = new HashSet<>();
        Path path = Path.of(dbColumnsPath);
        if (!Files.exists(path)) {
            warnings.add("db_columns.json 부재(" + path + ") — 타깃 컬럼 실재 검증 스킵");
            return set;
        }
        try {
            JsonNode root = json.readTree(Files.readAllBytes(path));
            if (root.isArray()) {
                for (JsonNode n : root) {
                    String table = text(n, "table_name");
                    String col = text(n, "column_name");
                    if (table != null && col != null) {
                        set.add((table + "." + col).toLowerCase());
                    }
                }
            }
        } catch (IOException e) {
            warnings.add("db_columns.json 파싱 실패 — 타깃 검증 스킵: " + e.getMessage());
        }
        return set;
    }

    private static String text(JsonNode n, String field) {
        JsonNode v = n.get(field);
        return v == null || v.isNull() ? null : v.asText();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
