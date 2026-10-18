package nuri.migration.validate.ledger;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.InventoryTables;
import nuri.migration.lookup.LookupRef;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec;
import nuri.migration.validate.ledger.TermLedger.Entry;
import nuri.migration.validate.ledger.TermLedger.Load;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;

import static nuri.migration.validate.ledger.TermLedgerValidator.MAPPING_ID;
import static nuri.migration.validate.ledger.TermLedgerValidator.SOURCE_DISPOSITIONS;
import static nuri.migration.validate.ledger.TermLedgerValidator.blank;
import static nuri.migration.validate.ledger.TermLedgerValidator.complete;
import static nuri.migration.validate.ledger.TermLedgerValidator.key;
import static nuri.migration.validate.ledger.TermLedgerValidator.label;

/**
 * 용어 매핑 원장의 2단계({@link TermLedgerValidator#coverage}) — mapping과 원장을 승인 inventory의 표·컬럼 및 외부 보관 선언으로 맞춘다.
 */
final class TermLedgerCoverageValidator {

    private TermLedgerCoverageValidator() {
    }

    static List<String> coverage(TermLedger ledger, MappingSpec mapping, CatalogSnapshot inventory) {
        Objects.requireNonNull(ledger, "ledger");
        Objects.requireNonNull(mapping, "mapping");
        Objects.requireNonNull(inventory, "inventory");
        List<String> errors = new ArrayList<>();
        Map<String, InventoryTables.TableColumns> columnsByTable = new HashMap<>();
        Set<String> reported = new HashSet<>();
        List<Entry> entries = ledger.entries();
        List<CatalogObject> rowTables = new ArrayList<>();
        List<CatalogObject> rowColumns = new ArrayList<>();
        for (Entry entry : entries) {
            CatalogObject table = null;
            CatalogObject column = null;
            if (complete(entry.source())) {
                InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, entry.source().table());
                if (!resolution.resolved()) {
                    errors.add(row(entry) + ": " + resolution.problem());
                } else {
                    table = resolution.table();
                    InventoryTables.TableColumns columns = tableColumns(inventory, table, entry.source().table(),
                            columnsByTable, reported, errors);
                    column = columns.columns().stream()
                            .filter(candidate -> InventoryTables.columnMatches(entry.source().column(), candidate))
                            .findFirst().orElse(null);
                    if (column == null && columns.problem() == null) {
                        errors.add(row(entry) + ": 소스 컬럼이 inventory 의 이 표에 없습니다");
                    }
                }
            }
            rowTables.add(table);
            rowColumns.add(column);
        }
        conflicts(entries, rowColumns, errors);

