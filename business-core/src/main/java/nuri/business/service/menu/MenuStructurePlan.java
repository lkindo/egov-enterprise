package nuri.business.service.menu;

import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.auth.dto.AuthorizationDto.GroupVersion;
import nuri.business.service.auth.dto.AuthorizationDto.NavigationConflict;
import nuri.business.service.auth.dto.AuthorizationDto.ResolvedGrantChange;
import nuri.business.service.menu.dto.MenuStructureDto.MenuCreation;
import nuri.business.service.menu.dto.MenuStructureDto.MenuGroupGrantChange;
import nuri.business.service.menu.dto.MenuStructureDto.MenuPlacement;
import nuri.business.service.menu.dto.MenuStructureDto.MenuProperties;
import nuri.business.service.menu.dto.MenuStructureDto.MenuStructure;
import nuri.business.service.menu.dto.MenuStructureDto.MenuStructureItem;
import nuri.business.service.menu.dto.MenuStructureDto.MenuStructureSave;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

/**
 * [2026-10-02 D2] 메뉴 구조 저장 요청을 검사하고 최종 메뉴 그래프를 계산한다. DB 를 읽거나 쓰지 않는 순수 계산이며
 * {@link MenuService#saveMenuStructure} 가 잠근 행을 넘겨준다.
 *
 * <p>새 메뉴는 저장 전까지 번호가 없으므로 {@code new-<숫자>} 키마다 음수 임시 번호를 둔다(첫 새 메뉴가 -1).
 * 깊이 3단계 규칙은 이번 요청이 만들거나 옮긴 메뉴와 그 하위에만 적용한다 — 기존 데이터의 위반이 무관한 저장을 막지 않게 한다.
 */
final class MenuStructurePlan {
    static final int MAX_DEPTH = 3;
    private static final String NEW_PREFIX = "new-";
    private static final String HIERARCHY_MESSAGE = "상위 메뉴 계층이 올바르지 않습니다. 메뉴를 다시 확인해 주세요.";

    private final Map<String, MenuCreation> creations = new LinkedHashMap<>();
    private final Map<String, Long> tempIds = new LinkedHashMap<>();
    private final Map<String, MenuPlacement> placements = new LinkedHashMap<>();
    private final Map<Long, MenuProperties> properties = new LinkedHashMap<>();
    private final Set<Long> deletions = new TreeSet<>();
    private final Map<String, MenuGroupGrantChange> grants = new TreeMap<>();

    private final Map<Long, Long> finalParents = new HashMap<>();
    private final Map<Long, Long> moved = new TreeMap<>();
    private final Map<Long, String> names = new HashMap<>();
    private final List<String> creationOrder = new ArrayList<>();

    private MenuStructurePlan() {}

    static boolean hasItems(List<?> items) {
        return items != null && !items.isEmpty();
    }

    /** 형태 검사 — DB 를 읽기 전에 사람이 읽을 수 있는 사유로 400 을 낸다. */
    static MenuStructurePlan of(MenuStructureSave request) {
        if (request.version() == null || request.creations() == null || request.placements() == null
                || request.properties() == null || request.deletions() == null || request.grants() == null) {
            invalid("메뉴 구조 저장 요청이 올바르지 않습니다. 다시 불러온 뒤 저장해 주세요.");
        }
        if (request.creations().isEmpty() && request.placements().isEmpty() && request.properties().isEmpty()
                && request.deletions().isEmpty() && request.grants().isEmpty()) {
            invalid("바뀐 내용이 없습니다.");
        }
        var plan = new MenuStructurePlan();
        plan.readCreations(request.creations());
        plan.readPlacements(request.placements());
        plan.readProperties(request.properties());
        plan.readDeletions(request.deletions());
        plan.readGrants(request.grants());
        plan.rejectChangesToDeletedMenus();
        return plan;
    }

    private void readCreations(List<MenuCreation> items) {
        for (MenuCreation creation : items) {
            if (creation == null || creation.key() == null || !creation.key().matches("new-[1-9][0-9]{0,5}")
                    || blank(creation.menuNm()) || !"Y".equals(creation.useYn()) && !"N".equals(creation.useYn())) {
                invalid("새 메뉴 항목이 올바르지 않습니다.");
            }
            if (creations.putIfAbsent(creation.key(), creation) != null) {
                invalid("새 메뉴 키 '" + creation.key() + "'이(가) 두 번 쓰였습니다.");
            }
            tempIds.put(creation.key(), -(long) tempIds.size() - 1);
        }
    }

