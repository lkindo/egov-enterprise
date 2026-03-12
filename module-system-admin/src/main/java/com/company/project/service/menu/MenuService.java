package com.company.project.service.menu;

import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.service.menu.dto.MenuCreateDto;
import com.company.project.service.menu.dto.MenuDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
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
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;

/**
 * 메뉴 관리 서비스
 * - 메뉴 계층 구조 조회, 권한별 메뉴 필터링, 메뉴 관리 기능 제공
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuService {

    private final MenuRepository menuRepository;
    private final ProgramRepository programRepository;
    private final MenuAuthorityRepository menuAuthorityRepository;

    /**
     * 권한별 메뉴 계층 구조 조회 (캐싱 적용)
     */
    @Cacheable(value = "menuHierarchy", key = "T(org.springframework.security.core.context.SecurityContextHolder).getContext().getAuthentication().getAuthorities()")
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

            List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();    
            List<MenuAuthority> authorities = menuAuthorityRepository.findAll();

            List<Long> authorizedMenuNos = authorities.stream()
                    .filter(ma -> roles.contains(ma.getId().getAuthorCode()))
                    .map(ma -> ma.getId().getMenuNo())
                    .distinct()
                    .collect(Collectors.toList());

            // 신규 메뉴 체계(menu_no <= 9999)만 GNB/LNB에 포함
            List<Menu> menus = allMenus.stream()
                    .filter(m -> {
                        boolean isNewMenuScheme = m.getId() != null && m.getId() <= 9999;        
                        boolean isAuthorized = authorizedMenuNos.contains(m.getId());
                        boolean isAdmin = roles.contains("ROLE_ADMIN");
                        return isNewMenuScheme && (isAuthorized || isAdmin);
                    })
                    .collect(Collectors.toList());

            List<Program> programs = programRepository.findAll();
            Map<String, Program> programMap = programs.stream()
                    .filter(p -> p.getProgrmFileNm() != null)
                    .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a, b) -> a));

            Map<Long, MenuDto> menuMap = new LinkedHashMap<>();
            List<MenuDto> rootMenus = new ArrayList<>();

            for (Menu menu : menus) {
                String url = "#";
                if (menu.getModernRoute() != null && !menu.getModernRoute().isEmpty()) {     
                    url = menu.getModernRoute();
                } else {
                    String progrm = menu.getProgrmFileNm();
                    if (progrm != null && !"dir".equals(progrm) && !"/".equals(progrm)) {    
                        Program program = programMap.get(progrm);
                        if (program != null && program.getUrl() != null) {
                            String progrmUrl = program.getUrl();
                            url = "/".equals(progrmUrl) ? "#" : progrmUrl;
                        } else {
                            url = "/";
                        }
                    }
                }

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

                menuMap.put(dto.getId(), dto);

                Long upperMenuNo = dto.getUpperMenuNo();
                if (upperMenuNo == null || upperMenuNo == 0) {
                    if (dto.getId() != null && dto.getId() != 0) {
                        rootMenus.add(dto);
                    }
                } else {
                    MenuDto parent = menuMap.get(upperMenuNo);
                    if (parent != null) {
                        parent.addChild(dto);
                    }
                }
            }

            return rootMenus;
        } catch (Exception e) {
            log.error("getMenuHierarchy failed", e);
            throw e;
        }
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
        List<Menu> menus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        List<Program> programs = programRepository.findAll();
        Map<String, Program> programMap = programs.stream()
                .filter(p -> p.getProgrmFileNm() != null)
                .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a, b) -> a));

        List<MenuDto> result = new ArrayList<>();

        for (Menu menu : menus) {
            String url = "#";
            if (menu.getModernRoute() != null && !menu.getModernRoute().isEmpty()) {
                url = menu.getModernRoute();
            } else {
                String progrm = menu.getProgrmFileNm();
                if (progrm != null && !"dir".equals(progrm) && !"/".equals(progrm)) {
                    Program program = programMap.get(progrm);
                    if (program != null && program.getUrl() != null) {
                        String progrmUrl = program.getUrl();
                        url = "/".equals(progrmUrl) ? "#" : progrmUrl;
                    } else {
                        url = "/";
                    }
                }
            }

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

    public List<MenuDto> selectMenuCreatList(@NonNull MenuCreateDto vo) {
        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();        
        return allMenus.stream().map(menu -> {
            MenuDto dto = MenuDto.builder()
                    .menuNo(menu.getId())
                    .menuNm(menu.getMenuNm())
                    .upperMenuId(menu.getUpperMenuNo())
                    .progrmFileNm(menu.getProgrmFileNm())
                    .modernRoute(menu.getModernRoute())
                    .build();
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuHierarchy", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void insertMenuCreatList(String authorCode, String checkedMenuNos) {
        menuAuthorityRepository.deleteByIdAuthorCode(Objects.requireNonNull(authorCode));        

        if (checkedMenuNos != null && !checkedMenuNos.isEmpty()) {
            String[] menuNos = checkedMenuNos.split(",");
            List<MenuAuthority> authorities = new ArrayList<>();
            for (String menuNo : menuNos) {
                if (menuNo == null || menuNo.isEmpty()) continue;
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
        Menu menu = Menu.builder()
                .id(vo.getMenuNo())
                .menuNm(vo.getMenuNm())
                .progrmFileNm(vo.getProgrmFileNm())
                .upperMenuNo(vo.getUpperMenuNo())
                .menuOrdr(vo.getMenuOrdr())
                .menuDc(vo.getMenuDc())
                .modernRoute(vo.getModernRoute())
                .relateImagePath(vo.getRelateImagePath())
                .relateImageNm(vo.getRelateImageNm())
                .build();
        menuRepository.save(Objects.requireNonNull(menu));
    }

    @Transactional
    @CacheEvict(value = { "allMenus", "menuHierarchy", "menuParentMap", "allMenuDtos" }, allEntries = true)
    public void updateMenuManage(@NonNull MenuDto vo) {
        Menu menu = menuRepository.findById(Objects.requireNonNull(vo.getMenuNo()))
                .orElseThrow(() -> new IllegalArgumentException("Menu not found"));
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
        if (checkedMenuNoForDel == null || checkedMenuNoForDel.isEmpty()) return;
        String[] delMenuNos = checkedMenuNoForDel.split(",");
        List<Long> ids = new ArrayList<>();
        for (String menuNo : delMenuNos) {
            if (menuNo == null || menuNo.isEmpty()) continue;
            ids.add(Long.parseLong(menuNo));
        }
        if (!ids.isEmpty()) {
            menuRepository.deleteAllById(Objects.requireNonNull(ids));
        }
    }

    @Cacheable(value = "rootMenuIdByUrl", key = "#url", unless = "#result == null")
    public Long getRootMenuIdByUrl(String url) {
        String progrmFileNm = getProgrmFileNmByUrl(url);
        if (progrmFileNm == null) return null;
        return getRootMenuIdByProgrmFileNm(progrmFileNm);
    }

    public String getProgrmFileNmByUrl(String url) {
        if (url == null || url.isEmpty()) return null;
        return programRepository.findByUrl(Objects.requireNonNull(url))
                .map(Program::getProgrmFileNm)
                .orElse(null);
    }

    public Long getRootMenuIdByProgrmFileNm(String progrmFileNm) {
        if (progrmFileNm == null) return null;
        Menu currentMenu = menuRepository.findByProgrmFileNm(Objects.requireNonNull(progrmFileNm)).orElse(null);
        if (currentMenu == null) return null;

        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        Map<Long, Long> parentMap = new HashMap<>();
        for (Menu m : allMenus) {
            parentMap.put(m.getId(), m.getUpperMenuNo());
        }

        Long currentId = currentMenu.getId();
        Long upperId = currentMenu.getUpperMenuNo();

        while (upperId != null && upperId != 0) {
            if (!parentMap.containsKey(upperId)) break;
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
        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        List<Program> programs = programRepository.findAll();
        Map<String, Program> programMap = programs.stream()
                .filter(p -> p.getProgrmFileNm() != null)
                .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a, b) -> a));

        return allMenus.stream()
                .filter(menu -> menu.getUpperMenuNo() != null && menu.getUpperMenuNo().equals(menuNo))
                .map(menu -> {
                    String url = "#";
                    if (menu.getModernRoute() != null && !menu.getModernRoute().isEmpty()) {
                        url = menu.getModernRoute();
                    } else {
                        String progrm = menu.getProgrmFileNm();
                        if (progrm != null && !"dir".equals(progrm) && !"/".equals(progrm)) {
                            Program program = programMap.get(progrm);
                            if (program != null && program.getUrl() != null) {
                                String progrmUrl = program.getUrl();
                                url = "/".equals(progrmUrl) ? "#" : progrmUrl;
                            } else {
                                url = "/";
                            }
                        }
                    }

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
                })
                .collect(Collectors.toList());
    }

    /**
     * 메뉴 관리 목록 조회
     */
    public List<MenuDto> selectMenuManageList(@NonNull ComDefaultVO searchVO) {
        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        List<Program> programs = programRepository.findAll();
        Map<String, Program> programMap = programs.stream()
                .filter(p -> p.getProgrmFileNm() != null)
                .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a, b) -> a));

        return allMenus.stream().map(menu -> {
            String url = "#";
            if (menu.getModernRoute() != null && !menu.getModernRoute().isEmpty()) {
                url = menu.getModernRoute();
            } else {
                String progrm = menu.getProgrmFileNm();
                if (progrm != null && !"dir".equals(progrm) && !"/".equals(progrm)) {
                    Program program = programMap.get(progrm);
                    if (program != null && program.getUrl() != null) {
                        String progrmUrl = program.getUrl();
                        url = "/".equals(progrmUrl) ? "#" : progrmUrl;
                    } else {
                        url = "/";
                    }
                }
            }

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
                .orElseThrow(() -> new IllegalArgumentException("Menu not found"));

        String url = "#";
        if (menu.getModernRoute() != null && !menu.getModernRoute().isEmpty()) {
            url = menu.getModernRoute();
        } else {
            String progrm = menu.getProgrmFileNm();
            if (progrm != null && !"dir".equals(progrm) && !"/".equals(progrm)) {
                Program program = programRepository.findById(progrm).orElse(null);
                if (program != null && program.getUrl() != null) {
                    String progrmUrl = program.getUrl();
                    url = "/".equals(progrmUrl) ? "#" : progrmUrl;
                } else {
                    url = "/";
                }
            }
        }

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
}
