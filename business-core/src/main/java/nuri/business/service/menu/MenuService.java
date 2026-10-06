package nuri.business.service.menu;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.auth.MenuAuthorityProjection;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.domain.menu.NavigationGrantRepository;
import nuri.business.service.menu.dto.MenuCreateDto;
import nuri.business.service.menu.dto.MenuDto;
import nuri.business.service.menu.dto.MenuStructureDto.MenuPlacement;
import nuri.business.service.menu.dto.MenuStructureDto.MenuProperties;
import nuri.business.service.menu.dto.MenuStructureDto.MenuStructure;
import nuri.business.service.menu.dto.MenuStructureDto.MenuStructureSave;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.jspecify.annotations.NonNull;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 메뉴 관리 서비스
 * - 메뉴 계층 구조 조회, 권한별 메뉴 필터링, 메뉴 관리 기능 제공
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(MenuService.class);

    private final MenuRepository menuRepository;
    private final NavigationGrantRepository navigationGrantRepository;
    private final AuthorizationAdministrationService authorizationAdministrationService;
    /**
     * [2026-09-26 DIP B5 F10] 같은 빈 안에서 {@link #getAllMenusCached} 를 부르면 프록시를 거치지 않아 캐시가 적용되지 않는다.
     * 사이드바 트리는 이 공급자로 프록시를 거쳐 캐시를 읽는다. 없으면(단위 테스트) 저장소를 직접 읽는다.
     */
    private final org.springframework.beans.factory.ObjectProvider<MenuService> selfProvider;

    // [2026-10-05] 기동 때 경로가 없는 메뉴에 레거시 파일명으로 추정한 경로를 채우던 일은 V2_126 이 SQL 로 한 번 한다.
    //   그 컬럼(prgrm_file_nm)은 V2_127 이 지웠다(DEC-OPS-231).

    /**
     * 현재 그룹의 NAVIGATION 권한으로 메뉴 계층을 조회한다. 권한 회수를 숨기는 장기 캐시는 두지 않는다.
     */
    public List<MenuDto> getMenuHierarchy() {
        try {
            log.debug("getMenuHierarchy started");

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            return buildMenuTree(null, currentGroups(auth));
        } catch (Exception e) {
            log.error("getMenuHierarchy failed", e);
            throw e;
        }
    }

    /**
     * 지금 사용자에게 메뉴 배정(NAVIGATION)이 있는 메뉴 번호(2026-09-26 DIP B5 F2 — 즐겨찾기가 같은 판정을 쓴다).
     * 사용 여부(useYn)는 호출자가 메뉴 행으로 본다.
     */
    public Set<Long> allowedMenuIdsForCurrentUser() {
        return navigationGrantRepository.findAllowedMenuIds(currentGroups(SecurityContextHolder.getContext().getAuthentication()));
    }

    private static List<String> currentGroups(Authentication auth) {
        if (auth == null || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return List.of("ROLE_ANONYMOUS");
        }
        if (auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails user
                && user.isEnabled() && user.isAccountNonLocked()) {
            return user.getGroups();
        }
        // 임의 GrantedAuthority나 단일 role 문자열을 그룹 배정으로 추정하지 않는다.
        return List.of();
    }

    private List<MenuDto> buildMenuTree(Long rootMenuNo, List<String> groups) {
        Set<Long> allowedMenuIds = navigationGrantRepository.findAllowedMenuIds(groups);
        List<Menu> filteredMenus = menusInTreeOrder().stream()
                .filter(m -> allowedMenuIds.contains(m.getMenuSn()) && "Y".equals(m.getUseYn()))
                .collect(Collectors.toList());

        Map<Long, MenuDto> dtoMap = new LinkedHashMap<>();
        List<MenuDto> rootNodes = new ArrayList<>();

        // Pass 1: 모든 노드의 DTO를 먼저 만들어 dtoMap을 완성한다.
        // 메뉴 조회는 ORDER BY upMenuSn ASC (Postgres 기본 NULLS LAST)라 루트(upMenuSn=null)가 맨 뒤에 온다.
        // 단일 패스로 조립하면 자식이 부모보다 먼저 처리돼 dtoMap.containsKey(부모)=false로 자식이 유실된다(→ getSubMenus=0, 사이드바 파손).
        // 2-pass로 조립 순서에 비의존하게 만든다.
        for (Menu menu : filteredMenus) {
            String url = calculateUrl(menu);

            MenuDto dto = MenuDto.builder()
                    .id(menu.getMenuSn())
                    .menuNo(menu.getMenuSn())
                    .menuNm(menu.getMenuNm())
                    .upMenuSn(menu.getUpMenuSn())
                    .upperMenuId(menu.getUpMenuSn())
                    .menuOrdr(menu.getMenuOrdr())
                    .chkURL(url)
                    .modernRoute(menu.getModernRoute())
                    .relImgPath(menu.getRelImgPath())
                    .relImgNm(menu.getRelImgNm())
                    .useYn(menu.getUseYn())
                    .build();

            dtoMap.put(dto.getId(), dto);
        }

        // Pass 2: 부모-자식 부착 / 루트 수집 (dtoMap이 완성된 뒤이므로 순서 무관)
        // dtoMap은 LinkedHashMap(=filteredMenus 삽입순 = upMenuSn,menuOrdr ASC)이라 형제 정렬은 그대로 보존된다.
        for (MenuDto dto : dtoMap.values()) {
            Long upperNo = dto.getUpMenuSn();

            if (rootMenuNo == null) {
                if (upperNo == null || upperNo == 0) {
                    rootNodes.add(dto);
                } else if (dtoMap.containsKey(upperNo)) {
                    dtoMap.get(upperNo).addChild(dto);
                }
            } else {
                if (upperNo != null && upperNo.equals(rootMenuNo)) {
                    rootNodes.add(dto);
                } else if (dtoMap.containsKey(upperNo)) {
                    dtoMap.get(upperNo).addChild(dto);
                }
            }
        }
        return rootNodes;
    }

    /**
     * 메뉴 전체(상위·순서 정렬). 요청마다 모든 메뉴를 다시 읽던 사이드바 트리가 메뉴 쓰기 때 비우는 {@code allMenus} 캐시를 쓴다.
     * 권한 필터는 캐시하지 않는다 — 그룹 배정이 바뀌면 다음 요청부터 바로 반영돼야 한다.
     */
    private List<Menu> menusInTreeOrder() {
        MenuService proxy = selfProvider == null ? null : selfProvider.getIfAvailable();
        return proxy != null && proxy != this ? proxy.getAllMenusCached() : menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc();
    }

    @Cacheable(value = "allMenus", unless = "#result == null")
    public List<Menu> getAllMenusCached() {
        return menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc();
    }

    @Cacheable(value = "menuParentMap")
    public Map<Long, Long> getMenuParentMapCached() {
        List<Menu> allMenus = menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc();
        Map<Long, Long> parentMap = new HashMap<>();
        for (Menu m : allMenus) {
            parentMap.put(m.getMenuSn(), m.getUpMenuSn());
        }
        return Collections.unmodifiableMap(parentMap);
    }


    @Cacheable(value = "allMenuDtos")
    public List<MenuDto> getAllMenus() {
        return menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc().stream()
                .map(this::toManageDto)
                .collect(Collectors.toList());
    }

    public List<MenuCreateDto> selectMenuCreatManagList(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable(Sort.by("id.authrtCd").ascending());
        String searchKeyword = searchVO.getSearchKeyword() != null ? searchVO.getSearchKeyword() : "";

        return navigationGrantRepository
                .selectMenuCreatManagList(searchKeyword, Objects.requireNonNull(pageable)).stream()
                .map(proj -> MenuCreateDto.builder()
                        .authrtCd(proj.getAuthrtCd())
                        .authrtNm(proj.getAuthrtNm())
                        .authrtExpln(proj.getAuthrtExpln())
                        .authrtCrtYmd(proj.getAuthrtCrtYmd() != null ? proj.getAuthrtCrtYmd().toString() : "")
                        .chkYeoBu(proj.getChkYeoBu().intValue())
                        .build())
                .collect(Collectors.toList());
    }

    public int selectMenuCreatManagTotCnt(@NonNull BaseSearchDto searchVO) {
        String searchKeyword = searchVO.getSearchKeyword() != null ? searchVO.getSearchKeyword() : "";
        return (int) navigationGrantRepository.selectMenuCreatManagList(searchKeyword, PageRequest.of(0, 1))
                .getTotalElements();
    }

    public List<MenuCreateDto> selectMenuCreatList(@NonNull MenuCreateDto vo) {
        log.debug(">>> [MenuService] selectMenuCreatList requested");
        List<MenuAuthorityProjection> projections = navigationGrantRepository.selectMenuCreatList(vo.getAuthrtCd());
        log.info(">>> [MenuService] selectMenuCreatList found {} projections", projections.size());
        
        return projections.stream()
                .map(proj -> {
                    if (proj.getMenuSn() == null) {
                        log.error(">>> [MenuService] Found projection with NULL menuSn");
                    }
                    return MenuCreateDto.builder()
                        .menuSn(proj.getMenuSn())
                        .authrtCd(proj.getAuthrtCd())
                        .authrtNm(proj.getMenuNm())
                        .chkYeoBu("Y".equals(proj.getRegYn()) ? 1 : 0)
                        .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void insertMenuCreatList(String authorCode, String checkedMenuNos) {
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                "권한 전체 목록과 버전을 다시 조회한 뒤 통합 권한 화면에서 저장해 주세요.");
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void insertMenuCreatList(String authorCode, String checkedMenuNos, String expectedVersion) {
        SecurityUtil.assertPermission("AUTHRT_GRANT");
        if (expectedVersion == null || expectedVersion.isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "권한 전체 목록의 버전이 필요합니다.");
        }
        authorizationAdministrationService.replaceNavigationGrants(
                Objects.requireNonNull(authorCode), parseMenuIds(checkedMenuNos), expectedVersion);
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void insertMenuManage(@NonNull MenuDto vo) {
        SecurityUtil.assertPermission("MENU_CREATE");
        Map<Long, Long> parents = lockParentGraph();
        Long parentId = normalizeUpMenuSn(vo.getUpMenuSn());
        assertAcyclicParentPath(parentId, parents);

        Menu menu = Menu.builder()
                .menuNm(vo.getMenuNm())
                .upMenuSn(parentId)
                .menuOrdr(vo.getMenuOrdr())
                .menuExpln(vo.getMenuExpln())
                .relImgPath(vo.getRelImgPath())
                .relImgNm(vo.getRelImgNm())
                .modernRoute(vo.getModernRoute())
                .useYn(vo.getUseYn() != null ? vo.getUseYn() : "Y")
                .build();
        // 감사 필드: crtDt/mdfcnDt 는 auditing 이 채움, 작성자는 "webmaster" 명시 유지(하위 호환)
        menu.setFrstRgtrId("webmaster");
        menu.setLastMdfrId("webmaster");
        Menu saved = menuRepository.save(Objects.requireNonNull(menu));
        authorizationAdministrationService.grantNewMenuToCompatibilityAdmin(saved.getMenuSn());
    }


    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void updateMenuManage(@NonNull MenuDto vo) {
        SecurityUtil.assertPermission("MENU_UPDATE");
        Map<Long, Long> parents = lockParentGraph();
        Long menuNo = Objects.requireNonNull(vo.getMenuNo());
        Menu menu = menuRepository.findById(menuNo)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        // Menu.update 는 null-safe 병합이다 — 전달되지 않은(null) 값은 기존 값을 유지하고, 빈 문자열이면 비운다.
        Long parentId = normalizeUpMenuSn(vo.getUpMenuSn());
        validateParentChanges(parents, Collections.singletonMap(menuNo, parentId));
        menu.updateWithModernRoute(vo.getMenuNm(),
                parentId,
                vo.getMenuOrdr(),
                vo.getMenuExpln(),
                vo.getRelImgPath(), vo.getRelImgNm(), vo.getModernRoute(), vo.getUseYn() != null ? vo.getUseYn() : "Y");
    }

    /**
     * 메뉴 순서/계층 일괄 저장.
     * <p>
     * 트리 드래그 후 'Save Layout' 은 전 노드를 순회하므로, 전체 갱신(updateMenuManage)을 쓰면
     * 페이로드에 없는 컬럼(menu_expln/rel_img_path/rel_img_nm)이 전 노드에서 한 번에 소실됐다.
     * 정렬 저장은 상위메뉴/순서만 건드리도록 전용 경로로 분리한다.
     */
    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void updateMenuOrders(@NonNull List<MenuDto> menuList) {
        SecurityUtil.assertPermission("MENU_UPDATE");
        Map<Long, MenuOrderChange> changes = new LinkedHashMap<>();
        for (MenuDto vo : menuList) {
            Long menuNo = vo.getMenuNo() != null ? vo.getMenuNo() : vo.getId();
            if (menuNo == null) {
                throw new BusinessException("메뉴 번호가 없는 항목은 순서를 저장할 수 없습니다.",
                        CommonErrorCode.INVALID_INPUT_VALUE);
            }
            MenuOrderChange change = new MenuOrderChange(normalizeUpMenuSn(vo.getUpMenuSn()), vo.getMenuOrdr());
            MenuOrderChange previous = changes.putIfAbsent(menuNo, change);
            if (previous != null && !previous.equals(change)) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "같은 메뉴의 상위 메뉴 또는 순서가 서로 다르게 지정됐습니다.");
            }
        }
        if (changes.isEmpty()) {
            return;
        }

        Map<Long, Long> parents = lockParentGraph();
        Map<Long, Long> desiredParents = new LinkedHashMap<>();
        changes.forEach((id, change) -> desiredParents.put(id, change.parentId()));
        validateParentChanges(parents, desiredParents);

        Map<Long, Menu> menus = new LinkedHashMap<>();
        for (Long menuNo : changes.keySet()) {
            menus.put(menuNo, menuRepository.findById(menuNo)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND)));
        }
        changes.forEach((id, change) -> menus.get(id).updateOrder(change.parentId(), change.order()));
    }

    private record MenuOrderChange(Long parentId, Integer order) {}

    /**
     * [2026-10-02 D1] 메뉴 구조 편집기가 읽는 전체 메뉴와 그 버전. 캐시를 거치지 않고 DB 에서 읽는다 — 메뉴 목록 캐시
     * ({@code allMenuDtos})는 인스턴스마다 따로 10분이라 그 값으로 버전을 만들면 다른 인스턴스에서 저장할 때 409 가 반복된다.
     */
    public MenuStructure getMenuStructure() {
        return MenuStructurePlan.structureOf(menuRepository.findStructureRows());
    }

    /**
     * [2026-10-02 D2] 메뉴 위치·속성·추가·삭제와 그 메뉴의 그룹별 메뉴 표시를 한 초안으로 받아 한 번에 저장한다.
     * <p>순서: 권한 확인 → 형태 검사(400) → 메뉴 전체 잠금(메뉴 → ADMIN 순서) 후 버전 비교(409) → 함께 바꿀 그룹의 버전
     * 확인(409) → 최종 그래프의 존재·순환·3단계·삭제 뒤 남는 하위 검사(400) → 옮긴 메뉴가 숨겨지는 그룹 검사(400) → 새 메뉴
     * (부모 먼저)·위치·속성 반영 → 삭제(메뉴 표시 회수 뒤) → 그룹별 권한 → 새 메뉴의 호환 관리자 배정. 하나라도 실패하면 전부 되돌린다.
     * <p>메뉴 표시와 기능권한은 서로 다른 권한이다(H3). 상위 메뉴 표시를 묵시로 주지 않으며, 옮긴 메뉴의 표시를 가진 그룹이
     * 새 상위의 표시를 갖지 않으면 사이드바가 그 메뉴를 조용히 버리므로 저장 전에 그룹 이름을 밝혀 거부한다.
     */
    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public MenuStructure saveMenuStructure(@NonNull MenuStructureSave request) {
        SecurityUtil.assertPermission("MENU_UPDATE");
        if (MenuStructurePlan.hasItems(request.creations())) SecurityUtil.assertPermission("MENU_CREATE");
        if (MenuStructurePlan.hasItems(request.deletions())) SecurityUtil.assertPermission("MENU_DELETE");
        if (MenuStructurePlan.hasItems(request.grants())) SecurityUtil.assertPermission("AUTHRT_GRANT");
        MenuStructurePlan plan = MenuStructurePlan.of(request);

        // 잠금 문장은 시작 시점의 스냅샷으로 결과를 만든다 — 잠금을 기다리는 사이 다른 트랜잭션이 커밋한 새 메뉴는
        // 그 결과에 없다. 그 행을 빼고 버전·삭제 뒤 남는 하위를 판정하면 409 가 나지 않고, 상위를 지울 때
        // Menu.children(cascade=ALL) 이 그 새 메뉴까지 조용히 지운다. 그래서 잠금을 쥔 뒤 새 문장으로 다시 읽는다.
        // 다른 메뉴 생성 경로(단건 등록·구조 저장)도 먼저 전체 행을 잠그므로 이 읽기에서 빠지는 행이 없다.
        menuRepository.findStructureRowsForUpdate();
        List<MenuRepository.StructureRow> rows = menuRepository.findStructureRows();
        if (!MenuStructurePlan.versionOf(rows).equals(request.version())) {
            throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                    "메뉴 구조가 다른 곳에서 바뀌었습니다. 다시 불러온 뒤 저장해 주세요.");
        }
        if (plan.hasGrants()) {
            authorizationAdministrationService.assertGroupVersions(plan.groupVersions());
        }
        plan.resolveAgainst(rows);
        Map<Long, Long> movedParents = plan.movedParents();
        if (!movedParents.isEmpty()) {
            var conflicts = authorizationAdministrationService.navigationVisibilityConflicts(movedParents,
                    plan.navigationAdded(), plan.navigationRemoved(), plan.compatibilityCandidates());
            if (!conflicts.isEmpty()) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, plan.describeConflicts(conflicts));
            }
        }

        Map<String, Long> createdIds = new LinkedHashMap<>();
        for (var creation : plan.creationsParentFirst()) {
            Menu menu = Menu.builder()
                    .menuNm(creation.menuNm())
                    .upMenuSn(plan.parentOf(creation.key(), createdIds))
                    .menuOrdr(plan.orderOf(creation.key()))
                    .menuExpln(creation.menuExpln())
                    .modernRoute(creation.modernRoute() == null || creation.modernRoute().isBlank() ? null : creation.modernRoute())
                    .useYn(creation.useYn())
                    .build();
            // 감사 필드는 단건 등록(insertMenuManage)과 같게 둔다.
            menu.setFrstRgtrId("webmaster");
            menu.setLastMdfrId("webmaster");
            createdIds.put(creation.key(), menuRepository.save(menu).getMenuSn());
        }
        Map<Long, MenuPlacement> placements = plan.existingPlacements();
        Map<Long, MenuProperties> properties = plan.properties();
        var touched = new java.util.TreeSet<Long>(placements.keySet());
        touched.addAll(properties.keySet());
        Map<Long, Menu> menus = new HashMap<>();
        if (!touched.isEmpty()) {
            menuRepository.findAllById(touched).forEach(menu -> menus.put(menu.getMenuSn(), menu));
        }
        placements.forEach((id, placement) -> requireMenu(menus, id)
                .updateOrder(plan.parentOf(id.toString(), createdIds), placement.menuOrdr()));
        properties.forEach((id, item) -> requireMenu(menus, id)
                .replaceProperties(item.menuNm(), item.modernRoute(), item.menuExpln(), item.useYn()));
        menuRepository.flush();

        if (!plan.deletions().isEmpty()) {
            // 지우기 직전에 새 문장으로 하위를 다시 센다. 삭제는 Menu.children 을 따라 하위까지 지우므로, 판정에서 빠진
            // 하위가 있으면 조용히 사라진다. 삭제 집합 밖의 하위가 하나라도 남아 있으면 저장 전체를 거부한다.
            for (Long id : plan.deletions()) {
                if (menuRepository.countByUpMenuSnAndMenuSnNotIn(id, plan.deletions()) > 0) {
                    throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION,
                            "메뉴 구조가 다른 곳에서 바뀌었습니다. 다시 불러온 뒤 저장해 주세요.");
                }
            }
            authorizationAdministrationService.removeNavigationGrantsForMenus(plan.deletions());
            menuRepository.deleteAllById(plan.deletions());
            menuRepository.flush();
        }
        if (plan.hasGrants()) {
            authorizationAdministrationService.applyMenuStructureGrants(plan.resolvedGrants(createdIds),
                    plan.compatibilityCandidateIds(createdIds));
        }
        for (var creation : plan.creationsParentFirst()) {
            if (!plan.adminAddsExplicitly(creation.key())) {
                authorizationAdministrationService.grantNewMenuToCompatibilityAdmin(createdIds.get(creation.key()));
            }
        }
        menuRepository.flush();
        return MenuStructurePlan.structureOf(menuRepository.findStructureRows());
    }

    private static Menu requireMenu(Map<Long, Menu> menus, Long id) {
        Menu menu = menus.get(id);
        if (menu == null) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        return menu;
    }

    /** 권한 관리와 동일한 메뉴→ADMIN 잠금 순서. 영속성 컨텍스트 대신 잠근 DB 부모 값을 사용한다. */
    private Map<Long, Long> lockParentGraph() {
        Map<Long, Long> parents = new HashMap<>();
        menuRepository.findParentLinksForUpdate().forEach(link ->
                parents.put(link.getMenuSn(), normalizeUpMenuSn(link.getUpMenuSn())));
        return parents;
    }

    private void validateParentChanges(Map<Long, Long> parents, Map<Long, Long> desiredParents) {
        Map<Long, Long> finalParents = new HashMap<>(parents);
        List<Long> changedIds = new ArrayList<>();
        desiredParents.forEach((id, parent) -> {
            if (!parents.containsKey(id)) {
                throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
            }
            if (!Objects.equals(parents.get(id), parent)) {
                changedIds.add(id);
            }
            finalParents.put(id, parent);
        });
        // 최종 그래프에서 실제로 옮긴 노드만 검사한다. 무관한 기존 순환은 정정 작업을 막지 않는다.
        changedIds.forEach(id -> assertAcyclicParentPath(id, finalParents));
    }

    private void assertAcyclicParentPath(Long startId, Map<Long, Long> parents) {
        Set<Long> visited = new java.util.HashSet<>();
        Long current = startId;
        while (current != null) {
            if (!visited.add(current) || !parents.containsKey(current)) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "상위 메뉴 계층이 올바르지 않습니다. 메뉴를 다시 확인해 주세요.");
            }
            current = parents.get(current);
        }
    }

    /**
     * [V2_13 결속] 상위메뉴 센티널 0 → null 정규화.
     * FE(MenuAdminClient)가 루트 메뉴를 upperMenuId=0 으로 전송하는데, menu_sn=0 행은 존재하지 않아
     * fk_tb_menu_info_tb_menu_info_up(자기참조 FK) 하에서 그대로 기록하면 루트 생성/수정이 FK 위반으로 파손된다.
     */
    private static Long normalizeUpMenuSn(Long upMenuSn) {
        return (upMenuSn != null && upMenuSn == 0L) ? null : upMenuSn;
    }


    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void deleteMenuManage(@NonNull MenuDto vo) {
        SecurityUtil.assertPermission("MENU_DELETE");
        Long menuNo = Objects.requireNonNull(vo.getMenuNo());
        lockExistingMenus(List.of(menuNo));
        // [V2_13 결속] 자식 메뉴 존재 시 명시적 도메인 예외 — 무음 고아화(구버그)도, FK 409(불친절)도 아닌 사전 안내
        if (menuRepository.countByUpMenuSn(menuNo) > 0) {
            throw new BusinessException("하위 메뉴가 있는 메뉴는 삭제할 수 없습니다. 하위 메뉴를 먼저 삭제하세요.",
                    CommonErrorCode.INVALID_INPUT_VALUE);
        }
        authorizationAdministrationService.removeNavigationGrantsForMenus(List.of(menuNo));
        menuRepository.deleteById(menuNo);
    }

    private void lockExistingMenus(List<Long> ids) {
        if (menuRepository.findForUpdateByMenuSnIn(ids).size() != ids.size()) {
            throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND, "삭제할 메뉴를 다시 조회해 주세요.");
        }
    }

    private static List<Long> parseMenuIds(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        try {
            List<Long> ids = java.util.Arrays.stream(csv.split(","))
                    .map(String::trim).filter(value -> !value.isEmpty())
                    .map(Long::valueOf).distinct().sorted().toList();
            if (ids.stream().anyMatch(id -> id < 1)) {
                throw new NumberFormatException("Menu identifiers must be positive");
            }
            return ids;
        } catch (NumberFormatException invalidId) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "올바른 메뉴 번호를 입력해 주세요.");
        }
    }

    public List<MenuDto> getSubMenus(Long menuNo) {
        List<MenuDto> fullHierarchy = getMenuHierarchy();
        if (menuNo == null || menuNo <= 0) return fullHierarchy;
        return findSubTree(fullHierarchy, menuNo);
    }

    private List<MenuDto> findSubTree(List<MenuDto> nodes, Long targetMenuNo) {
        if (nodes == null) return java.util.Collections.emptyList();
        for (MenuDto node : nodes) {
            if (node.getId().equals(targetMenuNo)) {
                return node.getChildren();
            }
            if (node.getChildren() != null && !node.getChildren().isEmpty()) {
                List<MenuDto> found = findSubTree(node.getChildren(), targetMenuNo);
                if (!found.isEmpty()) {
                    return found;
                }
            }
        }
        return java.util.Collections.emptyList();
    }

    public List<MenuDto> selectMenuManageList(@NonNull BaseSearchDto searchVO) {
        return menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc().stream()
                .map(this::toManageDto)
                .collect(Collectors.toList());
    }


    public int selectMenuManageListTotCnt(@NonNull BaseSearchDto searchVO) {
        return (int) menuRepository.count();
    }

    public MenuDto selectMenuManage(Long menuNo) {
        Menu menu = menuRepository.findById(Objects.requireNonNull(menuNo))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        return toManageDto(menu);
    }

    private MenuDto toManageDto(Menu menu) {
        String url = calculateUrl(menu);

        return MenuDto.builder()
                .id(menu.getMenuSn())
                .menuNo(menu.getMenuSn())
                .menuNm(menu.getMenuNm())
                .upMenuSn(menu.getUpMenuSn())
                .upperMenuId(menu.getUpMenuSn())
                .menuOrdr(menu.getMenuOrdr())
                .chkURL(url)
                .modernRoute(menu.getModernRoute())
                .relImgPath(menu.getRelImgPath())
                .relImgNm(menu.getRelImgNm())
                .useYn(menu.getUseYn())
                .build();
    }


    /**
     * 메뉴 응답의 chkURL. 경로(modern_route)가 있으면 그 경로이고, 없으면 이동할 곳이 없다는 뜻의 {@code "#"} 이다.
     * <p>[2026-10-05] 종전에는 경로가 없으면 레거시 파일명(prgrm_file_nm)으로 추정했고, 추정할 수 없으면 {@code "/"} 를
     * 돌려줬다. 추정으로 얻던 경로는 V2_126 이 modern_route 에 미리 채웠고, 앱은 그 컬럼을 더 이상 읽지 않는다.
     * 화면은 경로가 없으면 chkURL 로 이동하지 않는다({@code resolveMenuInternalRoute}).
     */
    private String calculateUrl(Menu menu) {
        String modernRoute = menu.getModernRoute();
        return modernRoute != null && !modernRoute.isEmpty() ? modernRoute : "#";
    }
}