    private void readPlacements(List<MenuPlacement> items) {
        for (MenuPlacement placement : items) {
            if (placement == null || placement.ref() == null || placement.menuOrdr() == null) {
                invalid("메뉴 위치 항목이 올바르지 않습니다.");
            }
            requireRef(placement.ref());
            if (placement.parentRef() != null) requireRef(placement.parentRef());
            if (placement.ref().equals(placement.parentRef())) invalid(HIERARCHY_MESSAGE);
            if (placements.putIfAbsent(placement.ref(), placement) != null) {
                invalid("메뉴 '" + placement.ref() + "'의 위치가 두 번 지정됐습니다.");
            }
        }
        creations.forEach((key, creation) -> {
            if (!placements.containsKey(key)) invalid("새 메뉴 '" + creation.menuNm() + "'의 위치를 정해 주세요.");
        });
    }

    private void readProperties(List<MenuProperties> items) {
        for (MenuProperties item : items) {
            if (item == null || item.menuNo() == null || item.menuNo() < 1 || blank(item.menuNm())
                    || !"Y".equals(item.useYn()) && !"N".equals(item.useYn())) {
                invalid("메뉴 속성 항목이 올바르지 않습니다.");
            }
            if (properties.putIfAbsent(item.menuNo(), item) != null) {
                invalid("메뉴 " + item.menuNo() + "의 속성이 두 번 지정됐습니다.");
            }
        }
    }

    private void readDeletions(List<Long> items) {
        for (Long id : items) {
            if (id == null || id < 1) invalid("삭제할 메뉴 번호가 올바르지 않습니다.");
            if (!deletions.add(id)) invalid("삭제할 메뉴 " + id + "이(가) 두 번 지정됐습니다.");
        }
    }

    private void readGrants(List<MenuGroupGrantChange> items) {
        for (MenuGroupGrantChange change : items) {
            if (change == null || blank(change.groupCode()) || blank(change.groupVersion()) || change.navigationAdd() == null
                    || change.navigationRemove() == null || change.operationAdd() == null) {
                invalid("그룹 권한 변경 항목이 올바르지 않습니다.");
            }
            String code = change.groupCode();
            if (grants.putIfAbsent(code, change) != null) invalid("그룹 '" + code + "'의 권한 변경이 두 번 지정됐습니다.");
            if (change.navigationAdd().isEmpty() && change.navigationRemove().isEmpty() && change.operationAdd().isEmpty()) {
                invalid("그룹 '" + code + "'에 바꿀 권한이 없습니다.");
            }
            var added = new HashSet<String>();
            for (String ref : change.navigationAdd()) {
                requireRef(ref);
                if (!added.add(ref)) invalid("그룹 '" + code + "'에 같은 메뉴 표시가 두 번 지정됐습니다.");
            }
            var removed = new HashSet<Long>();
            for (Long id : change.navigationRemove()) {
                if (id == null || id < 1) invalid("회수할 메뉴 번호가 올바르지 않습니다.");
                if (!removed.add(id)) invalid("그룹 '" + code + "'에 같은 메뉴 표시 회수가 두 번 지정됐습니다.");
                if (added.contains(id.toString())) invalid("그룹 '" + code + "'에 같은 메뉴의 표시를 추가하면서 회수할 수 없습니다.");
            }
            var operations = new HashSet<String>();
            for (String operation : change.operationAdd()) {
                if (operation == null || !PermissionCodes.ALL.contains(operation)) invalid("알 수 없는 기능 권한입니다: " + operation);
                if (!operations.add(operation)) invalid("그룹 '" + code + "'에 같은 기능 권한이 두 번 지정됐습니다.");
            }
            if ("ROLE_ANONYMOUS".equals(code) && !operations.isEmpty()) invalid("공개 메뉴용 그룹에는 기능 권한을 줄 수 없습니다.");
        }
    }

