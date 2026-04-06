package nuri.foundation.service.menu;

import nuri.foundation.domain.auth.MenuAuthority;
import nuri.foundation.domain.auth.MenuAuthorityRepository;
import nuri.foundation.domain.menu.Menu;
import nuri.foundation.domain.menu.MenuRepository;
import nuri.foundation.domain.program.Program;
import nuri.foundation.domain.program.ProgramRepository;
import nuri.foundation.service.menu.dto.MenuCreateDto;
import nuri.foundation.service.menu.dto.MenuDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import egovframework.com.cmm.ComDefaultVO;
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
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;

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
    private final MenuAuthorityRepository menuAuthorityRepository;

    /**
     * 권한별 메뉴 계층 구조 조회 (캐싱 적용)
     */
    @Cacheable(value = "menuHierarchy", key = "T(org.springframework.security.core.context.SecurityContextHolder).getContext().getAuthentication()?.authorities ?: 'ROLE_ANONYMOUS'")
    public List<MenuDto> getMenuHierarchy() {
        try {
            log.debug("getMenuHierarchy started (Cache Miss)");

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            List<String> roles = new ArrayList<>();
            if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
                for (GrantedAuthority authority : auth.getAuthorities()) {
                    roles.add(authority.getAuthority());
                }
            } else {
                roles.add("ROLE_ANONYMOUS");
            }

            return buildMenuTree(null, roles);
        } catch (Exception e) {
            log.error("getMenuHierarchy failed", e);
            throw e;
        }
    }

    /**
     * 공통 메뉴 트리 빌더 (N+1 쿼리 개선 버전)
     * 
     * @param rootMenuNo 최상단 부모 번호 (null 인 경우 전체 루트 조회)
     * @param roles      사용자 권한 목록
     */
    private List<MenuDto> buildMenuTree(Long rootMenuNo, List<String> roles) {
        // [성능 개선] 단일 쿼리로 메뉴와 권한 정보를 함께 조회 (N+1 방지)
        List<Object[]> menuWithAuthResults = menuRepository.findAllWithAuthorities();

        // 메뉴와 권한 매핑
        Map<Long, Menu> menuMap = new LinkedHashMap<>();
        Map<Long, List<MenuAuthority>> authorityMap = new HashMap<>();

        for (Object[] result : menuWithAuthResults) {
            Menu menu = (Menu) result[0];
            MenuAuthority authority = (MenuAuthority) result[1];

            menuMap.put(menu.getId(), menu);

            if (authority != null) {
                authorityMap.computeIfAbsent(menu.getId(), k -> new ArrayList<>())
                        .add(authority);
            }
        }

        // 권한 기반 메뉴 필터링
        List<Menu> filteredMenus = menuMap.values().stream()
                .filter(m -> {
                    boolean isAuthorized = authorityMap.getOrDefault(m.getId(), new ArrayList<>()).stream()
                            .anyMatch(ma -> roles.contains(ma.getId().getAuthorCode()));
                    boolean isAdmin = roles.contains("ROLE_ADMIN");
                    return (isAuthorized || isAdmin) && m.getId() <= 9999999;
                })
                .collect(Collectors.toList());

        // [성능 개선] 단일 쿼리로 프로그램 정보 조회
        List<Program> programs = programRepository.findAll();
        Map<String, Program> programMap = programs.stream()
                .filter(p -> p.getProgrmFileNm() != null)
                .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a, b) -> a));

        // 메뉴 트리 구성
        Map<Long, MenuDto> dtoMap = new LinkedHashMap<>();
        List<MenuDto> rootNodes = new ArrayList<>();

        for (Menu menu : filteredMenus) {
            String url = calculateUrl(menu, programMap);

            MenuDto dto = MenuDto.builder()
                    .id(menu.getId())
                    .menuNo(menu.getId())
                    .menuNm(menu.getMenuNm())
                    .progrmFileNm(menu.getProgrmFileNm())
                    .upperMenuNo(menu.getUpperMenuNo())
                    .upperMenuId(menu.getUpperMenuNo())
                    .menuOrdr(menu.getMenuOrdr())
                    .chkURL(url)
                    .modernRoute(menu.getModernRoute())
                    .relateImagePath(menu.getRelateImagePath())
                    .relateImageNm(menu.getRelateImageNm())
                    .build();

            dtoMap.put(dto.getId(), dto);

            Long upperNo = dto.getUpperMenuNo();
            if (rootMenuNo == null) {
                // 전체 루트 조회인 경우
                if (upperNo == null || upperNo == 0) {
                    rootNodes.add(dto);
                } else if (dtoMap.containsKey(upperNo)) {
                    dtoMap.get(upperNo).addChild(dto);
                }
            } else {
                // 특정 서브트리 조회인 경우
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
        return menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }

    @Cacheable(value = "menuParentMap")
    public Map<Long, Long> getMenuParentMapCached() {
        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        Map<Long, Long> parentMap = new HashMap<>();
        for (Menu m : allMenus) {
            parentMap.put(m.getId(), m.getUpperMenuNo());
        }
        return Collections.unmodifiableMap(parentMap);
    }

    @Cacheable(value = "allMenuDtos")
    public List<MenuDto> getAllMenus() {
        // [성능 개선] 단일 쿼리로 메뉴와 프로그램 정보를 함께 조회 (N+1 방지)
        List<Object[]> menuWithProgramResults = menuRepository.findAllWithPrograms();

        List<MenuDto> result = new ArrayList<>();

        for (Object[] menuResult : menuWithProgramResults) {
            Menu menu = (Menu) menuResult[0];
            Program program = (Program) menuResult[1];

            // 프로그램 맵 대신 직접 사용 (단일 쿼리에서 이미 조인됨)
            String url = calculateUrl(menu,
                    program != null ? java.util.Collections.singletonMap(program.getProgrmFileNm(), program) : null);

            MenuDto dto = MenuDto.builder()
                    .id(menu.getId())
                    .menuNo(menu.getId())
                    .menuNm(menu.getMenuNm())
                    .progrmFileNm(menu.getProgrmFileNm())
                    .upperMenuNo(menu.getUpperMenuNo())
                    .upperMenuId(menu.getUpperMenuNo())
                    .menuOrdr(menu.getMenuOrdr())
                    .chkURL(url)
                    .modernRoute(menu.getModernRoute())
                    .relateImagePath(menu.getRelateImagePath())
                    .relateImageNm(menu.getRelateImageNm())
                    .build();

            result.add(dto);
        }
        return result;
    }

    public List<Program> getAllPrograms() {
        return programRepository.findAll();
    }

    public List<MenuCreateDto> selectMenuCreatManagList(@NonNull ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
                Sort.by("authorCode").ascending());
        String searchKeyword = searchVO.getSearchKeyword() != null ? searchVO.getSearchKeyword() : "";

        return menuAuthorityRepository
                .selectMenuCreatManagList(searchKeyword, Objects.requireNonNull(pageable)).stream()
                .map(proj -> MenuCreateDto.builder()
                        .authorCode(proj.getAuthorCode())
                        .authorNm(proj.getAuthorNm())
                        .authorDc(proj.getAuthorDc())
                        .authorCreatDe(proj.getAuthorCreatDe() != null ? proj.getAuthorCreatDe().toString() : "")
                        .chkYeoBu(proj.getChkYeoBu().intValue())
                        .build())
                .collect(Collectors.toList());
    }

    public int selectMenuCreatManagTotCnt(@NonNull ComDefaultVO searchVO) {
        String searchKeyword = searchVO.getSearchKeyword() != null ? searchVO.getSearchKeyword() : "";
        return (int) menuAuthorityRepository.selectMenuCreatManagList(searchKeyword, PageRequest.of(0, 1))
                .getTotalElements();
    }

    public List<MenuCreateDto> selectMenuCreatList(@NonNull MenuCreateDto vo) {
        return menuAuthorityRepository.selectMenuCreatList(vo.getAuthorCode()).stream()
                .map(proj -> MenuCreateDto.builder()
                        .menuNo(proj.getMenuNo().intValue())
                        .authorCode(proj.getAuthorCode())
                        .authorNm(proj.getMenuNm()) // Use menu name for display if needed
                        .chkYeoBu("Y".equals(proj.getRegYn()) ? 1 : 0)
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuHierarchy", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void insertMenuCreatList(String authorCode, String checkedMenuNos) {
        menuAuthorityRepository.deleteByIdAuthorCode(Objects.requireNonNull(authorCode));

        if (checkedMenuNos != null && !checkedMenuNos.isEmpty()) {
            String[] menuNos = checkedMenuNos.split(",");
            List<MenuAuthority> authorities = new ArrayList<>();
            for (String menuNo : menuNos) {
                if (menuNo == null || menuNo.isEmpty())
                    continue;
                long mNo = Long.parseLong(menuNo);
                MenuAuthority ma = MenuAuthority.builder()
                        .id(MenuAuthority.MenuAuthorityId.builder()
                                .authorCode(authorCode)
                                .menuNo(mNo)
                                .build())
                        .mapngCreatId(authorCode)
                        .build();
                authorities.add(ma);
            }
            if (!authorities.isEmpty()) {
                menuAuthorityRepository.saveAll(Objects.requireNonNull(authorities));
            }
        }
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuHierarchy", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void insertMenuManage(@NonNull MenuDto vo) {
        // FK 제약 방지를 위해 프로그램이 없으면 자동 등록
        if (vo.getProgrmFileNm() != null && !programRepository.existsById(vo.getProgrmFileNm())) {
            nuri.foundation.domain.program.Program p = nuri.foundation.domain.program.Program
                    .builder()
                    .progrmFileNm(vo.getProgrmFileNm())
                    .progrmKoreanNm("자동생성메뉴(" + vo.getMenuNm() + ")")
                    .url(vo.getModernRoute())
                    .progrmStrePath("/auto-generated")
                    .build();
            programRepository.save(p);
        }

        Menu menu = new Menu(
                vo.getMenuNo(),
                vo.getMenuNm(),
                vo.getProgrmFileNm(),
                vo.getUpperMenuNo(),
                vo.getMenuOrdr(),
                vo.getMenuDc(),
                vo.getRelateImagePath(),
                vo.getRelateImageNm(),
                vo.getModernRoute(),
                "webmaster",
                java.time.LocalDateTime.now(),
                "webmaster",
                java.time.LocalDateTime.now());
        menuRepository.save(Objects.requireNonNull(menu));
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuHierarchy", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void updateMenuManage(@NonNull MenuDto vo) {
        Menu menu = menuRepository.findById(Objects.requireNonNull(vo.getMenuNo()))
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
        menu.updateWithModernRoute(vo.getMenuNm(), vo.getProgrmFileNm(), vo.getUpperMenuNo(), vo.getMenuOrdr(),
                vo.getMenuDc(),
                vo.getRelateImagePath(), vo.getRelateImageNm(), vo.getModernRoute());
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuHierarchy", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void deleteMenuManage(@NonNull MenuDto vo) {
        menuRepository.deleteById(Objects.requireNonNull(vo.getMenuNo()));
    }

    @CacheEvict(value = { "allMenus", "menuHierarchy", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void deleteMenuManageList(String checkedMenuNoForDel) {
        if (checkedMenuNoForDel == null || checkedMenuNoForDel.isEmpty())
            return;
        String[] delMenuNos = checkedMenuNoForDel.split(",");
        List<Long> ids = new ArrayList<>();
        for (String menuNo : delMenuNos) {
            if (menuNo == null || menuNo.isEmpty())
                continue;
            ids.add(Long.parseLong(menuNo));
        }
        if (!ids.isEmpty()) {
            menuRepository.deleteAllById(Objects.requireNonNull(ids));
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
                .map(Program::getProgrmFileNm)
                .orElse(null);
    }

    public Long getRootMenuIdByProgrmFileNm(String progrmFileNm) {
        if (progrmFileNm == null)
            return null;
        Menu currentMenu = menuRepository.findByProgrmFileNm(Objects.requireNonNull(progrmFileNm)).orElse(null);
        if (currentMenu == null)
            return null;

        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        Map<Long, Long> parentMap = new HashMap<>();
        for (Menu m : allMenus) {
            parentMap.put(m.getId(), m.getUpperMenuNo());
        }

        Long currentId = currentMenu.getId();
        Long upperId = currentMenu.getUpperMenuNo();

        while (upperId != null && upperId != 0) {
            if (!parentMap.containsKey(upperId))
                break;
            Long nextUpperId = parentMap.get(upperId);
            currentId = upperId;
            upperId = nextUpperId;
        }
        return currentId;
    }

    /**
     * 하위 메뉴 목록 조회
     */
    public List<MenuDto> getSubMenus(Long menuNo) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        List<String> roles = new ArrayList<>();
        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            for (GrantedAuthority authority : auth.getAuthorities()) {
                roles.add(authority.getAuthority());
            }
        } else {
            roles.add("ROLE_ANONYMOUS");
        }
        return buildMenuTree(menuNo, roles);
    }

    /**
     * 메뉴 관리 목록 조회 (N+1 쿼리 개선 버전)
     */
    public List<MenuDto> selectMenuManageList(@NonNull ComDefaultVO searchVO) {
        // [성능 개선] 단일 쿼리로 메뉴와 프로그램 정보를 함께 조회
        List<Object[]> menuWithProgramResults = menuRepository.findAllWithPrograms();

        return menuWithProgramResults.stream().map(menuResult -> {
            Menu menu = (Menu) menuResult[0];
            Program program = (Program) menuResult[1];

            String url = calculateUrl(menu,
                    program != null ? java.util.Collections.singletonMap(program.getProgrmFileNm(), program) : null);

            return MenuDto.builder()
                    .id(menu.getId())
                    .menuNo(menu.getId())
                    .menuNm(menu.getMenuNm())
                    .progrmFileNm(menu.getProgrmFileNm())
                    .upperMenuNo(menu.getUpperMenuNo())
                    .upperMenuId(menu.getUpperMenuNo())
                    .menuOrdr(menu.getMenuOrdr())
                    .chkURL(url)
                    .modernRoute(menu.getModernRoute())
                    .relateImagePath(menu.getRelateImagePath())
                    .relateImageNm(menu.getRelateImageNm())
                    .build();
        }).collect(Collectors.toList());
    }

    /**
     * 메뉴 관리 목록 총 개수
     */
    public int selectMenuManageListTotCnt(@NonNull ComDefaultVO searchVO) {
        return (int) menuRepository.count();
    }

    /**
     * 메뉴 상세 조회
     */
    public MenuDto selectMenuManage(Long menuNo) {
        Menu menu = menuRepository.findById(Objects.requireNonNull(menuNo))
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

        String url = calculateUrl(menu, null); // 상세 조회는 단건이므로 null 허용

        return MenuDto.builder()
                .id(menu.getId())
                .menuNo(menu.getId())
                .menuNm(menu.getMenuNm())
                .progrmFileNm(menu.getProgrmFileNm())
                .upperMenuNo(menu.getUpperMenuNo())
                .upperMenuId(menu.getUpperMenuNo())
                .menuOrdr(menu.getMenuOrdr())
                .chkURL(url)
                .modernRoute(menu.getModernRoute())
                .relateImagePath(menu.getRelateImagePath())
                .relateImageNm(menu.getRelateImageNm())
                .build();
    }

    /**
     * 메뉴에 대한 최적의 URL을 계산합니다.
     * 1. modernRoute가 존재하면 우선 사용
     * 2. 없으면 프로그램명을 기반으로 현대적 라우트 추론
     * 3. 추론 실패 시 레거시 프로그램 URL 사용 (없는 경우 #)
     */
    private String calculateUrl(Menu menu, Map<String, Program> programMap) {
        if (menu.getModernRoute() != null && !menu.getModernRoute().isEmpty()) {
            return menu.getModernRoute();
        }

        String progrmFileNm = menu.getProgrmFileNm();
        if (progrmFileNm == null || "dir".equals(progrmFileNm) || "/".equals(progrmFileNm)) {
            return "#";
        }

        // 1. 프로그램명 기반 정교한 추론
        String inferred = inferModernRoute(progrmFileNm);
        if (inferred != null)
            return inferred;

        // 2. 레거시 프로그램 URL 폴백
        Program program = null;
        if (programMap != null) {
            program = programMap.get(progrmFileNm);
        } else {
            program = programRepository.findById(progrmFileNm).orElse(null);
        }

        if (program != null && program.getUrl() != null) {
            String legacyUrl = program.getUrl();
            if (legacyUrl.contains(".do")) {
                // 레거시 URL인 경우 한 번 더 추론 시도
                String inferredFromLegacy = inferFromLegacyUrl(legacyUrl);
                return inferredFromLegacy != null ? inferredFromLegacy : "#";
            }
            return "/".equals(legacyUrl) ? "#" : legacyUrl;
        }

        return "/";
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

        // 레거시 경로 패턴을 현대적 패턴으로 변환
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
