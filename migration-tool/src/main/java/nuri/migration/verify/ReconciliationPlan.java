package nuri.migration.verify;

import nuri.migration.postgres.TargetConstraintSnapshot;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;
import nuri.migration.validate.CodeSetTarget;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * [ADR-0029 L4 D2·D7] 한 load 의 대사 계획(값 없음) — 매핑마다 컬럼 계획, 대사할 참조, 적재 시작의 제약 스냅숏, 매핑 대상 표,
 * 공통코드 대사 대상. load 가 승인 fingerprint·inventory·원장 문맥으로 만들어 실행기와 verifier 에 같은 것을 넘긴다.
 * 비활성 계획({@link #none()})이면 실행기·verifier 가 종전과 같다.
 */
public record ReconciliationPlan(boolean active, List<MappingPlan> mappings, List<DeclaredReference> references,
                                 TargetConstraintSnapshot startConstraints, List<TableMetadata> mappedTables,
                                 List<CodeSetTarget> codeSets) {

    private static final ReconciliationPlan NONE =
            new ReconciliationPlan(false, List.of(), List.of(), null, List.of(), List.of());

    public ReconciliationPlan {
        mappings = mappings == null ? List.of() : List.copyOf(mappings);
        references = references == null ? List.of() : List.copyOf(references);
        mappedTables = mappedTables == null ? List.of() : List.copyOf(mappedTables);
        codeSets = codeSets == null ? List.of() : List.copyOf(codeSets);
    }

    public static ReconciliationPlan none() {
        return NONE;
    }

    /** 라벨(소스 또는 {@code 소스#id})로 매핑 계획을 찾는다. 대소문자를 가리지 않는다. 없으면 null. */
    public MappingPlan mapping(String label) {
        for (MappingPlan mapping : mappings) {
            if (mapping.label().equalsIgnoreCase(label)) {
                return mapping;
            }
        }
        return null;
    }

    /**
     * 원천 집계 묶음 키 — 정규화한 소스와 앞뒤 공백을 지운 where. 소스·where 가 같은 분할 매핑은 집계 문장 하나를 나눠 쓴다.
     * where 는 리터럴이 있을 수 있어 대소문자를 바꾸지 않는다.
     */
    public static String groupKey(String source, String where) {
        return Objects.requireNonNull(source, "source").trim().toLowerCase(Locale.ROOT) + '\u0000'
                + (where == null ? "" : where.trim());
    }

    /**
     * 매핑 하나의 대사 계획.
     *
     * @param label             소스 또는 {@code 소스#id}
     * @param target            대상 표({@code schema.table})
     * @param targetPrimaryKey  대상 PK 컬럼(키 순서)
     * @param preservedKey      원천 키를 그대로 쓰는 표인가(idStrategy 없음, identity 없음 또는 PRESERVE)
     * @param isolates          isolate 선언이 있는가
     * @param generatedIdentity 대상이 키를 만드는 표(TARGET_GENERATED)인가
     */
    public record MappingPlan(String label, String source, String mappingId, String where, String target,
                              List<ColumnCheck> columns, List<String> targetPrimaryKey, boolean preservedKey,
                              boolean isolates, boolean generatedIdentity) {

        public MappingPlan {
            if (label == null || label.isBlank() || source == null || source.isBlank()
                    || target == null || target.isBlank()) {
                throw new IllegalArgumentException("mapping plan needs label, source and target");
            }
            columns = columns == null ? List.of() : List.copyOf(columns);
            targetPrimaryKey = targetPrimaryKey == null ? List.of() : List.copyOf(targetPrimaryKey);
        }

        /** 원천 집계 묶음 키. */
        public String aggregateGroup() {
            return groupKey(source, where);
        }

        /** 대상 컬럼 계획. 대소문자를 가리지 않는다. 없으면 null. */
        public ColumnCheck column(String targetColumn) {
            for (ColumnCheck column : columns) {
                if (column.targetColumn().equalsIgnoreCase(targetColumn)) {
                    return column;
                }
            }
            return null;
        }

        public boolean hasSampledColumns() {
            return columns.stream().anyMatch(ColumnCheck::sampled);
        }
    }
}