    private void rejectChangesToDeletedMenus() {
        for (Long id : deletions) {
            String ref = id.toString();
            boolean touched = placements.containsKey(ref)
                    || placements.values().stream().anyMatch(placement -> ref.equals(placement.parentRef()))
                    || properties.containsKey(id)
                    || grants.values().stream().anyMatch(change -> change.navigationAdd().contains(ref)
                            || change.navigationRemove().contains(id));
            if (touched) invalid("삭제할 메뉴 " + id + "을(를) 함께 옮기거나 고치거나 그 메뉴 표시를 바꿀 수 없습니다.");
        }
    }

    /** 잠근 행으로 존재·계층·깊이·삭제 뒤 남는 하위를 검사하고 최종 그래프를 만든다. */
    void resolveAgainst(List<MenuRepository.StructureRow> rows) {
        var current = new HashMap<Long, Long>();
        for (var row : rows) {
            current.put(row.getMenuSn(), normalizeParent(row.getUpMenuSn()));
            names.put(row.getMenuSn(), row.getMenuNm());
        }
        placements.forEach((ref, placement) -> {
            requireExisting(ref, current);
            if (placement.parentRef() != null) requireExisting(placement.parentRef(), current);
        });
        properties.keySet().forEach(id -> requireExisting(id.toString(), current));
        deletions.forEach(id -> requireExisting(id.toString(), current));
        grants.values().forEach(change -> {
            change.navigationAdd().forEach(ref -> requireExisting(ref, current));
            change.navigationRemove().forEach(id -> requireExisting(id.toString(), current));
        });
        properties.forEach((id, item) -> names.put(id, item.menuNm()));
        creations.forEach((key, creation) -> names.put(tempIds.get(key), creation.menuNm()));

        finalParents.putAll(current);
        placements.forEach((ref, placement) -> {
            Long id = temporaryId(ref);
            Long parent = placement.parentRef() == null ? null : temporaryId(placement.parentRef());
            if (id > 0 && !Objects.equals(current.get(id), parent)) moved.put(id, parent);
            finalParents.put(id, parent);
        });
        deletions.forEach(finalParents::remove);
        finalParents.forEach((child, parent) -> {
            if (parent != null && deletions.contains(parent)) {
                invalid("'" + name(parent) + "' 메뉴에 하위 메뉴 '" + name(child) + "'이(가) 남아 있어 삭제할 수 없습니다. "
                        + "하위 메뉴를 먼저 옮기거나 함께 삭제해 주세요.");
            }
        });

        var targets = new TreeSet<Long>(moved.keySet());
        targets.addAll(tempIds.values());
        targets.forEach(this::requireAcyclic);
        var children = new HashMap<Long, List<Long>>();
        finalParents.forEach((child, parent) -> {
            if (parent != null) children.computeIfAbsent(parent, ignored -> new ArrayList<>()).add(child);
        });
        var queue = new ArrayDeque<Long>(targets);
        var visited = new HashSet<Long>();
        while (!queue.isEmpty()) {
            Long node = queue.removeFirst();
            if (!visited.add(node)) continue;
            int depth = depth(node);
            if (depth > MAX_DEPTH) {
                invalid("메뉴는 " + MAX_DEPTH + "단계까지만 둘 수 있습니다. '" + name(node) + "'이(가) " + depth + "단계가 됩니다.");
            }
            queue.addAll(children.getOrDefault(node, List.of()));
        }
        creations.keySet().stream()
                .sorted(Comparator.comparingInt(key -> depth(tempIds.get(key))))
                .forEach(creationOrder::add);
    }

    private void requireAcyclic(Long start) {
        var visited = new HashSet<Long>();
        Long current = start;
        while (current != null) {
            if (!visited.add(current) || !finalParents.containsKey(current)) invalid(HIERARCHY_MESSAGE);
            current = finalParents.get(current);
        }
    }

    private int depth(Long node) {
        int depth = 0;
        var visited = new HashSet<Long>();
        Long current = node;
        while (current != null && visited.add(current)) {
            depth++;
            current = finalParents.get(current);
        }
        return depth;
    }

    /** 바꾸기 전에 확인할 그룹 버전(코드 순). */
    List<GroupVersion> groupVersions() {
        return grants.values().stream().map(change -> new GroupVersion(change.groupCode(), change.groupVersion())).toList();
    }

