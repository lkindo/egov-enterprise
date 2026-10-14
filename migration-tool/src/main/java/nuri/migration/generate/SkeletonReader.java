package nuri.migration.generate;

import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * mapping skeleton 을 읽는다(ADR-0029 L3a-2). skeleton 은 사람이 쓰고 Git 으로 검토하는 mapping.yml 형태로, 원장에서 만들
 * 컬럼과 원장 선언({@code ledger})이 빠져 있다. 표마다 {@code columns} 에는 상수({@code const})와 부모 키 번역
 * ({@code fkRef}) 항목만 둔다 — 나머지 컬럼과 fkRef 항목의 변환은 원장의 확정 행 {@code load} 에서 온다.
 *
 * <p>YAML 트리와 함께 같은 본문을 {@link MappingLoader#parseUnresolved} 로 읽어 구조와 접속 자리표시 형식을 확인한다.
 * 그 검사는 {@link MappingLoader#loadContent} 와 같은 판정이라 평문 password 는 여기서 멈춘다. 환경 변수는 치환하지
 * 않으므로 생성기는 접속 값을 글자 그대로 다시 쓴다. 오류 문구는 고정 어휘와 표 위치·이름이다.</p>
 */
public final class SkeletonReader {

    private static final int MAX_REPORTED = 20;

    /** 읽은 skeleton. {@code tree} 는 생성기가 고칠 YAML 트리이고 {@code spec} 은 같은 본문의 구조 해석이다. */
    public record Skeleton(ObjectNode tree, MappingSpec spec) {}

    private final YAMLMapper yaml = YAMLMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .build();
    private final MappingLoader loader;

    public SkeletonReader(MappingLoader loader) {
        this.loader = Objects.requireNonNull(loader, "loader");
    }

    public Skeleton read(String content) {
        Objects.requireNonNull(content, "content");
        MappingSpec spec = loader.parseUnresolved(content);
        JsonNode tree;
        try {
            tree = yaml.readTree(content);
        } catch (IOException | IllegalArgumentException failure) {
            throw new IllegalArgumentException("skeleton YAML 형식이 맞지 않습니다");
        }
        if (!(tree instanceof ObjectNode root)) {
            throw new IllegalArgumentException("skeleton 은 mapping.yml 형태의 YAML 객체여야 합니다");
        }
        if (root.has("ledger")) {
            throw new IllegalArgumentException("skeleton 에는 ledger 를 두지 않습니다 — mapping-generate 가 원장 선언을 씁니다");
        }
        JsonNode tables = root.get("tables");
        if (tables == null || !tables.isArray() || tables.isEmpty() || spec.tables().size() != tables.size()) {
            throw new IllegalArgumentException("skeleton 에는 표(tables)가 하나 이상 필요합니다");
        }
        List<String> errors = new ArrayList<>();
        for (int index = 0; index < spec.tables().size(); index++) {
            TableMapping table = spec.tables().get(index);
            String where = "skeleton tables[" + index + "]";
            if (table == null || !tables.get(index).isObject() || blank(table.source()) || blank(table.target())) {
                errors.add(where + ": 표에는 source·target 이 필요합니다");
                continue;
            }
            for (int position = 0; position < table.columns().size(); position++) {
                ColumnMapping column = table.columns().get(position);
                String at = where + ".columns[" + position + "](" + table.source() + ")";
                if (column != null && blank(column.target())) {
                    errors.add(at + ": columns 항목에는 target 이 필요합니다");
                } else if (column == null || (column.constant() == null && blank(column.fkRef()))) {
                    errors.add(at + ": skeleton 의 columns 에는 상수(const)·부모 키 번역(fkRef) 항목만 둡니다 — 나머지"
                            + " 컬럼은 원장의 확정 행에서 만듭니다");
                } else if (!blank(column.fkRef()) && (column.transform() != null || column.type() != null
                        || column.codemap() != null || !column.nullify().isEmpty() || column.encrypt() != null)) {
                    errors.add(at + ": fkRef 항목의 변환은 원장의 확정 행 load 로 정합니다 — transform·type·codemap·"
                            + "nullify·encrypt 를 두지 않습니다");
                }
            }
        }
        if (!errors.isEmpty()) {
            List<String> shown = errors.stream().limit(MAX_REPORTED).toList();
            String more = errors.size() > shown.size() ? " (외 " + (errors.size() - shown.size()) + "건)" : "";
            throw new IllegalArgumentException(String.join(" | ", shown) + more);
        }
        return new Skeleton(root, spec);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
