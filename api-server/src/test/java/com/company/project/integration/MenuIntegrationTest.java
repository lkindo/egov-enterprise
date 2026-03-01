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
    @DisplayName("ë©”ë‰´ ê´€ë¦?CRUD ?ŒìŠ¤??)
    @WithMockUser(roles = "ADMIN")
    void menuManageIntegrationTest() {
        // 1. ?±ë¡
        MenuDto dto = MenuDto.builder()
                .menuNo(9999L)
                .menuNm("?ŒìŠ¤?¸ë©”??)
                .progrmFileNm("testProgram")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .menuDc("?ŒìŠ¤?¸ë©”?´ì„¤ëª?)
                .build();
        menuService.insertMenuManage(dto);

        // 2. ?ì„¸ ì¡°íšŒ
        MenuDto result = menuService.selectMenuManage(9999L);
        assertThat(result).isNotNull();
        assertThat(result.getMenuNm()).isEqualTo("?ŒìŠ¤?¸ë©”??);

        // 3. ?˜ì •
        result.setMenuNm("?ŒìŠ¤?¸ë©”?´ìˆ˜??);
        menuService.updateMenuManage(result);
        MenuDto updated = menuService.selectMenuManage(9999L);
        assertThat(updated.getMenuNm()).isEqualTo("?ŒìŠ¤?¸ë©”?´ìˆ˜??);

        // 4. ëª©ë¡ ì¡°íšŒ
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword("?ŒìŠ¤??);
        searchVO.setPageIndex(1);
        searchVO.setRecordCountPerPage(10);
        List<MenuDto> list = menuService.selectMenuManageList(searchVO);
        assertThat(list).isNotEmpty();

        // 5. ?? œ
        menuService.deleteMenuManage(updated);
        MenuDto deleted = menuService.selectMenuManage(9999L);
        assertThat(deleted).isNull();
    }

    @Test
    @DisplayName("ë©”ë‰´ ê³„ì¸µ êµ¬ì¡° ì¡°íšŒ ?ŒìŠ¤??)
    @WithMockUser(roles = "ADMIN")
    void menuHierarchyIntegrationTest() {
        // ë¶€ëª?ë©”ë‰´ ?±ë¡
        MenuDto parent = MenuDto.builder()
                .menuNo(8888L)
                .menuNm("ë¶€ëª¨ë©”??)
                .progrmFileNm("parentProg")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .build();
        menuService.insertMenuManage(parent);

        // ?ì‹ ë©”ë‰´ ?±ë¡
        MenuDto child = MenuDto.builder()
                .menuNo(8889L)
                .menuNm("?ì‹ë©”ë‰´")
                .progrmFileNm("childProg")
                .upperMenuNo(8888L)
                .menuOrdr(1)
                .build();
        menuService.insertMenuManage(child);

        // ê³„ì¸µ ì¡°íšŒ
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