    /** 상위가 바뀐 기존 메뉴 → 새 상위(루트면 null, 새 메뉴면 음수 임시 번호). */
    Map<Long, Long> movedParents() {
        var result = new TreeMap<Long, Long>();
        moved.forEach(result::put);
        return result;
    }

    Map<String, Set<Long>> navigationAdded() {
        var result = new TreeMap<String, Set<Long>>();
        grants.forEach((code, change) -> {
            var ids = new TreeSet<Long>();
            change.navigationAdd().forEach(ref -> ids.add(temporaryId(ref)));
            result.put(code, ids);
        });
        return result;
    }

    Map<String, Set<Long>> navigationRemoved() {
        var result = new TreeMap<String, Set<Long>>();
        grants.forEach((code, change) -> result.put(code, new TreeSet<>(change.navigationRemove())));
        return result;
    }

    String describeConflicts(List<NavigationConflict> conflicts) {
        var first = conflicts.getFirst();
        String message = "'" + name(first.menuNo()) + "'을(를) 옮기면 " + first.groupName() + " 그룹에서 상위 메뉴 '"
                + name(first.parentNo()) + "'가 표시되지 않아 숨겨집니다. 그 그룹에 상위 메뉴 표시를 함께 주거나 "
                + "이 메뉴의 표시를 회수해 주세요.";
        return conflicts.size() > 1 ? message + " (같은 문제 " + (conflicts.size() - 1) + "건 더)" : message;
    }

    /** 새 메뉴를 부모 먼저 저장하는 순서. */
    List<MenuCreation> creationsParentFirst() {
        return creationOrder.stream().map(creations::get).toList();
    }

    /** 새 메뉴 또는 기존 메뉴 위치의 실제 상위 번호 — 새 상위는 이미 저장돼 있어야 한다. */
    Long parentOf(String ref, Map<String, Long> createdIds) {
        String parentRef = placements.get(ref).parentRef();
        return parentRef == null ? null : realId(parentRef, createdIds);
    }

    Integer orderOf(String ref) {
        return placements.get(ref).menuOrdr();
    }

    /** 기존 메뉴의 위치 변경(새 메뉴 위치는 저장 때 함께 쓴다). */
    Map<Long, MenuPlacement> existingPlacements() {
        var result = new LinkedHashMap<Long, MenuPlacement>();
        placements.forEach((ref, placement) -> {
            if (!ref.startsWith(NEW_PREFIX)) result.put(Long.valueOf(ref), placement);
        });
        return result;
    }

    Map<Long, MenuProperties> properties() {
        return properties;
    }

    List<Long> deletions() {
        return List.copyOf(deletions);
    }

    boolean hasGrants() {
        return !grants.isEmpty();
    }

    List<ResolvedGrantChange> resolvedGrants(Map<String, Long> createdIds) {
        return grants.values().stream().map(change -> {
            var add = new TreeSet<Long>();
            change.navigationAdd().forEach(ref -> add.add(realId(ref, createdIds)));
            return new ResolvedGrantChange(change.groupCode(), add, new TreeSet<>(change.navigationRemove()),
                    new TreeSet<>(change.operationAdd()));
        }).toList();
    }

    /**
     * 저장 뒤 호환 관리자 배정을 받을 수 있는 새 메뉴(명시 배정이 없는 것) → 최종 그래프의 상위(가까운 것부터, 새 메뉴는
     * 음수 임시 번호). 부모 먼저 순서다. 숨김 검사가 이 배정을 미리 반영하지 않으면, 새 폴더를 만들고 관리자 그룹이 보던
     * 메뉴를 그 아래로 옮기는 저장이 '관리자 그룹에서 숨겨진다' 는 거짓 사유로 거부된다.
     */
    Map<Long, List<Long>> compatibilityCandidates() {
        var result = new LinkedHashMap<Long, List<Long>>();
        for (String key : creationOrder) {
            if (adminAddsExplicitly(key)) continue;
            Long id = tempIds.get(key);
            var ancestors = new ArrayList<Long>();
            var visited = new HashSet<Long>(List.of(id));
            Long current = finalParents.get(id);
            while (current != null && visited.add(current)) {
                ancestors.add(current);
                current = finalParents.get(current);
            }
            result.put(id, List.copyOf(ancestors));
        }
        return result;
    }

