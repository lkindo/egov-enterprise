package nuri.business.service.menu;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.common.BaseSearchDto;
import nuri.business.domain.auth.MenuAuthorityProjection;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.domain.menu.NavigationGrantRepository;
import nuri.business.domain.program.Program;
import nuri.business.domain.program.ProgramRepository;
import nuri.business.service.menu.dto.MenuCreateDto;
import nuri.business.service.menu.dto.MenuDto;
import nuri.business.service.program.dto.ProgramDto;
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
import org.springframework.lang.NonNull;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.annotation.PostConstruct;

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
    private final ProgramRepository programRepository;
    private final NavigationGrantRepository navigationGrantRepository;
    private final AuthorizationAdministrationService authorizationAdministrationService;
    private final nuri.business.service.program.dto.ProgramMapper programMapper;

    @PostConstruct
    @Transactional
    public void migrateModernRoutes() {
        List<Menu> menus = menuRepository.findAllWithoutModernRoute();
        if (menus.isEmpty()) return;
        log.info(">>> [MenuService] Migrating {} legacy menus to modern_route...", menus.size());

        List<Program> programs = programRepository.findAll();
        Map<String, String> legacyUrlMap = programs.stream()
            .collect(Collectors.toMap(prog -> prog.getPrgrmFileNm(), prog -> prog.getUrl(), (a, b) -> a));

        for (Menu m : menus) {
            String route = inferModernRoute(m.getPrgrmFileNm());
            if (route == null) {
                route = inferFromLegacyUrl(legacyUrlMap.get(m.getPrgrmFileNm()));
            }
            if (route != null) {
                m.updateModernRoute(route);
                menuRepository.save(m);
            }
        }
        log.info(">>> [MenuService] modern_route migration completed.");
    }

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
        List<Menu> filteredMenus = menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc().stream()
                .filter(m -> allowedMenuIds.contains(m.getMenuSn()) && "Y".equals(m.getUseYn()))
                .collect(Collectors.toList());

        List<Program> programs = programRepository.findAll();
        Map<String, Program> programMap = programs.stream()
                .filter(p -> p.getPrgrmFileNm() != null)
                .collect(Collectors.toMap(p -> p.getPrgrmFileNm(), Function.identity(), (a, b) -> a));

        Map<Long, MenuDto> dtoMap = new LinkedHashMap<>();
        List<MenuDto> rootNodes = new ArrayList<>();

        // Pass 1: 모든 노드의 DTO를 먼저 만들어 dtoMap을 완성한다.
        // 메뉴 조회는 ORDER BY upMenuSn ASC (Postgres 기본 NULLS LAST)라 루트(upMenuSn=null)가 맨 뒤에 온다.
        // 단일 패스로 조립하면 자식이 부모보다 먼저 처리돼 dtoMap.containsKey(부모)=false로 자식이 유실된다(→ getSubMenus=0, 사이드바 파손).
        // 2-pass로 조립 순서에 비의존하게 만든다.
        for (Menu menu : filteredMenus) {
            String url = calculateUrl(menu, programMap);

            MenuDto dto = MenuDto.builder()
                    .id(menu.getMenuSn())
                    .menuNo(menu.getMenuSn())
                    .menuNm(menu.getMenuNm())
                    .prgrmFileNm(menu.getPrgrmFileNm())
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
        List<nuri.business.service.menu.dto.MenuWithProgramDto> menuWithProgramResults = menuRepository.findAllWithPrograms();
        List<MenuDto> result = new ArrayList<>();

        for (nuri.business.service.menu.dto.MenuWithProgramDto menuResult : menuWithProgramResults) {
            Menu menu = menuResult.menu();
            Program program = menuResult.program();

            String url = calculateUrl(menu,
                    program != null ? java.util.Collections.singletonMap(program.getPrgrmFileNm(), program) : null);

            MenuDto dto = MenuDto.builder()
                    .id(menu.getMenuSn())
                    .menuNo(menu.getMenuSn())
                    .menuNm(menu.getMenuNm())
                    .prgrmFileNm(menu.getPrgrmFileNm())
                    .upMenuSn(menu.getUpMenuSn())
                    .upperMenuId(menu.getUpMenuSn())
                    .menuOrdr(menu.getMenuOrdr())
                    .chkURL(url)
                    .modernRoute(menu.getModernRoute())
                    .relImgPath(menu.getRelImgPath())
                    .relImgNm(menu.getRelImgNm())
                    .useYn(menu.getUseYn())
                    .build();

            result.add(dto);
        }
        return result;
    }


    public List<ProgramDto> getAllPrograms() {
        return programRepository.findAll().stream()
                .map(programMapper::toDto)
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
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos", "rootMenuIdByUrl" }, allEntries = true)
    public void insertMenuCreatList(String authorCode, String checkedMenuNos) {
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                "권한 전체 목록과 버전을 다시 조회한 뒤 통합 권한 화면에서 저장해 주세요.");
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos", "rootMenuIdByUrl" }, allEntries = true)
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
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos", "rootMenuIdByUrl" }, allEntries = true)
    public void insertMenuManage(@NonNull MenuDto vo) {
        SecurityUtil.assertPermission("MENU_CREATE");
        // FE 가 "연결 프로그램 없음"을 빈 문자열로 보내므로 null 로 정규화한다.
        String prgrmFileNm = normalizePrgrmFileNm(vo.getPrgrmFileNm());

        assertProgramExists(prgrmFileNm);

        Menu menu = Menu.builder()
                .menuNm(vo.getMenuNm())
                .prgrmFileNm(prgrmFileNm)
                .upMenuSn(normalizeUpMenuSn(vo.getUpMenuSn()))
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
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos", "rootMenuIdByUrl" }, allEntries = true)
    public void updateMenuManage(@NonNull MenuDto vo) {
        SecurityUtil.assertPermission("MENU_UPDATE");
        Menu menu = menuRepository.findById(Objects.requireNonNull(vo.getMenuNo()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        // Menu.update 는 null-safe 병합이다 — 전달되지 않은(null) 값은 기존 값을 유지하고, 빈 문자열이면 비운다.
        String prgrmFileNm = normalizePrgrmFileNm(vo.getPrgrmFileNm());
        assertProgramExists(prgrmFileNm);
        menu.updateWithModernRoute(vo.getMenuNm(), prgrmFileNm,
                normalizeUpMenuSn(vo.getUpMenuSn()),
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
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos", "rootMenuIdByUrl" }, allEntries = true)
    public void updateMenuOrders(@NonNull List<MenuDto> menuList) {
        SecurityUtil.assertPermission("MENU_UPDATE");
        for (MenuDto vo : menuList) {
            Long menuNo = vo.getMenuNo() != null ? vo.getMenuNo() : vo.getId();
            if (menuNo == null) {
                throw new BusinessException("메뉴 번호가 없는 항목은 순서를 저장할 수 없습니다.",
                        CommonErrorCode.INVALID_INPUT_VALUE);
            }
            Menu menu = menuRepository.findById(menuNo)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
            menu.updateOrder(normalizeUpMenuSn(vo.getUpMenuSn()), vo.getMenuOrdr());
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

    private void assertProgramExists(String prgrmFileNm) {
        if (prgrmFileNm != null && !programRepository.existsById(prgrmFileNm)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "등록된 프로그램을 선택하거나 연결 프로그램을 비워 주세요.");
        }
    }

    /**
     * 프로그램 미연결(빈 문자열) → null 정규화. FE 셀렉트의 "연결 없음" 선택이 빈 문자열로 오기 때문이다.
     */
    private static String normalizePrgrmFileNm(String prgrmFileNm) {
        return (prgrmFileNm == null || prgrmFileNm.isBlank()) ? null : prgrmFileNm;
    }


    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos", "rootMenuIdByUrl" }, allEntries = true)
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

    @Transactional
    @CacheEvict(value = { "allMenus", "menuParentMap", "allMenuDtos", "rootMenuIdByUrl" }, allEntries = true)
    public void deleteMenuManageList(String checkedMenuNoForDel) {
        SecurityUtil.assertPermission("MENU_DELETE");
        List<Long> ids = parseMenuIds(checkedMenuNoForDel);
        if (!ids.isEmpty()) {
            lockExistingMenus(ids);
            // [V2_13 결속] 삭제 집합 밖의 자식을 가진 메뉴가 있으면 차단 (서브트리 일괄 삭제는 허용 —
            // fk_tb_menu_info_tb_menu_info_up 은 DEFERRABLE INITIALLY DEFERRED 라 커밋 시점에 일괄 검증됨)
            for (Long id : ids) {
                if (menuRepository.countByUpMenuSnAndMenuSnNotIn(id, ids) > 0) {
                    throw new BusinessException("하위 메뉴가 있는 메뉴(" + id + ")는 삭제할 수 없습니다. 하위 메뉴를 함께 선택하거나 먼저 삭제하세요.",
                            CommonErrorCode.INVALID_INPUT_VALUE);
                }
            }
            authorizationAdministrationService.removeNavigationGrantsForMenus(ids);
            menuRepository.deleteAllById(Objects.requireNonNull(ids));
        }
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

    @Cacheable(value = "rootMenuIdByUrl", key = "#url", unless = "#result == null")
    public Long getRootMenuIdByUrl(String url) {
        String progrmFileNm = getProgrmFileNmByUrl(url);
        if (progrmFileNm == null)
            return null;
        return getRootMenuIdByProgrmFileNm(progrmFileNm);
    }

    public String getProgrmFileNmByUrl(String url) {
        if (url == null || url.isEmpty())
            return null;
        return programRepository.findByUrl(Objects.requireNonNull(url))
                .map(p -> p.getPrgrmFileNm())
                .orElse(null);
    }


    public Long getRootMenuIdByProgrmFileNm(String progrmFileNm) {
        if (progrmFileNm == null)
            return null;
        Menu currentMenu = menuRepository.findByPrgrmFileNm(Objects.requireNonNull(progrmFileNm)).orElse(null);
        if (currentMenu == null)
            return null;

        List<Menu> allMenus = menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc();
        Map<Long, Long> parentMap = new HashMap<>();
        for (Menu m : allMenus) {
            parentMap.put(m.getMenuSn(), m.getUpMenuSn());
        }

        Long currentId = currentMenu.getMenuSn();
        Long upperId = currentMenu.getUpMenuSn();

        while (upperId != null && upperId != 0) {
            if (!parentMap.containsKey(upperId))
                break;
            Long nextUpperId = parentMap.get(upperId);
            currentId = upperId;
            upperId = nextUpperId;
        }
        return currentId;
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
        List<nuri.business.service.menu.dto.MenuWithProgramDto> menuWithProgramResults = menuRepository.findAllWithPrograms();

        return menuWithProgramResults.stream().map(menuResult -> {
            Menu menu = menuResult.menu();
            Program program = menuResult.program();

            String url = calculateUrl(menu,
                    program != null ? java.util.Collections.singletonMap(program.getPrgrmFileNm(), program) : null);

            return MenuDto.builder()
                    .id(menu.getMenuSn())
                    .menuNo(menu.getMenuSn())
                    .menuNm(menu.getMenuNm())
                    .prgrmFileNm(menu.getPrgrmFileNm())
                    .upMenuSn(menu.getUpMenuSn())
                    .upperMenuId(menu.getUpMenuSn())
                    .menuOrdr(menu.getMenuOrdr())
                    .chkURL(url)
                    .modernRoute(menu.getModernRoute())
                    .relImgPath(menu.getRelImgPath())
                    .relImgNm(menu.getRelImgNm())
                    .useYn(menu.getUseYn())
                    .build();
        }).collect(Collectors.toList());
    }


    public int selectMenuManageListTotCnt(@NonNull BaseSearchDto searchVO) {
        return (int) menuRepository.count();
    }

    public MenuDto selectMenuManage(Long menuNo) {
        Menu menu = menuRepository.findById(Objects.requireNonNull(menuNo))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));

        String url = calculateUrl(menu, null);

        return MenuDto.builder()
                .id(menu.getMenuSn())
                .menuNo(menu.getMenuSn())
                .menuNm(menu.getMenuNm())
                .prgrmFileNm(menu.getPrgrmFileNm())
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


    private String calculateUrl(Menu menu, Map<String, Program> programMap) {
        if (menu.getModernRoute() != null && !menu.getModernRoute().isEmpty()) {
            return menu.getModernRoute();
        }

        String progrmFileNm = menu.getPrgrmFileNm();
        if (progrmFileNm == null || "dir".equals(progrmFileNm) || "/".equals(progrmFileNm)) {
            return "#";
        }

        String inferred = inferModernRoute(progrmFileNm);
        if (inferred != null) {
            return inferred;
        }

        Program program = null;
        if (programMap != null) {
            program = programMap.get(progrmFileNm);
        } else {
            program = programRepository.findById(progrmFileNm).orElse(null);
        }

        String finalUrl = "/";
        if (program != null && program.getUrl() != null) {
            String legacyUrl = program.getUrl();
            if (legacyUrl.contains(".do")) {
                String inferredFromLegacy = inferFromLegacyUrl(legacyUrl);
                finalUrl = inferredFromLegacy != null ? inferredFromLegacy : "#";
            } else {
                finalUrl = "/".equals(legacyUrl) ? "#" : legacyUrl;
            }
        }

        // Final safety check: remove any remaining .do or legacy paths
        if (finalUrl.contains(".do")) {
            log.warn(">>> [MenuService] Unhandled legacy URL detected: {}", finalUrl);
            return "#";
        }

        return finalUrl;
    }

    private String inferModernRoute(String progrmFileNm) {
        if (progrmFileNm == null)
            return null;

        if (progrmFileNm.contains("BoardManage"))
            return "/admin/community/boards";
        if (progrmFileNm.contains("BBSMaster"))
            return "/admin/community";
        if (progrmFileNm.contains("CmmCode"))
            return "/admin/system/common-code";
        if (progrmFileNm.contains("GroupList"))
            return "/admin/security/group";
        if (progrmFileNm.contains("RoleList"))
            return "/admin/security/role";
        if (progrmFileNm.contains("AuthorGroup"))
            return "/admin/security/authority";
        if (progrmFileNm.contains("QustnrManage"))
            return "/admin/survey/manage";
        if (progrmFileNm.contains("QustnrTmplat"))
            return "/admin/survey/templates";
        if (progrmFileNm.contains("AdbkList"))
            return "/admin/collaboration/address-book";
        if (progrmFileNm.contains("FaqList"))
            return "/admin/help/faq";
        if (progrmFileNm.contains("CnsltList"))
            return "/admin/help/qna";
        if (progrmFileNm.contains("MainImage"))
            return "/admin/system/banner";
        if (progrmFileNm.contains("FileMng"))
            return "/admin/system/files";
        if (progrmFileNm.contains("ProgramList"))
            return "/admin/system/programs";
        if (progrmFileNm.contains("MenuCreat"))
            return "/admin/system/menus/by-authority";
        if (progrmFileNm.contains("MenuList"))
            return "/admin/system/menus";

        return null;
    }

    private String inferFromLegacyUrl(String legacyUrl) {
        if (legacyUrl == null)
            return null;

        if (legacyUrl.contains("/uss/olh/qna/"))
            return "/admin/help/qna";
        if (legacyUrl.contains("/uss/olh/faq/"))
            return "/admin/help/faq";
        if (legacyUrl.contains("/sec/gmt/"))
            return "/admin/security/group";
        if (legacyUrl.contains("/sec/ram/"))
            return "/admin/security/role";
        if (legacyUrl.contains("/sym/ccm/"))
            return "/admin/system/common-code";
        if (legacyUrl.contains("/uss/olp/qtm/"))
            return "/admin/survey/templates";
        if (legacyUrl.contains("/uss/olp/qmc/"))
            return "/admin/survey/manage";

        return null;
    }
}
