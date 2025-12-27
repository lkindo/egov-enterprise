package com.company.project.service.menu;

import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.service.menu.dto.MenuDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final ProgramRepository programRepository;

    public List<MenuDto> getMenuHierarchy() {
        List<Menu> menus = menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
        List<Program> programs = programRepository.findAll();
        Map<String, Program> programMap = programs.stream()
                .collect(Collectors.toMap(Program::getProgrmFileNm, Function.identity(), (a, b) -> a));

        Map<Long, MenuDto> menuMap = new LinkedHashMap<>();
        List<MenuDto> rootMenus = new ArrayList<>();

        for (Menu menu : menus) {
            String url = "/";
            if (menu.getProgrmFileNm() != null && programMap.containsKey(menu.getProgrmFileNm())) {
                url = programMap.get(menu.getProgrmFileNm()).getUrl();
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
        // 1. Exact match first
        return programRepository.findByUrl(url)
                .map(Program::getProgrmFileNm)
                .orElseGet(() -> {
                    // 2. Try match without parameters if original has them
                    if (url.contains("?")) {
                        String baseUrl = url.substring(0, url.indexOf("?"));
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
        List<Menu> menus = menuRepository.findAll();
        for (Menu menu : menus) {
            if (progrmFileNm.equals(menu.getProgrmFileNm())) {
                Long currentId = menu.getId();
                Long upperId = menu.getUpperMenuNo();
                while (upperId != null && upperId != 0) {
                    final Long finalUpperId = upperId;
                    Menu upper = menus.stream().filter(m -> m.getId().equals(finalUpperId)).findFirst().orElse(null);
                    if (upper == null)
                        break;
                    currentId = upper.getId();
                    upperId = upper.getUpperMenuNo();
                }
                return currentId;
            }
        }
        return null;
    }
}
