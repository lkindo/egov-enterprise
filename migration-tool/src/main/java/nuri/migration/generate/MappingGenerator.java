package nuri.migration.generate;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import nuri.migration.artifact.ArtifactRedactionGuard;
import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.InventoryTables;
import nuri.migration.generate.SkeletonReader.Skeleton;
import nuri.migration.isolate.RowIsolationPolicy;
import nuri.migration.model.MappingLoader;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.protect.ProtectedTargetColumns;
import nuri.migration.validate.MappingValidator;
import nuri.migration.validate.ValidationResult;
import nuri.migration.validate.ledger.LoadCapabilities;
import nuri.migration.validate.ledger.TermLedger;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.Load;
import nuri.migration.validate.ledger.TermLedgerLoader;
import nuri.migration.validate.ledger.TermLedgerValidator;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

/**
 * skeleton·용어 매핑 원장·승인 inventory 로 mapping 을 만든다(ADR-0029 L3a-2). DB 에 접속하지 않는다.
 *
 * <p>skeleton 의 YAML 트리에서 {@code tables[i].columns}(덧붙이기)·{@code archives}·{@code ledger} 만 바꾸고 나머지 노드는
 * 그대로 둔다 — 접속 값의 {@code ${NAME}} 자리표시가 글자 그대로 남는다. 바뀐 트리는 고정 설정의 YAML 로 쓰므로 같은 입력은 같은
 * 바이트를 낸다. skeleton 의 주석·따옴표·흐름 표기는 남지 않는다.</p>
 *
 * <ol>
 *   <li>원장을 읽어 형식 2 검증을 지나야 한다.</li>
 *   <li>skeleton 표와 원장 행의 소스 표를 inventory 표로 해석한다. 찾지 못하거나 모호하면 거부한다.</li>
 *   <li>완전성은 소스 표 단위다 — skeleton 표의 모든 inventory 컬럼은 확정 행이 하나 이상이거나, 이관 제외·외부 보관
 *       행이 정확히 하나여야 한다. 키로만 쓰는 컬럼은 이관 제외와 사유로 적는다.</li>
 *   <li>확정 행마다 컬럼을 만든다({@code load} 를 옮기고, 보호 컬럼이면 {@code encrypt} 를 정한다). skeleton 의 fkRef
 *       항목은 같은 소스 컬럼의 확정 행 load 를 받되 키를 정규화하는 처리만 받는다. 고정 길이 문자(CHAR·NCHAR) 소스의
 *       codemap 앞에는 {@code transform: trim} 이 있어야 한다(ADR-0029 L4-B R3).</li>
 *   <li>확정 행의 승인 예외 가운데 nullify 로 NULL 이 되지 않는 위반만 {@code isolate} 로 옮긴다(ADR-0029 L3b). 격리할
 *       수 없는 표(target_generated·자기참조·다른 매핑의 부모)·컬럼(암호화·fkRef)에 그런 위반이 남으면 거부한다 — 이관
 *       제외로 돌리라고 안내하지 않는다.</li>
 *   <li>외부 보관(ARCHIVE) 행은 (소스 표, 보존 기한) 마다 보관 선언 하나로 묶어 {@code archives} 에 쓴다(ADR-0029 L3e).
 *       매핑하는 표는 그 매핑의 where·정렬을 쓰고, 덤프만 하는 표는 skeleton 의 {@code archives} 에서 정렬 키·where 를
 *       받는다. 덤프만 하는 표의 모든 컬럼은 외부 보관·이관 제외 행이 정확히 하나여야 한다.</li>
 *   <li>아직 실행하지 못하는 행(기본이 아닌 매핑·조회 조인)과 skeleton 에 없는 표의 확정·외부 보관 행은 거부한다.</li>
 *   <li>원장 선언은 출력 mapping 디렉터리 기준 경로와 원장 바이트의 SHA-256 이다.</li>
 *   <li>만든 mapping 을 다시 읽어 정적 mapping 검증과 자격·개인정보 값 검사, plan 과 같은 원장 대응 검사
 *       ({@link TermLedgerValidator#coverage})를 지나야 한다.</li>
 * </ol>
 *
 * <p>거부 문구는 원장 행 ID·표·컬럼·상태와 고정 어휘만 담고 20건까지 보인다. 생성기를 지난 mapping 도 plan 이 독립해서
 * 다시 검증한다 — 생성은 승인이 아니다.</p>
 */
public final class MappingGenerator {

    static final int MAX_REPORTED = 20;
    static final String HEADER = "# mapping-generate 가 skeleton 과 용어 매핑 원장에서 만든 파일입니다. 직접 고치지 말고"
            + " skeleton 이나 원장을 고친 뒤 다시 만드세요.\n";
    private static final Set<String> SOURCE_DISPOSITIONS = Set.of("APPROVED_IGNORE", "ARCHIVE");
    /** 드라이버가 알리는 고정 길이 문자 타입 이름(정밀도 표기를 뺀 소문자). PostgreSQL 은 {@code bpchar} 로 알린다. */
    private static final Set<String> FIXED_WIDTH_CHARACTER = Set.of("char", "nchar", "bpchar", "character",
            "national char", "national character");

