package com.company.project.integration;

import com.company.project.config.MinimalTestConfig;
import com.company.project.service.menu.MenuService;
import com.company.project.service.menu.dto.MenuDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = MinimalTestConfig.class)
@Transactional
@ActiveProfiles("test")
public class MenuIntegrationTest {

    @Autowired
    private MenuService menuService;

    @Test
    @DisplayName("메뉴 관�?CRUD ?�스??)
    @WithMockUser(roles = "ADMIN")
    void menuManageIntegrationTest() {
        // 1. ?�록
        MenuDto dto = MenuDto.builder()
                .menuNo(9999L)
                .menuNm("?�스?�메??)
                .progrmFileNm("testProgram")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .menuDc("?�스?�메?�설�?)
                .build();
        menuService.insertMenuManage(dto);

        // 2. ?�세 조회
        MenuDto result = menuService.selectMenuManage(9999L);
        assertThat(result).isNotNull();
        assertThat(result.getMenuNm()).isEqualTo("?�스?�메??);

        // 3. ?�정
        result.setMenuNm("?�스?�메?�수??);
        menuService.updateMenuManage(result);
        MenuDto updated = menuService.selectMenuManage(9999L);
        assertThat(updated.getMenuNm()).isEqualTo("?�스?�메?�수??);

        // 4. 목록 조회
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword("?�스??);
        searchVO.setPageIndex(1);
        searchVO.setRecordCountPerPage(10);
        List<MenuDto> list = menuService.selectMenuManageList(searchVO);
        assertThat(list).isNotEmpty();

        // 5. ??��
        menuService.deleteMenuManage(updated);
        MenuDto deleted = menuService.selectMenuManage(9999L);
        assertThat(deleted).isNull();
    }

    @Test
    @DisplayName("메뉴 계층 구조 조회 ?�스??)
    @WithMockUser(roles = "ADMIN")
    void menuHierarchyIntegrationTest() {
        // 부�?메뉴 ?�록
        MenuDto parent = MenuDto.builder()
                .menuNo(8888L)
                .menuNm("부모메??)
                .progrmFileNm("parentProg")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .build();
        menuService.insertMenuManage(parent);

        // ?�식 메뉴 ?�록
        MenuDto child = MenuDto.builder()
                .menuNo(8889L)
                .menuNm("?�식메뉴")
                .progrmFileNm("childProg")
                .upperMenuNo(8888L)
                .menuOrdr(1)
                .build();
        menuService.insertMenuManage(child);

        // 계층 조회
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();
        assertThat(hierarchy).isNotEmpty();

        boolean found = false;
        for (MenuDto root : hierarchy) {
            if (root.getId().equals(8888L)) {
                assertThat(root.getChildren()).isNotEmpty();
                assertThat(root.getChildren().get(0).getId()).isEqualTo(8889L);
                found = true;
                break;
            }
        }
        assertThat(found).isTrue();
    }
}