    /** {@link #compatibilityCandidates()} 의 실제 번호(부모 먼저). 권한 저장이 관리자 그룹의 표시를 정리하기 전에 반영한다. */
    List<Long> compatibilityCandidateIds(Map<String, Long> createdIds) {
        return creationOrder.stream().filter(key -> !adminAddsExplicitly(key)).map(key -> realId(key, createdIds)).toList();
    }

    /** 요청이 ROLE_ADMIN 에 이 새 메뉴의 표시를 명시로 주면 호환 배정을 다시 하지 않는다. */
    boolean adminAddsExplicitly(String key) {
        var admin = grants.get("ROLE_ADMIN");
        return admin != null && admin.navigationAdd().contains(key);
    }

    Long realId(String ref, Map<String, Long> createdIds) {
        if (!ref.startsWith(NEW_PREFIX)) return Long.valueOf(ref);
        Long id = createdIds.get(ref);
        if (id == null) throw new IllegalStateException("New menu must be saved before it is referenced: " + ref);
        return id;
    }

    private Long temporaryId(String ref) {
        return ref.startsWith(NEW_PREFIX) ? tempIds.get(ref) : Long.valueOf(ref);
    }

    private String name(Long id) {
        return names.getOrDefault(id, String.valueOf(id));
    }

    private void requireRef(String ref) {
        if (ref == null || !ref.matches("[1-9][0-9]{0,18}|new-[1-9][0-9]{0,5}")) invalid("메뉴 참조가 올바르지 않습니다: " + ref);
        if (ref.startsWith(NEW_PREFIX)) {
            if (!creations.containsKey(ref)) invalid("존재하지 않는 새 메뉴 키입니다: " + ref);
            return;
        }
        try {
            Long.parseLong(ref);
        } catch (NumberFormatException tooLarge) {
            invalid("메뉴 번호가 너무 큽니다: " + ref);
        }
    }

    private static void requireExisting(String ref, Map<Long, Long> current) {
        if (!ref.startsWith(NEW_PREFIX) && !current.containsKey(Long.valueOf(ref))) invalid("존재하지 않는 메뉴입니다: " + ref);
    }

    /** 0·null 상위는 루트다(V2_13). */
    static Long normalizeParent(Long parent) {
        return parent != null && parent == 0L ? null : parent;
    }

    /**
     * 메뉴 구조 버전 — 메뉴 전체 행(번호 순)의 번호·상위·순서·이름·사용 여부·연결 라우트·설명 요약값.
     * [2026-10-05] 앱이 읽지 않는 레거시 연결 프로그램을 빼며 형식 표지를 v2 로 올렸다.
     * 값마다 길이를 앞에 붙여 구분자가 값 안에 있어도 서로 다른 상태가 같은 문자열이 되지 않게 한다.
     */
    static String versionOf(List<MenuRepository.StructureRow> rows) {
        var text = new StringBuilder("menu-structure-v2");
        rows.stream().sorted(Comparator.comparing(MenuRepository.StructureRow::getMenuSn)).forEach(row -> text.append('\n')
                .append(token(row.getMenuSn())).append('|').append(token(row.getUpMenuSn())).append('|')
                .append(token(row.getMenuOrdr())).append('|').append(token(row.getMenuNm())).append('|')
                .append(token(row.getUseYn())).append('|').append(token(row.getModernRoute())).append('|')
                .append(token(row.getMenuExpln())));
        return AuthorizationSnapshotService.digest(text.toString());
    }

    private static String token(Object value) {
        if (value == null) return "~";
        String text = value.toString();
        return text.getBytes(StandardCharsets.UTF_8).length + ":" + text;
    }

    static MenuStructure structureOf(List<MenuRepository.StructureRow> rows) {
        var items = rows.stream().map(row -> new MenuStructureItem(row.getMenuSn(), row.getMenuNm(),
                        normalizeParent(row.getUpMenuSn()), row.getMenuOrdr(), row.getModernRoute(), row.getMenuExpln(),
                        row.getUseYn()))
                .sorted(Comparator.comparing(MenuStructureItem::upMenuSn, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(MenuStructureItem::menuOrdr, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(MenuStructureItem::menuNo))
                .toList();
        return new MenuStructure(versionOf(rows), items);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static void invalid(String message) {
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, message);
    }
}