    private final SkeletonReader skeletons;
    private final MappingLoader loader;
    private final MappingValidator validator;
    private final TermLedgerLoader ledgers = new TermLedgerLoader();
    private final TermLedgerValidator ledgerValidator = new TermLedgerValidator();
    private final YAMLMapper yaml = YAMLMapper.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER)
            .enable(YAMLGenerator.Feature.MINIMIZE_QUOTES)
            .enable(YAMLGenerator.Feature.ALWAYS_QUOTE_NUMBERS_AS_STRINGS)
            .build();

    public MappingGenerator(MappingLoader loader, MappingValidator validator) {
        this.loader = Objects.requireNonNull(loader, "loader");
        this.validator = Objects.requireNonNull(validator, "validator");
        this.skeletons = new SkeletonReader(loader);
    }

    /** 생성을 거부했다. 문구는 고정 어휘와 원장 행 ID·표·컬럼·상태뿐이다. */
    public static final class Refused extends IllegalArgumentException {
        Refused(String message) {
            super(message);
        }
    }

    /**
     * 출력 mapping 디렉터리 기준 원장 경로({@code /} 구분). 원장이 그 디렉터리 밖에 있으면 거부한다 — plan·load 는 mapping
     * 이 있는 디렉터리에서 원장을 찾는다.
     */
    public static String ledgerPath(Path output, Path ledger) {
        Objects.requireNonNull(output, "output");
        Objects.requireNonNull(ledger, "ledger");
        Path base = output.toAbsolutePath().normalize().getParent();
        Path target = ledger.toAbsolutePath().normalize();
        if (base == null || !target.startsWith(base) || target.equals(base)) {
            throw new Refused("용어 매핑 원장은 출력 mapping 과 같은 디렉터리나 그 아래에 있어야 합니다");
        }
        List<String> parts = new ArrayList<>();
        base.relativize(target).forEach(part -> parts.add(part.toString()));
        return String.join("/", parts);
    }

    /**
     * mapping 본문을 만든다. {@code ledgerPath} 는 {@link #ledgerPath} 로 구한 상대 경로이고, {@code ledgerContent} 는 그
     * 원장 파일의 본문이다.
     */
    public String generate(String skeletonContent, String ledgerContent, String ledgerPath, CatalogSnapshot inventory) {
        Objects.requireNonNull(skeletonContent, "skeletonContent");
        Objects.requireNonNull(ledgerContent, "ledgerContent");
        Objects.requireNonNull(inventory, "inventory");
        requireRelative(ledgerPath);
        Skeleton skeleton;
        TermLedger ledger;
        try {
            skeleton = skeletons.read(skeletonContent);
            ledger = ledgers.load(ledgerContent);
        } catch (IllegalArgumentException invalid) {
            // 읽기 오류는 고정 문구와 표 위치·이름, codemap 이름(식별자 형식일 때만)뿐이다.
            throw new Refused(invalid.getMessage());
        }
        refuseIf(ledgerValidator.validate(ledger));

        List<String> errors = new ArrayList<>();
        Resolved resolved = resolve(skeleton, ledger, inventory, errors);
        rejectUnsupported(ledger, resolved, errors);
        complete(skeleton, ledger, resolved, errors);
        ObjectNode root = skeleton.tree().deepCopy();
        build(skeleton, ledger, resolved, root, errors);
        archives(skeleton, ledger, resolved, root);
        errors.addAll(ledgerValidator.codemaps(ledger, skeleton.spec().codemaps(), Map.of()));
        refuseIf(errors);

        ObjectNode binding = root.putObject("ledger");
        binding.put("path", ledgerPath);
        binding.put("sha256", sha256Hex(ledgerContent.getBytes(StandardCharsets.UTF_8)));
        guard(root);
        String text = HEADER + write(root);
        requireSameOnRead(root, text);
        MappingSpec generated;
        try {
            generated = loader.parseUnresolved(text);
        } catch (IllegalArgumentException unreadable) {
            throw new Refused("만든 mapping 을 다시 읽지 못했습니다");
        }
        ValidationResult result = validator.validate(generated);
        if (result == null) {
            throw new Refused("만든 mapping 의 정적 검증 결과가 없습니다");
        }
        refuseIf(result.errors().stream().map(error -> "mapping 정적 검증: " + error).toList());
        // plan 이 다시 볼 대응(정방향·역방향·완전성, 표기가 다른 같은 컬럼의 충돌)을 만든 mapping 으로 한 번 더 본다.
        refuseIf(ledgerValidator.coverage(ledger, generated, inventory));
        return text;
    }

    /**
     * 해석 결과. 원장 행 순번마다 소스 표·컬럼(못 찾았으면 null)과, skeleton 표 순번마다 소스 표, skeleton 보관(덤프만 하는
     * 표) 순번마다 소스 표다.
     */
    private record Resolved(
            List<CatalogObject> rowTables,
            List<CatalogObject> rowColumns,
            List<CatalogObject> skeletonTables,
            List<CatalogObject> archiveTables,
            Map<String, InventoryTables.TableColumns> columns) {

        boolean inSkeleton(CatalogObject table) {
            return contains(skeletonTables, table);
        }

        boolean dumpOnly(CatalogObject table) {
            return contains(archiveTables, table);
        }

        private static boolean contains(List<CatalogObject> tables, CatalogObject table) {
            return tables.stream().anyMatch(candidate -> candidate != null
                    && candidate.stableId().equals(table.stableId()));
        }
    }

    private static Resolved resolve(Skeleton skeleton, TermLedger ledger, CatalogSnapshot inventory,
                                    List<String> errors) {
        Map<String, InventoryTables.TableColumns> columns = new LinkedHashMap<>();
        Set<String> reported = new HashSet<>();
        List<CatalogObject> skeletonTables = new ArrayList<>();
        Map<String, Integer> seen = new HashMap<>();
        List<TableMapping> tables = skeleton.spec().tables();
        for (int index = 0; index < tables.size(); index++) {
            String source = tables.get(index).source();
            InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, source);
            if (!resolution.resolved()) {
                errors.add("skeleton tables[" + index + "] " + source + ": " + resolution.problem());
                skeletonTables.add(null);
                continue;
            }
            CatalogObject table = resolution.table();
            Integer previous = seen.putIfAbsent(table.stableId(), index);
            if (previous != null) {
                errors.add("skeleton tables[" + index + "] " + source + ": skeleton tables[" + previous
                        + "] 와 같은 inventory 표를 가리킵니다 — 한 소스 표는 한 번만 둡니다(분할은 L3c 부터)");
            }
            skeletonTables.add(table);
            tableColumns(inventory, table, source, columns, reported, errors);
        }
        // [ADR-0029 L3e] 덤프만 하는 표 — 매핑하는 표와 같은 inventory 표면 그 매핑의 where·정렬을 써야 하므로 거부한다.
        List<CatalogObject> archiveTables = new ArrayList<>();
        Map<String, Integer> dumped = new HashMap<>();
        List<MappingSpec.ArchiveDump> archives = skeleton.spec().archives();
        for (int index = 0; index < archives.size(); index++) {
            String source = archives.get(index).source();
            String where = "skeleton archives[" + index + "] " + source;
            InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, source);
            if (!resolution.resolved()) {
                errors.add(where + ": " + resolution.problem());
                archiveTables.add(null);
                continue;
            }
            CatalogObject table = resolution.table();
            if (seen.containsKey(table.stableId())) {
                errors.add(where + ": skeleton tables[" + seen.get(table.stableId()) + "] 가 매핑하는 표입니다 — 그 표의"
                        + " 보관은 원장 ARCHIVE 행으로 만들고 매핑의 where·정렬을 씁니다");
            }
            Integer previous = dumped.putIfAbsent(table.stableId(), index);
            if (previous != null) {
                errors.add(where + ": skeleton archives[" + previous + "] 와 같은 inventory 표를 가리킵니다");
            }
            archiveTables.add(table);
            InventoryTables.TableColumns tableColumns = tableColumns(inventory, table, source, columns, reported,
                    errors);
            if (tableColumns.problem() == null) {
                for (String key : archives.get(index).orderByKeys()) {
                    if (tableColumns.columns().stream()
                            .noneMatch(column -> InventoryTables.columnMatches(key, column))) {
                        errors.add(where + ": 정렬 키 " + key + " 가 inventory 의 이 표에 없습니다");
                    }
                }
            }
        }
        List<CatalogObject> rowTables = new ArrayList<>();
        List<CatalogObject> rowColumns = new ArrayList<>();
        for (Entry entry : ledger.entries()) {
            InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, entry.source().table());
            if (!resolution.resolved()) {
                errors.add(row(entry) + ": " + resolution.problem());
                rowTables.add(null);
                rowColumns.add(null);
                continue;
            }
            CatalogObject table = resolution.table();
            rowTables.add(table);
            InventoryTables.TableColumns tableColumns = tableColumns(inventory, table, entry.source().table(),
                    columns, reported, errors);
            CatalogObject column = tableColumns.columns().stream()
                    .filter(candidate -> InventoryTables.columnMatches(entry.source().column(), candidate))
                    .findFirst()
                    .orElse(null);
            if (column == null && tableColumns.problem() == null) {
                errors.add(row(entry) + ": 소스 컬럼이 inventory 의 이 표에 없습니다");
            }
            rowColumns.add(column);
        }
        return new Resolved(rowTables, rowColumns, skeletonTables, archiveTables, columns);
    }

    /** 표의 컬럼을 한 번만 열거하고, 판정할 수 없으면 그 표마다 한 번 알린다. */
    private static InventoryTables.TableColumns tableColumns(CatalogSnapshot inventory, CatalogObject table,
            String label, Map<String, InventoryTables.TableColumns> columns, Set<String> reported,
            List<String> errors) {
        InventoryTables.TableColumns result = columns.computeIfAbsent(table.stableId(),
                key -> InventoryTables.columns(inventory, table));
        if (result.problem() != null && reported.add(table.stableId())) {
            errors.add(label + ": " + result.problem());
        }
        return result;
    }

    /**
     * 아직 실행할 수 없는 행과 skeleton 밖의 확정·외부 보관 행. 이관 제외로 돌리라고 안내하지 않는다. 외부 보관 행의 표는
     * skeleton 의 tables(매핑하는 표)나 archives(덤프만 하는 표)에 있어야 한다(ADR-0029 L3e).
     */
    private static void rejectUnsupported(TermLedger ledger, Resolved resolved, List<String> errors) {
        for (int index = 0; index < ledger.entries().size(); index++) {
            Entry entry = ledger.entries().get(index);
            if ("ARCHIVE".equals(entry.status())) {
                CatalogObject table = resolved.rowTables().get(index);
                if (table != null && !resolved.inSkeleton(table) && !resolved.dumpOnly(table)) {
                    errors.add(row(entry) + ": skeleton 에 없는 소스 표의 외부 보관 행입니다 — 매핑하는 표면 skeleton 의"
                            + " tables 에, 덤프만 하는 표면 skeleton 의 archives 에 그 표를 두세요");
                }
                continue;
            }
            if (!"CONFIRMED".equals(entry.status())) {
                continue;
            }
            if (entry.via() != null) {
                errors.add(row(entry) + ": 조회 조인(via)은 아직 mapping 으로 만들 수 없습니다(L3d 전)");
            } else if (entry.mapping() != null) {
                errors.add(row(entry) + ": 기본 매핑이 아닌 mapping 은 아직 만들 수 없습니다(L3c 전)");
            } else {
                CatalogObject table = resolved.rowTables().get(index);
                if (table != null && !resolved.inSkeleton(table)) {
                    errors.add(row(entry) + ": skeleton 에 없는 소스 표의 확정 행입니다 — skeleton 에 그 표를 두세요");
                }
            }
        }
    }

    /**
     * 소스 표 단위 완전성. skeleton 표의 모든 inventory 컬럼은 확정 행이 하나 이상(매핑과 조회 경로를 합쳐)이거나 이관
     * 제외·외부 보관 행이 정확히 하나여야 한다.
     */
    private static void complete(Skeleton skeleton, TermLedger ledger, Resolved resolved, List<String> errors) {
        for (int index = 0; index < resolved.skeletonTables().size(); index++) {
            CatalogObject table = resolved.skeletonTables().get(index);
            if (table == null) {
                continue;
            }
            String source = skeleton.spec().tables().get(index).source();
            List<Integer> rows = new ArrayList<>();
            for (int row = 0; row < ledger.entries().size(); row++) {
                CatalogObject rowTable = resolved.rowTables().get(row);
                if (rowTable != null && rowTable.stableId().equals(table.stableId())) {
                    rows.add(row);
                }
            }
            if (rows.isEmpty()) {
                errors.add("skeleton tables[" + index + "] " + source + ": 원장 행이 없는 표입니다 — term-suggest"
                        + " --ledger-draft 로 초안을 만들어 검토하세요");
                continue;
            }
            InventoryTables.TableColumns columns = resolved.columns().get(table.stableId());
            if (columns == null || columns.problem() != null) {
                continue;
            }
            for (CatalogObject column : columns.columns()) {
                int confirmed = 0;
                int disposed = 0;
                List<Entry> others = new ArrayList<>();
                for (int row : rows) {
                    if (resolved.rowColumns().get(row) != column) {
                        continue;
                    }
                    Entry entry = ledger.entries().get(row);
                    if ("CONFIRMED".equals(entry.status())) {
                        confirmed++;
                    } else if (SOURCE_DISPOSITIONS.contains(entry.status())) {
                        disposed++;
                    } else {
                        others.add(entry);
                    }
                }
                if (confirmed > 0 || disposed == 1) {
                    continue;
                }
                String where = source + "." + InventoryTables.columnName(column);
                if (others.isEmpty()) {
                    errors.add(where + ": mapping·원장 어디에도 없는 컬럼입니다 — 옮기면 확정하고, 키로만 쓰거나 옮기지"
                            + " 않으면 이관 제외(APPROVED_IGNORE)와 사유를 적으세요");
                } else {
                    errors.add(row(others.getFirst()) + ": 확정되지 않은 컬럼은 mapping 으로 만들 수 없습니다");
                }
            }
        }
        for (int index = 0; index < resolved.archiveTables().size(); index++) {
            CatalogObject table = resolved.archiveTables().get(index);
            if (table == null) {
                continue;
            }
            String source = skeleton.spec().archives().get(index).source();
            completeDumpOnly(ledger, resolved, table, "skeleton archives[" + index + "] " + source, source, errors);
        }
    }

    /**
     * [ADR-0029 L3e] 덤프만 하는 표의 완전성. 외부 보관 행이 하나 이상 있어야 하고, 모든 inventory 컬럼은 외부 보관·이관
     * 제외 행이 정확히 하나여야 한다 — 정렬 키로만 쓰는 컬럼은 이관 제외와 사유로 적는다(그 값은 덤프 행마다 원값으로 실려
     * 정렬 키 컬럼마다 개인정보 모양 수를 세고, 그 표 외부 보관 행의 확인이 덮는다). 확정 행은 이 표를 매핑하라는 뜻이라
     * 따로 거부된다({@link #rejectUnsupported}).
     */
    private static void completeDumpOnly(TermLedger ledger, Resolved resolved, CatalogObject table, String label,
                                         String source, List<String> errors) {
        InventoryTables.TableColumns columns = resolved.columns().get(table.stableId());
        if (columns == null || columns.problem() != null) {
            return;
        }
        boolean archived = false;
        for (int row = 0; row < ledger.entries().size(); row++) {
            CatalogObject rowTable = resolved.rowTables().get(row);
            if (rowTable != null && rowTable.stableId().equals(table.stableId())
                    && "ARCHIVE".equals(ledger.entries().get(row).status())) {
                archived = true;
            }
        }
        if (!archived) {
            errors.add(label + ": 외부 보관(ARCHIVE) 행이 없는 덤프만 하는 표입니다 — 보관할 컬럼을 원장에서 ARCHIVE 로"
                    + " 정하거나 skeleton 의 archives 에서 빼세요");
            return;
        }
        for (CatalogObject column : columns.columns()) {
            int disposed = 0;
            boolean confirmed = false;
            Entry other = null;
            for (int row = 0; row < ledger.entries().size(); row++) {
                if (resolved.rowColumns().get(row) != column) {
                    continue;
                }
                Entry entry = ledger.entries().get(row);
                if (SOURCE_DISPOSITIONS.contains(entry.status())) {
                    disposed++;
                } else if ("CONFIRMED".equals(entry.status())) {
                    confirmed = true;
                } else if (other == null) {
                    other = entry;
                }
            }
            // 처분이 하나면 됐다. 둘 이상은 원장 검증이, 확정 행은 rejectUnsupported 가 따로 알린다.
            if (disposed > 0 || confirmed) {
                continue;
            }
            String where = source + "." + InventoryTables.columnName(column);
            errors.add(other == null
                    ? where + ": 덤프만 하는 표의 컬럼이 원장에 없습니다 — 보관하면 외부 보관(ARCHIVE), 정렬 키로만 쓰거나"
                            + " 보관하지 않으면 이관 제외(APPROVED_IGNORE)와 사유를 적으세요(정렬 키 값은 덤프 행마다 원값으로"
                            + " 실리고 그 표 외부 보관 행의 개인정보 확인이 덮습니다)"
                    : row(other) + ": 덤프만 하는 표의 컬럼은 외부 보관·이관 제외 중 하나로 정해야 합니다");
        }
    }

    /** skeleton 표마다 fkRef 항목에 load 를 옮기고 확정 행의 컬럼을 덧붙인다. */
    private static void build(Skeleton skeleton, TermLedger ledger, Resolved resolved, ObjectNode root,
                              List<String> errors) {
        ArrayNode tableNodes = (ArrayNode) root.get("tables");
        for (int index = 0; index < resolved.skeletonTables().size(); index++) {
            CatalogObject table = resolved.skeletonTables().get(index);
            InventoryTables.TableColumns columns = table == null ? null : resolved.columns().get(table.stableId());
            if (columns == null || columns.problem() != null) {
                continue;
            }
            TableMapping mapping = skeleton.spec().tables().get(index);
            ObjectNode tableNode = (ObjectNode) tableNodes.get(index);
            JsonNode existing = tableNode.get("columns");
            ArrayNode columnNodes = existing instanceof ArrayNode array ? array : tableNode.putArray("columns");
            Map<String, String> targets = new HashMap<>();
            for (ColumnMapping column : mapping.columns()) {
                if (column.target() != null) {
                    claim(targets, column.target(), column.constant() != null ? "상수(const) 항목" : "fkRef 항목",
                            mapping.source(), errors);
                }
            }
            Set<Integer> consumed = new HashSet<>();
            for (int position = 0; position < mapping.columns().size(); position++) {
                ColumnMapping column = mapping.columns().get(position);
                if (column.fkRef() == null || column.fkRef().isBlank()) {
                    continue;
                }
                fkRef(ledger, resolved, columns, mapping, column, position,
                        (ObjectNode) columnNodes.get(position), consumed, errors);
            }
            for (CatalogObject column : columns.columns()) {
                for (int row = 0; row < ledger.entries().size(); row++) {
                    Entry entry = ledger.entries().get(row);
                    if (resolved.rowColumns().get(row) != column || !defaultConfirmed(entry)
                            || consumed.contains(row)) {
                        continue;
                    }
                    ObjectNode node = column(skeleton.spec(), entry, mapping, column, targets, errors);
                    if (node != null) {
                        columnNodes.add(node);
                    }
                }
            }
        }
    }

    /**
     * [ADR-0029 L3e] 원장 외부 보관(ARCHIVE) 행을 (소스 표, 보존 기한) 마다 보관 선언 하나로 묶어 {@code archives} 에 쓴다.
     * 매핑하는 표(skeleton tables 순서)를 먼저, 덤프만 하는 표(skeleton archives 순서)를 다음에 두고, 한 표 안에서는 보존
     * 기한 순, 컬럼은 inventory 정의 순서다. 매핑하는 표는 그 매핑의 source 표기를 쓰고 where·정렬을 따로 두지 않는다. 덤프만
     * 하는 표는 skeleton 의 where·정렬 키를 옮긴다. 보관할 것이 없으면 {@code archives} 를 쓰지 않는다(덤프만 하는 표가
     * 없을 때의 형태는 {@link #completeDumpOnly} 가 이미 거부했다). id 는 소스 표 이름과 보존 기한으로 정해 같은 입력이 같은
     * 바이트를 낸다.
     */
    private static void archives(Skeleton skeleton, TermLedger ledger, Resolved resolved, ObjectNode root) {
        ArrayNode declarations = JsonNodeFactory.instance.arrayNode();
        Set<String> ids = new HashSet<>();
        for (int index = 0; index < resolved.skeletonTables().size(); index++) {
            CatalogObject table = resolved.skeletonTables().get(index);
            if (table != null) {
                declare(ledger, resolved, table, skeleton.spec().tables().get(index).source(), null, List.of(),
                        declarations, ids);
            }
        }
        for (int index = 0; index < resolved.archiveTables().size(); index++) {
            CatalogObject table = resolved.archiveTables().get(index);
            if (table != null) {
                MappingSpec.ArchiveDump dump = skeleton.spec().archives().get(index);
                declare(ledger, resolved, table, dump.source(), dump.where(), dump.orderByKeys(), declarations, ids);
            }
        }
        if (declarations.isEmpty()) {
            root.remove("archives");
        } else {
            root.set("archives", declarations);
        }
    }

    /** 표 하나의 외부 보관 행을 보존 기한마다 선언 하나로 쓴다. */
    private static void declare(TermLedger ledger, Resolved resolved, CatalogObject table, String source, String where,
                                List<String> orderByKeys, ArrayNode declarations, Set<String> ids) {
        InventoryTables.TableColumns columns = resolved.columns().get(table.stableId());
        if (columns == null || columns.problem() != null) {
            return;
        }
        Map<String, List<Integer>> byRetention = new TreeMap<>();
        for (CatalogObject column : columns.columns()) {
            for (int row = 0; row < ledger.entries().size(); row++) {
                Entry entry = ledger.entries().get(row);
                if (resolved.rowColumns().get(row) == column && "ARCHIVE".equals(entry.status())
                        && entry.archive() != null && entry.archive().retainUntil() != null) {
                    byRetention.computeIfAbsent(entry.archive().retainUntil(), key -> new ArrayList<>()).add(row);
                }
            }
        }
        for (Map.Entry<String, List<Integer>> retention : byRetention.entrySet()) {
            ObjectNode declaration = declarations.addObject();
            String name = table.schema() == null || table.schema().isBlank() ? table.name()
                    : table.schema() + "_" + table.name();
            declaration.put("id", archiveId(name, retention.getKey(), ids));
            declaration.put("source", source);
            if (where != null) {
                declaration.put("where", where);
            }
            if (!orderByKeys.isEmpty()) {
                ArrayNode keys = declaration.putArray("orderByKeys");
                orderByKeys.forEach(keys::add);
            }
            ArrayNode names = declaration.putArray("columns");
            ArrayNode entries = declaration.putArray("ledgerEntries");
            for (int row : retention.getValue()) {
                names.add(InventoryTables.columnName(resolved.rowColumns().get(row)));
                entries.add(ledger.entries().get(row).id());
            }
            declaration.put("retainUntil", retention.getKey());
        }
    }

    /**
     * 보관 선언 id — 소스 표 이름(schema_표)을 소문자·숫자·밑줄로 바꾸고 보존 기한(yyyymmdd)을 붙인다. 소문자로 시작하지
     * 않으면 {@code archive_} 를 앞에 두고 63자에 맞춰 자르며, 겹치면 {@code _2}·{@code _3} 을 붙인다.
     */
    static String archiveId(String tableName, String retainUntil, Set<String> taken) {
        String base = (tableName == null ? "" : tableName).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (base.isEmpty() || base.charAt(0) < 'a' || base.charAt(0) > 'z') {
            base = "archive_" + base;
        }
        String suffix = "_" + retainUntil.replace("-", "");
        String id = trim(base, 63 - suffix.length()) + suffix;
        int copy = 2;
        while (!taken.add(id)) {
            String counter = suffix + "_" + copy++;
            id = trim(base, 63 - counter.length()) + counter;
        }
        return id;
    }

    private static String trim(String value, int length) {
        String trimmed = value.length() > length ? value.substring(0, length) : value;
        return trimmed.replaceAll("_+$", "");
    }

    /** skeleton fkRef 항목은 같은 소스 컬럼의 확정 행이 정한 키 정규화만 받는다. */
    private static void fkRef(TermLedger ledger, Resolved resolved, InventoryTables.TableColumns columns,
                              TableMapping mapping, ColumnMapping column,
                              int position, ObjectNode node, Set<Integer> consumed, List<String> errors) {
        String where = mapping.source() + " fkRef 항목 columns[" + position + "]";
        if (column.source() == null || column.source().isBlank()) {
            errors.add(where + ": fkRef 항목에는 번역할 source 컬럼이 필요합니다");
            return;
        }
        Optional<CatalogObject> inventoryColumn = columns.columns().stream()
                .filter(candidate -> InventoryTables.columnMatches(column.source(), candidate))
                .findFirst();
        if (inventoryColumn.isEmpty()) {
            errors.add(where + "(" + column.source() + "): 소스 컬럼이 inventory 의 이 표에 없습니다");
            return;
        }
        // 한 소스 컬럼은 대상 컬럼마다 확정 행을 둘 수 있다 — 같은 대상의 행을 먼저 고르고, 없으면 첫 행으로 대상 불일치를 알린다.
        Integer match = null;
        for (int row = 0; row < ledger.entries().size(); row++) {
            Entry candidate = ledger.entries().get(row);
            if (resolved.rowColumns().get(row) != inventoryColumn.get() || !defaultConfirmed(candidate)) {
                continue;
            }
            if (match == null || candidate.target().column().equalsIgnoreCase(column.target())) {
                match = row;
                if (candidate.target().column().equalsIgnoreCase(column.target())) {
                    break;
                }
            }
        }
        if (match == null) {
            errors.add(where + "(" + column.source() + "): 같은 소스 컬럼의 확정 행이 원장에 없습니다");
            return;
        }
        Entry entry = ledger.entries().get(match);
        consumed.add(match);
        if (!entry.target().table().equalsIgnoreCase(mapping.target())
                || !entry.target().column().equalsIgnoreCase(column.target())) {
            errors.add(row(entry) + ": 확정 행의 대상이 skeleton fkRef 항목의 대상(" + mapping.target() + "."
                    + column.target() + ")과 다릅니다");
            return;
        }
        Load load = entry.load();
        if (!LoadCapabilities.keyNormalization(load)) {
            errors.add(row(entry) + ": fkRef 컬럼의 load 는 키를 정규화하는 처리(trim·upper·lower·문자 type)만 받습니다"
                    + " — 표준 도메인 변환기·codemap·nullify 는 부모 키를 바꿉니다");
            return;
        }
        if (LoadCapabilities.isolate(entry) != null) {
            errors.add(notIsolatable(entry, "fkRef 컬럼"));
            return;
        }
        if (load.transform() != null) {
            node.put("transform", load.transform());
        }
        if (load.type() != null) {
            node.put("type", load.type());
        }
    }

    /**
     * 확정 행 하나의 컬럼 노드. 대상 표가 다르거나 이관할 수 없는 보호 컬럼이면 null 이다. 원장 승인 예외 가운데 nullify 로
     * NULL 이 되지 않는 위반이 남으면 {@code isolate} 로 옮기고(ADR-0029 L3b), 격리할 수 없는 표·컬럼이면 거부한다.
     */
    private static ObjectNode column(MappingSpec skeleton, Entry entry, TableMapping mapping,
                                     CatalogObject inventoryColumn, Map<String, String> targets, List<String> errors) {
        String sourceColumn = InventoryTables.columnName(inventoryColumn);
        if (!entry.target().table().equalsIgnoreCase(mapping.target())) {
            errors.add(row(entry) + ": 확정 행의 대상 표가 skeleton 의 대상 표(" + mapping.target() + ")와 다릅니다");
            return null;
        }
        Load load = entry.load();
        // 표준 도메인 변환기는 codemap 과 함께 쓸 수 없으므로(원장 검증) 공백을 깎는 앞 처리는 trim 하나다.
        if (load.codemap() != null && !"trim".equals(load.transform()) && fixedWidthCharacter(inventoryColumn)) {
            errors.add(row(entry) + ": 고정 길이 문자(CHAR·NCHAR) 소스의 codemap 앞에는 transform: trim 이 필요합니다 —"
                    + " 공백으로 채운 값이 codemap 키와 맞지 않아 실행에서 CODEMAP_UNMAPPED 로 멈춥니다(적합성 추정은 공백을"
                    + " 깎아 셉니다)");
            return null;
        }
        Optional<ProtectedTargetColumns.Entry> protectedColumn =
                ProtectedTargetColumns.find(entry.target().table(), entry.target().column());
        if (protectedColumn.isPresent() && !protectedColumn.get().protection().migratable()) {
            errors.add(row(entry) + ": 이관 도구가 만들 수 없는 보호 컬럼으로 확정했습니다 — 온라인 앱에서 다시 만드는"
                    + " 값이라 옮길 수 없습니다");
            return null;
        }
        if (!claim(targets, entry.target().column(), "원장 행 " + entry.id(), mapping.source(), errors)) {
            return null;
        }
        ObjectNode node = JsonNodeFactory.instance.objectNode();
        node.put("source", sourceColumn);
        node.put("target", entry.target().column());
        if (load.transform() != null) {
            node.put("transform", load.transform());
        }
        if (load.type() != null) {
            node.put("type", load.type());
        }
        if (load.codemap() != null) {
            node.put("codemap", load.codemap());
        }
        if (!load.nullify().isEmpty()) {
            ArrayNode rules = node.putArray("nullify");
            for (MappingSpec.Nullify rule : load.nullify()) {
                ObjectNode item = rules.addObject();
                item.put("violation", rule.violation().name());
                long maxRows = rule.maxRows();
                if (maxRows <= Integer.MAX_VALUE) {
                    item.put("maxRows", (int) maxRows);
                } else {
                    item.put("maxRows", maxRows);
                }
            }
        }
        protectedColumn.ifPresent(registered -> node.put("encrypt", registered.protection().id()));
        MappingSpec.Isolate isolate = LoadCapabilities.isolate(entry);
        if (isolate != null) {
            String blocker = RowIsolationPolicy.tableBlocker(skeleton.tables(), mapping);
            if (blocker == null) {
                blocker = RowIsolationPolicy.columnBlocker(new ColumnMapping(sourceColumn, entry.target().column(),
                        load.transform(), load.type(), load.codemap(), null, null,
                        protectedColumn.map(registered -> registered.protection().id()).orElse(null),
                        load.nullify()));
            }
            if (blocker != null) {
                errors.add(notIsolatable(entry, blocker));
                return null;
            }
            ObjectNode rule = node.putObject("isolate");
            rule.put("ledgerEntry", isolate.ledgerEntry());
            putCount(rule, "maxRows", isolate.maxRows());
            ArrayNode codes = rule.putArray("violations");
            isolate.violations().forEach(codes::add);
        }
        return node;
    }

    /**
     * inventory 원래 타입이 고정 길이 문자인가. 드라이버가 알린 타입 이름({@code nativeType})으로 정하고, 이름이 없을 때만
     * JDBC 타입(CHAR·NCHAR)으로 정한다 — SQL Server {@code uniqueidentifier}·MySQL {@code ENUM} 처럼 JDBC CHAR 로 알리지만
     * 공백을 채우지 않는 타입은 이름으로 가린다.
     */
    static boolean fixedWidthCharacter(CatalogObject column) {
        String nativeType = column.attributes().get("nativeType");
        if (nativeType != null && !nativeType.isBlank()) {
            String type = nativeType.toLowerCase(Locale.ROOT).replaceAll("\\(.*\\)", " ").replaceAll("\\s+", " ")
                    .trim();
            return FIXED_WIDTH_CHARACTER.contains(type);
        }
        String jdbcType = column.attributes().get("jdbcType");
        return String.valueOf(Types.CHAR).equals(jdbcType) || String.valueOf(Types.NCHAR).equals(jdbcType);
    }

    /**
     * 격리할 수 없는 표·컬럼에 처리되지 않은 위반이 남았다. 이관 제외로 돌리라고 안내하지 않는다 — 옮겨야 할 데이터다.
     */
    private static String notIsolatable(Entry entry, String blocker) {
        return row(entry) + ": 이 표는 격리할 수 없습니다 — 데이터를 바로잡거나 nullify 로 처리하세요(" + blocker + ")";
    }

    /** 정수 값을 int 폭에 들어가면 int 로 쓴다 — 같은 입력이 같은 바이트를 낸다. */
    private static void putCount(ObjectNode node, String field, long value) {
        if (value <= Integer.MAX_VALUE && value >= Integer.MIN_VALUE) {
            node.put(field, (int) value);
        } else {
            node.put(field, value);
        }
    }

    /** 한 대상 컬럼은 한 항목만 채운다. 먼저 채운 항목을 문구에 밝힌다. */
    private static boolean claim(Map<String, String> targets, String column, String owner, String source,
                                 List<String> errors) {
        String previous = targets.putIfAbsent(column.toLowerCase(Locale.ROOT), owner);
        if (previous != null) {
            errors.add(source + ": 같은 대상 컬럼(" + column + ")을 두 항목이 채웁니다 — " + previous + ", " + owner);
            return false;
        }
        return true;
    }

    private static boolean defaultConfirmed(Entry entry) {
        return "CONFIRMED".equals(entry.status()) && entry.mapping() == null && entry.via() == null;
    }

    /**
     * tables·codemaps 에 자격·개인정보로 보이는 값이 있으면 쓰지 않는다. 접속 노드(source·target)는 자리표시 형식을
     * skeleton 에서 이미 검사했다. 문구에는 위치도 싣지 않는다 — codemap 의 레거시 코드가 키로 들어간다.
     */
    private static void guard(ObjectNode root) {
        for (String section : List.of("tables", "codemaps", "archives")) {
            JsonNode node = root.get(section);
            if (node == null) {
                continue;
            }
            try {
                ArtifactRedactionGuard.assertSafe(node);
                ArtifactRedactionGuard.assertNoPersonalValues(node);
            } catch (IllegalArgumentException sensitive) {
                throw new Refused("mapping 의 " + section + " 에 자격·개인정보로 보이는 값이 있어 쓰지 않았습니다");
            }
        }
    }

    private String write(ObjectNode root) {
        try {
            return yaml.writeValueAsString(root);
        } catch (JsonProcessingException impossible) {
            throw new IllegalStateException("mapping 을 쓰지 못했습니다");
        }
    }

    /** 쓴 YAML 을 다시 읽어 같은 트리인지 본다 — 문자가 숫자·boolean 으로 바뀌는 식의 의미 변화를 쓰기 전에 막는다. */
    private void requireSameOnRead(ObjectNode root, String text) {
        JsonNode reread;
        try {
            reread = yaml.readTree(text);
        } catch (JsonProcessingException unreadable) {
            throw new Refused("만든 mapping 을 다시 읽지 못했습니다");
        }
        if (reread == null || !root.equals(MappingGenerator::compareScalar, reread)) {
            throw new Refused("만든 mapping 을 YAML 로 다시 읽으면 값이 달라집니다 — skeleton 의 값 표기를 확인하세요");
        }
    }

    /** 수는 값으로, 나머지는 노드로 비교한다(정수 노드의 폭은 읽는 쪽이 정한다). */
    private static int compareScalar(JsonNode left, JsonNode right) {
        if (left.isNumber() && right.isNumber()) {
            BigDecimal first = left.decimalValue();
            BigDecimal second = right.decimalValue();
            return first.compareTo(second);
        }
        return left.equals(right) ? 0 : 1;
    }

    private static void requireRelative(String ledgerPath) {
        if (ledgerPath == null || ledgerPath.isBlank() || ledgerPath.startsWith("/") || ledgerPath.contains("\\")
                || ledgerPath.contains(":") || List.of(ledgerPath.split("/", -1)).stream()
                .anyMatch(part -> part.isEmpty() || part.equals(".") || part.equals(".."))) {
            throw new Refused("용어 매핑 원장 경로는 출력 mapping 디렉터리 기준의 상대 경로여야 합니다");
        }
    }

    private void refuseIf(List<String> errors) {
        if (errors.isEmpty()) {
            return;
        }
        List<String> shown = errors.stream().limit(MAX_REPORTED).toList();
        String more = errors.size() > shown.size() ? " (외 " + (errors.size() - shown.size()) + "건)" : "";
        throw new Refused("mapping 을 만들지 않았습니다: " + String.join(" | ", shown) + more);
    }

    private static String row(Entry entry) {
        return entry.id() + " " + entry.source().table() + "." + entry.source().column() + "(" + entry.status() + ")";
    }

    private static String sha256Hex(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