        Map<String, CatalogObject> mappedTables = new LinkedHashMap<>();
        // 매핑이 주 소스로 읽는 표(조회만 하는 표 제외) — 보관 선언이 매핑의 읽기에 붙는지 정한다(ADR-0029 L3e·L3d).
        Set<String> readSources = new HashSet<>();
        Set<String> mappedIds = new HashSet<>();
        Map<String, MappingSpec.TableMapping> byId = new HashMap<>();
        Set<Integer> used = new HashSet<>();
        Set<CatalogObject> mappedColumns = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (MappingSpec.TableMapping table : mapping.tables()) {
            if (table.id() != null) {
                byId.putIfAbsent(table.id(), table);
            }
            InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, table.source());
            if (!resolution.resolved()) {
                errors.add("mapping 소스 표 " + table.source() + ": " + resolution.problem());
                continue;
            }
            CatalogObject sourceTable = resolution.table();
            mappedTables.putIfAbsent(sourceTable.stableId(), sourceTable);
            readSources.add(sourceTable.stableId());
            mappedIds.add(sourceTable.stableId() + '\u0000' + table.effectiveId());
            InventoryTables.TableColumns columns = tableColumns(inventory, sourceTable, table.source(),
                    columnsByTable, reported, errors);
            for (MappingSpec.ColumnMapping column : table.columns()) {
                if (column.source() == null || column.constant() != null || LookupRef.parse(column.source()) != null) {
                    continue; // 조회 컬럼은 아래에서 조회 표로 맞춘다.
                }
                forward(table, column, column.source(), columns, entries, rowColumns, used, mappedColumns,
                        entry -> directConfirmed(entry) && effectiveMapping(entry).equals(table.effectiveId()),
                        errors);
            }
            for (MappingSpec.Lookup lookup : table.lookups()) {
                if (lookup == null || lookup.source() == null || lookup.alias() == null) {
                    continue; // 선언 오류는 mapping 정적 검증(LookupRules)이 알린다.
                }
                InventoryTables.Resolution lookupResolution = InventoryTables.resolve(inventory, lookup.source());
                if (!lookupResolution.resolved()) {
                    errors.add("mapping 조회 표 " + lookup.source() + ": " + lookupResolution.problem());
                    continue;
                }
                CatalogObject lookupTable = lookupResolution.table();
                mappedTables.putIfAbsent(lookupTable.stableId(), lookupTable);
                InventoryTables.TableColumns lookupColumns = tableColumns(inventory, lookupTable, lookup.source(),
                        columnsByTable, reported, errors);
                for (MappingSpec.ColumnMapping column : table.columns()) {
                    LookupRef ref = LookupRef.parse(column.source());
                    if (ref == null || column.constant() != null || !lookup.alias().equals(ref.alias())) {
                        continue;
                    }
                    forward(table, column, ref.column(), lookupColumns, entries, rowColumns, used, mappedColumns,
                            entry -> viaConfirmed(entry, table.effectiveId(), lookup.alias()), errors);
                }
            }
        }

        for (int index = 0; index < entries.size(); index++) {
            Entry entry = entries.get(index);
            CatalogObject table = rowTables.get(index);
            InventoryTables.TableColumns columns = table == null ? null : columnsByTable.get(table.stableId());
            if (!"CONFIRMED".equals(entry.status()) || table == null || used.contains(index)
                    || (columns != null && columns.problem() != null) || rowColumns.get(index) == null) {
                continue; // 찾지 못한 컬럼·열거하지 못한 표는 그 사유 하나로 알린다.
            }
            if (entry.via() != null) {
                errors.add(row(entry) + unusedVia(entry, table, byId, inventory));
                continue;
            }
            errors.add(row(entry) + (!mappedTables.containsKey(table.stableId())
                    ? ": mapping 이 읽지 않는 소스 표의 확정 행입니다 — mapping-generate 로 다시 만드세요"
                    : !mappedIds.contains(table.stableId() + '\u0000' + effectiveMapping(entry))
                    ? ": 확정 행의 매핑(" + mappingLabel(entry) + ")이 mapping 에 없습니다 — skeleton 에 그 id 의 매핑을 두고"
                            + " mapping-generate 로 다시 만드세요"
                    : ": 확정 행이 mapping 에 없습니다 — mapping-generate 로 다시 만드세요"));
        }

        Map<String, CatalogObject> dumpOnlyTables = archives(mapping, inventory, entries, rowColumns, readSources,
                columnsByTable, reported, errors);

        // 조회만 하는 표를 덤프하면 두 목록에 함께 있다 — 한 번만 본다.
        Map<String, CatalogObject> sourceTables = new LinkedHashMap<>(mappedTables);
        dumpOnlyTables.forEach(sourceTables::putIfAbsent);
        for (CatalogObject table : sourceTables.values()) {
            InventoryTables.TableColumns columns = columnsByTable.get(table.stableId());
            if (columns == null || columns.problem() != null) {
                continue;
            }
            for (CatalogObject column : columns.columns()) {
                if (mappedColumns.contains(column)) {
                    continue; // mapping 이 읽는 컬럼은 정방향이 기본 확정 행을 요구했다.
                }
                int confirmed = 0;
                int disposed = 0;
                Entry other = null;
                for (int index = 0; index < entries.size(); index++) {
                    if (rowColumns.get(index) != column) {
                        continue;
                    }
                    Entry entry = entries.get(index);
                    if ("CONFIRMED".equals(entry.status())) {
                        confirmed++;
                    } else if (SOURCE_DISPOSITIONS.contains(entry.status())) {
                        disposed++;
                    } else if (other == null) {
                        other = entry;
                    }
                }
                if (confirmed > 0 || disposed > 0) {
                    continue; // 처분 행이 둘 이상이거나 확정 행과 함께 있으면 conflicts 가 알렸다.
                }
                String where = InventoryTables.columnName(column);
                errors.add(other == null
                        ? table.name() + "." + where + ": mapping·원장 어디에도 없는 컬럼입니다 — 옮기면 확정하고, 키로만"
                                + " 쓰거나 옮기지 않으면 이관 제외(APPROVED_IGNORE)와 사유를 적으세요"
                        : row(other) + ": 소스 표의 컬럼이 확정·이관 제외·외부 보관 중 하나로 정해지지 않았습니다");
            }
        }
        return errors;
    }

    /**
     * 조회 경로 행이 mapping 에 쓰이지 않은 사유(ADR-0029 L3d). 읽는 매핑이 없거나, 그 매핑이 별칭을 선언하지 않았거나,
     * 별칭이 다른 표를 읽거나, 그 컬럼을 읽는 항목이 없다.
     */
    private static String unusedVia(Entry entry, CatalogObject table, Map<String, MappingSpec.TableMapping> byId,
                                    CatalogSnapshot inventory) {
        MappingSpec.TableMapping reader = byId.get(entry.via().mapping());
        if (reader == null) {
            return ": 조회 경로의 매핑(" + entry.via().mapping() + ")이 mapping 에 없습니다 — skeleton 에 그 id 의 매핑을 두고"
                    + " mapping-generate 로 다시 만드세요";
        }
        MappingSpec.Lookup lookup = reader.lookup(entry.via().lookup());
        if (lookup == null) {
            return ": 조회 경로의 별칭(" + entry.via().lookup() + ")을 매핑 " + entry.via().mapping()
                    + " 이 선언하지 않았습니다 — skeleton 의 그 매핑에 lookups 를 두세요";
        }
        InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, lookup.source());
        if (!resolution.resolved() || !resolution.table().stableId().equals(table.stableId())) {
            return ": 조회 별칭(" + entry.via().mapping() + "/" + entry.via().lookup() + ")이 읽는 표가 원장 행의 소스 표와"
                    + " 다릅니다";
        }
        return ": 확정 행이 mapping 에 없습니다 — mapping-generate 로 다시 만드세요";
    }

    /**
     * mapping 컬럼 하나를 같은 inventory 컬럼의 확정 행과 맞춘다. {@code mine} 은 이 컬럼이 쓸 수 있는 확정 행 — 직접 옮기면
     * 같은 매핑 id 의 조회 경로 없는 행, 조회 컬럼이면 같은 매핑 id·별칭의 조회 경로 행이다(ADR-0029 L3d).
     */
    private static void forward(MappingSpec.TableMapping table, MappingSpec.ColumnMapping column, String sourceColumn,
                                InventoryTables.TableColumns columns, List<Entry> entries,
                                List<CatalogObject> rowColumns, Set<Integer> used,
                                Set<CatalogObject> mappedColumns, Predicate<Entry> mine, List<String> errors) {
        String where = MappingIndex.label(table) + "." + column.source();
        if (columns.problem() != null) {
            return;
        }
        CatalogObject inventoryColumn = columns.columns().stream()
                .filter(candidate -> InventoryTables.columnMatches(sourceColumn, candidate))
                .findFirst().orElse(null);
        if (inventoryColumn == null) {
            errors.add(where + ": 소스 컬럼이 inventory 의 이 표에 없습니다");
            return;
        }
        mappedColumns.add(inventoryColumn);
        List<Integer> confirmed = new ArrayList<>();
        List<Integer> sameTarget = new ArrayList<>();
        Entry unconfirmed = null;
        Entry elsewhere = null;
        for (int index = 0; index < entries.size(); index++) {
            if (rowColumns.get(index) != inventoryColumn) {
                continue;
            }
            Entry entry = entries.get(index);
            if (mine.test(entry)) {
                confirmed.add(index);
                // 한 소스 컬럼은 대상 컬럼마다 확정 행을 둘 수 있으므로 같은 대상의 행과 맞춘다.
                if (complete(entry.target()) && entry.target().column().equalsIgnoreCase(column.target())) {
                    sameTarget.add(index);
                }
            } else if ("CONFIRMED".equals(entry.status())) {
                elsewhere = elsewhere == null ? entry : elsewhere;
            } else if (unconfirmed == null) {
                unconfirmed = entry;
            }
        }
        if (sameTarget.size() > 1) {
            errors.add(where + ": 같은 소스 컬럼·매핑·대상 컬럼의 확정 행이 둘 이상입니다(원장 표 표기가 다른 행)");
            return;
        }
        if (confirmed.isEmpty()) {
            errors.add(elsewhere != null
                    ? where + ": 이 매핑의 확정 행이 없습니다 — 원장 행 " + elsewhere.id() + " 은 다른 mapping·조회 경로입니다"
                    : unconfirmed != null
                    ? where + ": 원장 행 " + unconfirmed.id() + " 이 확정되지 않았습니다(" + unconfirmed.status() + ")"
                    : where + ": 원장에 없는 매핑입니다");
            return;
        }
        int index = sameTarget.isEmpty() ? confirmed.getFirst() : sameTarget.getFirst();
        Entry entry = entries.get(index);
        used.add(index);
        if (!complete(entry.target())
                || !entry.target().table().equalsIgnoreCase(table.target())
                || !entry.target().column().equalsIgnoreCase(column.target())) {
            errors.add(where + ": 원장 행 " + entry.id() + " 의 대상과 mapping 의 대상("
                    + table.target() + "." + column.target() + ")이 다릅니다");
            return;
        }
        Load load = entry.load() == null ? new Load(null, null, null, List.of()) : entry.load();
        if (column.fkRef() != null && !column.fkRef().isBlank() && !LoadCapabilities.keyNormalization(load)) {
            errors.add(where + ": fkRef 컬럼의 원장 행 " + entry.id() + " load 는 키를 정규화하는 처리(trim·upper·"
                    + "lower·문자 type)만 받습니다 — 표준 도메인 변환기·codemap·nullify 는 부모 키를 바꿉니다");
        }
        // [ADR-0029 L4-B R3] 생성기와 같은 판정을 실제로 실행될 mapping 컬럼에 다시 한다 — 손으로 쓴 mapping 도 막힌다.
        if (LoadCapabilities.untrimmedFixedWidthCodemap(column.transform(), column.codemap(), inventoryColumn)) {
            errors.add(where + "(원장 행 " + entry.id() + "): " + LoadCapabilities.FIXED_WIDTH_TRIM_REQUIRED);
        }
        if (!Objects.equals(column.transform(), load.transform()) || !Objects.equals(column.type(), load.type())
                || !Objects.equals(column.codemap(), load.codemap())
                || !Objects.equals(nonNullList(column.nullify()), load.nullify())) {
            errors.add(where + ": mapping 의 변환(transform·type·codemap·nullify)이 원장 행 " + entry.id()
                    + " 의 load 와 다릅니다 — mapping-generate 로 다시 만드세요");
        }
        // [ADR-0029 L3b] 격리는 원장 승인 예외에서만 온다 — mapping 에만 있거나 원장에만 있거나 내용이 다르면 거부한다.
        if (!Objects.equals(column.isolate(), LoadCapabilities.isolate(entry))) {
            errors.add(where + ": mapping 의 격리(isolate)가 원장 행 " + entry.id() + " 의 승인 예외(nullify 로 NULL 이"
                    + " 되지 않는 위반)와 다릅니다 — mapping-generate 로 다시 만드세요");
        }
    }

    /**
     * [ADR-0029 L3e] mapping 의 보관 선언과 원장 외부 보관(ARCHIVE) 행을 양방향으로 맞춘다. 선언한 컬럼은 모두 같은
     * inventory 컬럼의 ARCHIVE 행(같은 순서의 {@code ledgerEntries}, 같은 보존 기한)이고, ARCHIVE 행은 모두 정확히 한 선언에
     * 있다. 매핑된 표의 보관은 그 매핑과 같은 source 표기로 적는다 — load 가 그 표기로 매핑의 읽기에 보관 컬럼을 붙인다.
     * 덤프만 하는 같은 표의 보관 선언끼리도 같은 표기를 쓴다 — load 가 표기마다 따로 읽는다.
     * 덤프만 하는 표의 정렬 키는 inventory 컬럼이어야 한다. 돌려주는 값은 덤프만 하는 표(inventory stableId → 표)이고 소스
     * 단위 완전성이 함께 본다.
     */
    private static Map<String, CatalogObject> archives(MappingSpec mapping, CatalogSnapshot inventory,
            List<Entry> entries, List<CatalogObject> rowColumns, Set<String> readSources,
            Map<String, InventoryTables.TableColumns> columnsByTable, Set<String> reported, List<String> errors) {
        Map<String, Integer> byId = new HashMap<>();
        for (int index = 0; index < entries.size(); index++) {
            if (entries.get(index).id() != null) {
                byId.putIfAbsent(entries.get(index).id(), index);
            }
        }
        Map<String, CatalogObject> dumpOnly = new LinkedHashMap<>();
        Map<String, String> dumpOnlyNotation = new HashMap<>();
        Set<Integer> archived = new HashSet<>();
        for (int position = 0; position < mapping.archives().size(); position++) {
            MappingSpec.ArchiveDump archive = mapping.archives().get(position);
            if (archive == null || blank(archive.source())) {
                continue; // 정적 mapping 검증이 위치와 함께 알린다.
            }
            String label = "보관 선언 archives[" + position + "]"
                    + (archive.id() != null && MAPPING_ID.matcher(archive.id()).matches() ? "(" + archive.id() + ")" : "");
            InventoryTables.Resolution resolution = InventoryTables.resolve(inventory, archive.source());
            if (!resolution.resolved()) {
                errors.add(label + " 소스 표 " + archive.source() + ": " + resolution.problem());
                continue;
            }
            CatalogObject table = resolution.table();
            InventoryTables.TableColumns columns = tableColumns(inventory, table, archive.source(), columnsByTable,
                    reported, errors);
            if (columns.problem() != null) {
                continue;
            }
            if (readSources.contains(table.stableId())) {
                if (mapping.mappedTableOf(archive.source()) == null) {
                    errors.add(label + ": 매핑된 소스 표를 매핑과 다른 표기(" + archive.source() + ")로 적었습니다 — 매핑과"
                            + " 같은 source 표기를 쓰세요");
                }
            } else {
                dumpOnly.putIfAbsent(table.stableId(), table);
                // 같은 표를 다른 표기로 적으면 mapping 검증·load 가 다른 표로 보아 따로 읽는다 — 한 번 읽어 나눠 쓰지 않는다.
                String notation = archive.source().trim().toLowerCase(Locale.ROOT);
                String first = dumpOnlyNotation.putIfAbsent(table.stableId(), notation);
                if (first != null && !first.equals(notation)) {
                    errors.add(label + ": 덤프만 하는 소스 표를 다른 보관 선언과 다른 표기(" + archive.source() + ")로"
                            + " 적었습니다 — 같은 표의 보관 선언은 같은 source 표기를 쓰세요");
                }
                for (String key : archive.orderByKeys()) {
                    if (key != null && columns.columns().stream()
                            .noneMatch(candidate -> InventoryTables.columnMatches(key, candidate))) {
                        errors.add(label + ": 정렬 키 " + key + " 가 inventory 의 이 표에 없습니다");
                    }
                }
            }
            int pairs = Math.min(archive.columns().size(), archive.ledgerEntries().size());
            for (int pair = 0; pair < pairs; pair++) {
                String name = archive.columns().get(pair);
                String ledgerId = archive.ledgerEntries().get(pair);
                CatalogObject column = name == null ? null : columns.columns().stream()
                        .filter(candidate -> InventoryTables.columnMatches(name, candidate))
                        .findFirst().orElse(null);
                if (column == null) {
                    errors.add(label + ": 보관 컬럼 " + name + " 이 inventory 의 이 표에 없습니다");
                    continue;
                }
                Integer index = ledgerId == null ? null : byId.get(ledgerId);
                if (index == null) {
                    errors.add(label + ": 원장 행 " + ledgerId + " 이 원장에 없습니다");
                    continue;
                }
                Entry entry = entries.get(index);
                if (!"ARCHIVE".equals(entry.status())) {
                    errors.add(label + ": 원장 행 " + entry.id() + " 은 외부 보관(ARCHIVE) 행이 아닙니다("
                            + entry.status() + ")");
                    continue;
                }
                if (rowColumns.get(index) != column) {
                    errors.add(label + ": 원장 행 " + entry.id() + " 의 소스 컬럼이 보관 컬럼 " + name + " 과 다릅니다");
                    continue;
                }
                if (entry.archive() == null || !Objects.equals(entry.archive().retainUntil(), archive.retainUntil())) {
                    errors.add(label + ": 보존 기한이 원장 행 " + entry.id() + " 과 다릅니다 — 보존 기한이 다른 행은 같은"
                            + " 덤프에 섞지 않습니다");
                }
                if (!archived.add(index)) {
                    errors.add(label + ": 원장 행 " + entry.id() + " 을 두 보관 선언이 가리킵니다");
                }
            }
        }
        for (int index = 0; index < entries.size(); index++) {
            Entry entry = entries.get(index);
            if ("ARCHIVE".equals(entry.status()) && !archived.contains(index) && rowColumns.get(index) != null) {
                errors.add(row(entry) + ": 외부 보관 행이 mapping 의 archives 에 없습니다 — mapping-generate 로 다시"
                        + " 만드세요");
            }
        }
        return dumpOnly;
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
     * 표기가 달라도 같은 inventory 컬럼을 가리키는 행끼리 {@link TermLedgerValidator#validate} 의 소스 단위 규칙을 다시 본다 — 확정되지 않은
     * 행은 컬럼마다 하나이고, 이관 제외·외부 보관한 컬럼을 확정 행이 옮기지 않는다. 표기까지 같은 행은 validate 가
     * 이미 알렸으므로 표기가 다른 행만 알린다.
     */
    private static void conflicts(List<Entry> entries, List<CatalogObject> rowColumns, List<String> errors) {
        Map<CatalogObject, List<Integer>> byColumn = new LinkedHashMap<>();
        for (int index = 0; index < entries.size(); index++) {
            if (rowColumns.get(index) != null) {
                byColumn.computeIfAbsent(rowColumns.get(index), key -> new ArrayList<>()).add(index);
            }
        }
        for (List<Integer> rows : byColumn.values()) {
            Entry firstUnconfirmed = null;
            Entry firstConfirmed = null;
            for (int index : rows) {
                Entry entry = entries.get(index);
                if ("CONFIRMED".equals(entry.status())) {
                    firstConfirmed = firstConfirmed == null ? entry : firstConfirmed;
                } else if (firstUnconfirmed == null) {
                    firstUnconfirmed = entry;
                } else if (!key(firstUnconfirmed.source()).equals(key(entry.source()))) {
                    errors.add(row(entry) + ": 같은 소스 컬럼의 확정되지 않은 행(" + firstUnconfirmed.id()
                            + ")이 이미 있습니다(원장 표 표기가 다른 행)");
                }
            }
            if (firstConfirmed == null) {
                continue;
            }
            for (int index : rows) {
                Entry entry = entries.get(index);
                if (SOURCE_DISPOSITIONS.contains(entry.status())
                        && !key(firstConfirmed.source()).equals(key(entry.source()))) {
                    errors.add(row(entry) + ": 처분한 소스 컬럼을 확정 행(" + firstConfirmed.id()
                            + ")이 옮깁니다(원장 표 표기가 다른 행)");
                }
            }
        }
    }

    private static <T> List<T> nonNullList(List<T> values) {
        return values == null ? List.of() : values;
    }

    private static String row(Entry entry) {
        return entry.id() + (complete(entry.source()) ? " " + label(entry.source()) : "") + "(" + entry.status() + ")";
    }

    /** 조회 경로 없이 mapping 이 직접 옮기는 확정 행(ADR-0029 L3c 부터 기본이 아닌 매핑 포함). */
    private static boolean directConfirmed(Entry entry) {
        return "CONFIRMED".equals(entry.status()) && entry.via() == null;
    }

    /** 이 매핑 id 가 이 별칭으로 조회해 옮기는 확정 행(ADR-0029 L3d). */
    private static boolean viaConfirmed(Entry entry, String mappingId, String alias) {
        return "CONFIRMED".equals(entry.status()) && entry.via() != null
                && mappingId.equals(entry.via().mapping()) && alias.equals(entry.via().lookup());
    }

    /** 원장 행의 실효 매핑 id. 생략하면 그 소스의 기본 매핑이다. */
    private static String effectiveMapping(Entry entry) {
        return entry.mapping() == null ? MappingSpec.TableMapping.DEFAULT_ID : entry.mapping();
    }

    private static String mappingLabel(Entry entry) {
        return entry.mapping() == null ? "기본 매핑" : entry.mapping();
    }
}
