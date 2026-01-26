package com.company.project.service.menu;

import com.company.project.domain.auth.AuthorityRepository;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuService {

    private final MenuRepository menuRepository;
    private final ProgramRepository programRepository; // Restored
    private final AuthorityRepository authorityRepository;
    private final MenuAuthorityRepository menuAuthorityRepository;

    @Autowired
    @Lazy
    private MenuService self;

    @Cacheable(value = "menuHierarchy")
    public List<MenuDto> getMenuHierarchy() {
        List<Menu> menus = self.getAllMenusCached();
        List<Program> programs = programRepository.findAll();
        Map<String, Program> programMap = programs.stream()
                .filter(p -> p.getProgrmFileNm() != null)
                .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a,
                        b) -> a));

        Map<Long, MenuDto> menuMap = new LinkedHashMap<>();
        List<MenuDto> rootMenus = new ArrayList<>();

        for (Menu menu : menus) {
            String url = "#"; // Default to # for safe expansion
            String progrm = menu.getProgrmFileNm();

            if (progrm != null && !"dir".equals(progrm) && !"/".equals(progrm)) {
                if (programMap.containsKey(progrm)) {
                    String progrmUrl = programMap.get(progrm).getUrl();
                    // If URL is just / it's likely a directory-like entry in SQL
                    url = "/".equals(progrmUrl) ? "#" : progrmUrl;
                } else {
                    // Not in program map but looks like a program name -> default to / for legacy
                    // compatibility,
                    // but # is safer for categories. Here we use / to match existing logic but
                    // fallback to # if needed.
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
                    .relateImagePath(menu.getRelateImagePath())
                    .relateImageNm(menu.getRelateImageNm())
                    .build();

            menuMap.put(dto.getId(), dto);

            if (dto.getUpperMenuNo() == 0) {
                if (dto.getId() != 0) {
                    rootMenus.add(dto);
                }
            } else {
                MenuDto parent = menuMap.get(dto.getUpperMenuNo());
                if (parent != null) {
                    parent.addChild(dto);
                } else {
                    rootMenus.add(dto);
                }
            }
        }

        return rootMenus;
    }

    @Cacheable(value = "allMenus")
    public List<Menu> getAllMenusCached() {
        return menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }

    public List<MenuDto> getAllMenus() {
        List<Menu> menus = self.getAllMenusCached();
        List<Program> programs = programRepository.findAll();
        Map<String, Program> programMap = programs.stream()
                .filter(p -> p.getProgrmFileNm() != null)
                .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a, b) -> a));

        List<MenuDto> result = new ArrayList<>();

        for (Menu menu : menus) {
            String url = "#";
            String progrm = menu.getProgrmFileNm();

            if (progrm != null && !"dir".equals(progrm) && !"/".equals(progrm)) {
                if (programMap.containsKey(progrm)) {
                    String progrmUrl = programMap.get(progrm).getUrl();
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
                    .relateImagePath(menu.getRelateImagePath())
                    .relateImageNm(menu.getRelateImageNm())
                    .build();

            result.add(dto);
        }
        return result;
    }

    public List<MenuCreateDto> selectMenuCreatManagList(ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
                Sort.by("authorCode").ascending());
        String searchKeyword = searchVO.getSearchKeyword();
        if (searchKeyword == null) {
            searchKeyword = "";
        }

        return menuAuthorityRepository.selectMenuCreatManagList(searchKeyword, pageable).stream()
                .map(proj -> MenuCreateDto.builder()
                        .authorCode(proj.getAuthorCode())
                        .authorNm(proj.getAuthorNm())
                        .authorDc(proj.getAuthorDc())
                        .authorCreatDe(proj.getAuthorCreatDe() != null ? proj.getAuthorCreatDe().toString() : "")
                        .chkYeoBu(proj.getChkYeoBu().intValue())
                        .build())
                .collect(Collectors.toList());
    }

    public int selectMenuCreatManagTotCnt(ComDefaultVO searchVO) {
        String searchKeyword = searchVO.getSearchKeyword();
        if (searchKeyword == null) {
            searchKeyword = "";
        }
        return (int) menuAuthorityRepository.selectMenuCreatManagList(searchKeyword, PageRequest.of(0, 1))
                .getTotalElements();
    }

    public List<MenuDto> selectMenuCreatList(MenuCreateDto vo) {
        // Get all available menus
        List<Menu> allMenus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        // Get authorized menus for specific authorCode
        List<MenuAuthority> authorized = menuAuthorityRepository.findByIdAuthorCode(vo.getAuthorCode());
        Map<Long, Boolean> authMap = authorized.stream()
                .collect(Collectors.toMap(ma -> ma.getId().getMenuNo(), ma -> true));

        // Create tree structure but flat list for UI which likely uses JS tree or table
        // The legacy UI expects a list of menus with 'chkYeoBu' (checked or not)
        return allMenus.stream().map(menu -> {
            MenuDto dto = MenuDto.builder()
                    .menuNo(menu.getId())
                    .menuNm(menu.getMenuNm())
                    .upperMenuId(menu.getUpperMenuNo())
                    .build();
            // Flag if authorized
            if (authMap.containsKey(menu.getId())) {
                // dto.setChkYeoBu(true); // Need to add field to DTO or handle in UI
            }
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = {"allMenus", "menuHierarchy"}, allEntries = true)
    public void insertMenuCreatList(String authorCode, String checkedMenuNos) {
        // Delete existing mapping
        menuAuthorityRepository.deleteByIdAuthorCode(authorCode);

        if (checkedMenuNos != null && !checkedMenuNos.isEmpty()) {
            String[] menuNos = checkedMenuNos.split(",");
            for (String menuNo : menuNos) {
                if (menuNo == null || menuNo.isEmpty())
                    continue;
                long mNo = Long.parseLong(menuNo);
                MenuAuthority ma = MenuAuthority.builder()
                        .id(MenuAuthority.MenuAuthorityId.builder()
                                .authorCode(authorCode)
                                .menuNo(mNo)
                                .build())
                        .mapngCreatId(authorCode) // Usually map id, but using authorCode for simplicity
                        .build();
                menuAuthorityRepository.save(ma);
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

    private java.util.Optional<MenuDto> findInHierarchy(List<MenuDto> nodes, Long id) {
        for (MenuDto node : nodes) {
            if (node.getId().equals(id))
                return java.util.Optional.of(node);
            java.util.Optional<MenuDto> found = findInHierarchy(node.getChildren(), id);
            if (found.isPresent())
                return found;
        }
        return java.util.Optional.empty();
    }

    public String getProgrmFileNmByUrl(String url) {
        if (url == null || url.isEmpty())
            return null;

        final String resolvedUrl;
        // 0. Manual Alias Mapping for improved sidebar reliability
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

        // 1. Exact match first
        return programRepository.findByUrl(resolvedUrl)
                .map(Program::getProgrmFileNm)
                .orElseGet(() -> {
                    // 2. Try match without parameters if original has them
                    if (resolvedUrl.contains("?")) {
                        String baseUrl = resolvedUrl.substring(0, resolvedUrl.indexOf("?"));
                        return programRepository.findByUrl(baseUrl)
                                .map(Program::getProgrmFileNm)
                                .orElse(null);
                    }
                    return null;
                });
    }

    public Long getRootMenuIdByUrl(String url) {
        String progrmFileNm = getProgrmFileNmByUrl(url);
        if (progrmFileNm == null)
            return null;
        return getRootMenuIdByProgrmFileNm(progrmFileNm);
    }

    public Long getRootMenuIdByProgrmFileNm(String progrmFileNm) {
        if (progrmFileNm == null)
            return null;

        Menu currentMenu = menuRepository.findByProgrmFileNm(progrmFileNm).orElse(null);
        if (currentMenu == null) {
            return null;
        }

        List<Menu> allMenus = self.getAllMenusCached();
        Map<Long, Long> parentMap = new java.util.HashMap<>();
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

    public List<MenuDto> selectMenuManageList(ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getRecordCountPerPage(),
                Sort.by("id").ascending());
        String searchKeyword = searchVO.getSearchKeyword();
        if (searchKeyword == null)
            searchKeyword = "";

        Page<Menu> page = menuRepository.searchByKeyword(searchKeyword, pageable);
        return page.stream().map(this::toDto).collect(Collectors.toList());
    }

    public int selectMenuManageListTotCnt(ComDefaultVO searchVO) {
        String searchKeyword = searchVO.getSearchKeyword();
        if (searchKeyword == null)
            searchKeyword = "";
        return (int) menuRepository.searchByKeyword(searchKeyword, PageRequest.of(0, 1)).getTotalElements();
    }

    public MenuDto selectMenuManage(Long menuNo) {
        return menuRepository.findById(menuNo).map(this::toDto).orElse(null);
    }

    public int selectMenuNoByPk(MenuDto vo) {
        return menuRepository.existsById(vo.getMenuNo()) ? 1 : 0;
    }

    public int selectUpperMenuNoByPk(MenuDto vo) {
        return menuRepository.countByUpperMenuNo(vo.getMenuNo());
    }

    @Transactional
    @CacheEvict(value = {"allMenus", "menuHierarchy"}, allEntries = true)
    public void insertMenuManage(MenuDto vo) {
        Menu menu = Menu.builder()
                .id(vo.getMenuNo())
                .menuNm(vo.getMenuNm())
                .progrmFileNm(vo.getProgrmFileNm())
                .upperMenuNo(vo.getUpperMenuNo())
                .menuOrdr(vo.getMenuOrdr())
                .menuDc(vo.getMenuDc())
                .relateImagePath(vo.getRelateImagePath())
                .relateImageNm(vo.getRelateImageNm())
                .build();
        menuRepository.save(menu);
    }

    @Transactional
    @CacheEvict(value = {"allMenus", "menuHierarchy"}, allEntries = true)
    public void updateMenuManage(MenuDto vo) {
        Menu menu = menuRepository.findById(vo.getMenuNo())
                .orElseThrow(() -> new IllegalArgumentException("Menu not found"));
        menu.update(vo.getMenuNm(), vo.getProgrmFileNm(), vo.getUpperMenuNo(), vo.getMenuOrdr(), vo.getMenuDc(),
                vo.getRelateImagePath(), vo.getRelateImageNm());
    }

    @Transactional
    @CacheEvict(value = {"allMenus", "menuHierarchy"}, allEntries = true)
    public void deleteMenuManage(MenuDto vo) {
        menuRepository.deleteById(vo.getMenuNo());
    }

    @CacheEvict(value = {"allMenus", "menuHierarchy"}, allEntries = true)
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
            menuRepository.deleteAllById(ids);
        }
    }

    private MenuDto toDto(Menu menu) {
        // Simple mapping
        return MenuDto.builder()
                .menuNo(menu.getId())
                .id(menu.getId())
                .menuNm(menu.getMenuNm())
                .progrmFileNm(menu.getProgrmFileNm())
                .upperMenuNo(menu.getUpperMenuNo())
                .upperMenuId(menu.getUpperMenuNo())
                .menuOrdr(menu.getMenuOrdr())
                .menuDc(menu.getMenuDc())
                .relateImagePath(menu.getRelateImagePath())
                .relateImageNm(menu.getRelateImageNm())
                .build();
    }
}
