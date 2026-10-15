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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * mapping skeleton 을 읽는다(ADR-0029 L3a-2). skeleton 은 사람이 쓰고 Git 으로 검토하는 mapping.yml 형태로, 원장에서 만들
 * 컬럼과 원장 선언({@code ledger})이 빠져 있다. 표마다 {@code columns} 에는 상수({@code const})와 부모 키 번역
 * ({@code fkRef}) 항목만 둔다 — 나머지 컬럼과 fkRef 항목의 변환은 원장의 확정 행 {@code load} 에서 온다. 덤프만 하는 표는
 * {@code archives} 에 {@code source}·{@code orderByKeys}·{@code where} 로만 둔다(ADR-0029 L3e).
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
        archives(root, spec, errors);
        if (!errors.isEmpty()) {
            List<String> shown = errors.stream().limit(MAX_REPORTED).toList();
            String more = errors.size() > shown.size() ? " (외 " + (errors.size() - shown.size()) + "건)" : "";
            throw new IllegalArgumentException(String.join(" | ", shown) + more);
        }
        return new Skeleton(root, spec);
    }

    /**
     * [ADR-0029 L3e] skeleton 의 {@code archives} 에는 덤프만 하는 표를 표마다 하나씩 {@code source}·{@code orderByKeys}
     * (필수)·{@code where}(선택)로만 둔다. 보관 컬럼·원장 행·보존 기한·id 는 원장 ARCHIVE 행에서 만든다. 매핑하는 표의 보관은
     * 그 매핑의 where·정렬을 쓰므로 여기 두지 않는다 — 같은 표인지는 생성기가 inventory 로 다시 본다.
     */
    private static void archives(ObjectNode root, MappingSpec spec, List<String> errors) {
        JsonNode node = root.get("archives");
        if (node == null) {
            return;
        }
        if (!node.isArray() || node.size() != spec.archives().size()) {
            errors.add("skeleton 의 archives 는 덤프만 하는 표의 목록이어야 합니다");
            return;
        }
        Set<String> sources = new HashSet<>();
        for (int index = 0; index < spec.archives().size(); index++) {
            MappingSpec.ArchiveDump archive = spec.archives().get(index);
            String where = "skeleton archives[" + index + "]";
            if (archive == null || !node.get(index).isObject() || blank(archive.source())) {
                errors.add(where + ": 덤프만 하는 표에는 source 가 필요합니다");
                continue;
            }
            where += "(" + archive.source() + ")";
            if (archive.id() != null || !archive.columns().isEmpty() || !archive.ledgerEntries().isEmpty()
                    || archive.retainUntil() != null) {
                errors.add(where + ": skeleton 의 archives 에는 source·orderByKeys·where 만 둡니다 — id·columns·"
                        + "ledgerEntries·retainUntil 은 원장의 외부 보관(ARCHIVE) 행에서 만듭니다");
            }
            if (archive.orderByKeys().isEmpty()) {
                errors.add(where + ": 덤프만 하는 표에는 정렬 키(orderByKeys)가 필요합니다");
            }
            if (spec.mappedTableOf(archive.source()) != null) {
                errors.add(where + ": 매핑하는 표는 skeleton 의 archives 에 두지 않습니다 — 그 표의 보관은 원장 ARCHIVE 행으로"
                        + " 만들고 매핑의 where·정렬을 씁니다");
            }
            if (!sources.add(archive.source().trim().toLowerCase(Locale.ROOT))) {
                errors.add(where + ": 같은 덤프만 하는 표를 두 번 두었습니다");
            }
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
