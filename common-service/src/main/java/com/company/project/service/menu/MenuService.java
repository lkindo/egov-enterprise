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

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuService {

    private final MenuRepository menuRepository;
    private final ProgramRepository programRepository;
    private final MenuAuthorityRepository menuAuthorityRepository;

    // @Cacheable(value = "menuHierarchy")
    public List<MenuDto> getMenuHierarchy() {
        try {
            log.debug("getMenuHierarchy started");
            List<Menu> menus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
            log.debug("Loaded {} menus", menus.size());
            
            List<Program> programs = programRepository.findAll();
            log.debug("Loaded {} programs", programs.size());
            
            Map<String, Program> programMap = programs.stream()
                    .filter(p -> p.getProgrmFileNm() != null)
                    .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a, b) -> a));

            Map<Long, MenuDto> menuMap = new LinkedHashMap<>();
            List<MenuDto> rootMenus = new ArrayList<>();

            for (Menu menu : menus) {
                try {
                    String url = "#";
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
                        } else {
                            rootMenus.add(dto);
                        }
                    }
                } catch (Exception e) {
                    log.error("Error processing menu: menuId={}, menuNm={}", menu.getId(), menu.getMenuNm(), e);
                    throw e;
                }
            }

            log.debug("getMenuHierarchy completed with {} root menus", rootMenus.size());
            return rootMenus;
        } catch (Exception e) {
            log.error("getMenuHierarchy failed", e);
            throw e;
        }
    }

    @Cacheable(value = "allMenus", unless = "#result == null")
    public List<Menu> getAllMenusCached() {
        log.debug("getAllMenusCached started");
        try {
            List<Menu> menus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
            log.debug("getAllMenusCached loaded {} menus", menus.size());
            return menus;
        } catch (Exception e) {
            log.error("getAllMenusCached failed", e);
            throw e;
        }
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
        log.debug("getAllPrograms called");
        return programRepository.findAll();
    }

    public List<MenuCreateDto> selectMenuCreatManagList(@NonNull ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
                Sort.by("authorCode").ascending());
        String searchKeyword = searchVO.getSearchKeyword();
        if (searchKeyword == null) {
            searchKeyword = "";
        }

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
        String searchKeyword = searchVO.getSearchKeyword();
        if (searchKeyword == null) {
            searchKeyword = "";
        }
        return (int) menuAuthorityRepository.selectMenuCreatManagList(searchKeyword, PageRequest.of(0, 1))
                .getTotalElements();
    }

    public List<MenuDto> selectMenuCreatList(@NonNull MenuCreateDto vo) {
        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        List<MenuAuthority> authorized = menuAuthorityRepository
                .findByIdAuthorCode(Objects.requireNonNull(vo.getAuthorCode()));
        Map<Long, Boolean> authMap = authorized.stream()
                .collect(Collectors.toMap(ma -> Objects.requireNonNull(ma.getId()).getMenuNo(), ma -> true));

        return allMenus.stream().map(menu -> {
            MenuDto dto = MenuDto.builder()
                    .menuNo(menu.getId())
                    .menuNm(menu.getMenuNm())
                    .upperMenuId(menu.getUpperMenuNo())
                    .progrmFileNm(menu.getProgrmFileNm())
                    .modernRoute(menu.getModernRoute())
                    .build();
            if (authMap.containsKey(menu.getId())) {
                // dto.setChkYeoBu(true);
            }
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

    public List<MenuDto> getSubMenus(Long parentId) {
        if (parentId == null)
            return new ArrayList<>();
        List<MenuDto> rootMenus = getMenuHierarchy();
        return findInHierarchy(rootMenus, parentId)
                .map(MenuDto::getChildren)
                .orElse(new ArrayList<>());
    }

    private Optional<MenuDto> findInHierarchy(List<MenuDto> nodes, Long id) {
        for (MenuDto node : nodes) {
            if (node.getId().equals(id))
                return Optional.of(node);
            Optional<MenuDto> found = findInHierarchy(node.getChildren(), id);
            if (found.isPresent())
                return found;
        }
        return Optional.empty();
    }

    public String getProgrmFileNmByUrl(String url) {
        if (url == null || url.isEmpty())
            return null;

        final String resolvedUrl;
        if (url.contains("/sec/rgm/EgovAuthorGroupListView.do")) {
            resolvedUrl = "/sec/ram/EgovAuthorRoleList.do";
        } else if (url.contains("/uss/umt/EgovMberSelectUpdtView.do")) {
            resolvedUrl = "/uss/umt/user/EgovUserSelectUpdtView.do";
        } else if (url.contains("/sec/ram/EgovAuthor.do")) {
            resolvedUrl = "/sec/ram/EgovAuthorList.do";
        } else if (url.contains("/uss/umt/EgovUserManage.do")) {
            resolvedUrl = "/uss/umt/user/EgovUserManage.do";
        } else if (url.contains("/sec/ram/EgovAuthorManage.do")) {
            resolvedUrl = "/sec/ram/EgovAuthorList.do";
        } else if (url.contains("/uss/ion/uas/selectUserAbsnceListView.do")) {
            resolvedUrl = "/uss/ion/uas/selectUserAbsnceList.do";
        } else if (url.contains("/sec/gmt/EgovGroupListView.do")) {
            resolvedUrl = "/sec/gmt/EgovGroupList.do";
        } else if (url.contains("/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA")
                || url.contains("/cop/bbs/admin/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA")) {
            resolvedUrl = "/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA";
        } else if (url.contains("/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_CCCCCCCCCCCC")
                || url.contains("/cop/bbs/admin/selectBoardList.do?bbsId=BBSMSTR_CCCCCCCCCCCC")) {
            resolvedUrl = "/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_CCCCCCCCCCCC";
        } else if (url.contains("/sym/log/clg/SelectLoginLogList.do")) {
            resolvedUrl = "/sym/log/clg/SelectLoginLogList.do";
        } else if (url.contains("/sts/cst/selectConectStats.do")) {
            resolvedUrl = "/sts/cst/selectConectStats.do";
        } else {
            resolvedUrl = url;
        }

        return programRepository.findByUrl(Objects.requireNonNull(resolvedUrl))
                .map(Program::getProgrmFileNm)
                .orElseGet(() -> {
                    if (resolvedUrl.contains("?")) {
                        String baseUrl = resolvedUrl.substring(0, resolvedUrl.indexOf("?"));
                        return programRepository.findByUrl(Objects.requireNonNull(baseUrl))
                                .map(Program::getProgrmFileNm)
                                .orElse(null);
                    }
                    return null;
                });
    }

    @Cacheable(value = "rootMenuIdByUrl", key = "#url", unless = "#result == null")
    public Long getRootMenuIdByUrl(String url) {
        String progrmFileNm = getProgrmFileNmByUrl(url);
        if (progrmFileNm == null)
            return null;
        return getRootMenuIdByProgrmFileNm(progrmFileNm);
    }

    public Long getRootMenuIdByProgrmFileNm(String progrmFileNm) {
        if (progrmFileNm == null)
            return null;

        Menu currentMenu = menuRepository.findByProgrmFileNm(Objects.requireNonNull(progrmFileNm))
                .orElse(null);
        if (currentMenu == null) {
            return null;
        }

        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        Map<Long, Long> parentMap = new HashMap<>();
        for (Menu m : allMenus) {
            parentMap.put(m.getId(), m.getUpperMenuNo());
        }

        Long currentId = currentMenu.getId();
        Long upperId = currentMenu.getUpperMenuNo();

        while (upperId != null && upperId != 0) {
            if (!parentMap.containsKey(upperId)) {
                break;
            }
            Long nextUpperId = parentMap.get(upperId);
            currentId = upperId;
            upperId = nextUpperId;
        }
        return currentId;
    }

    /* Menu Management Methods */

    public List<MenuDto> selectMenuManageList(@NonNull ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
                Sort.by("id").ascending());
        String searchKeyword = searchVO.getSearchKeyword();
        if (searchKeyword == null)
            searchKeyword = "";

        Page<Menu> page = menuRepository.searchByKeyword(searchKeyword, Objects.requireNonNull(pageable));
        return page.stream().map(this::toDto).collect(Collectors.toList());
    }

    public int selectMenuManageListTotCnt(@NonNull ComDefaultVO searchVO) {
        String searchKeyword = searchVO.getSearchKeyword();
        if (searchKeyword == null)
            searchKeyword = "";
        return (int) menuRepository.searchByKeyword(searchKeyword, PageRequest.of(0, 1)).getTotalElements();
    }

    public MenuDto selectMenuManage(Long menuNo) {
        return menuRepository.findById(Objects.requireNonNull(menuNo)).map(this::toDto).orElse(null);
    }

    public int selectMenuNoByPk(@NonNull MenuDto vo) {
        return menuRepository.existsById(Objects.requireNonNull(vo.getMenuNo())) ? 1 : 0;
    }

    public int selectUpperMenuNoByPk(@NonNull MenuDto vo) {
        return menuRepository.countByUpperMenuNo(Objects.requireNonNull(vo.getMenuNo()));
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
        menu.updateWithModernRoute(vo.getMenuNm(), vo.getProgrmFileNm(), vo.getUpperMenuNo(), vo.getMenuOrdr(), vo.getMenuDc(),
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

    private MenuDto toDto(Menu menu) {
        return MenuDto.builder()
                .menuNo(menu.getId())
                .id(menu.getId())
                .menuNm(menu.getMenuNm())
                .progrmFileNm(menu.getProgrmFileNm())
                .upperMenuNo(menu.getUpperMenuNo())
                .upperMenuId(menu.getUpperMenuNo())
                .menuOrdr(menu.getMenuOrdr())
                .menuDc(menu.getMenuDc())
                .modernRoute(menu.getModernRoute())
                .relateImagePath(menu.getRelateImagePath())
                .relateImageNm(menu.getRelateImageNm())
                .build();
    }
}
