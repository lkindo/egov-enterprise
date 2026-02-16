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
    @DisplayName("메뉴 관리 CRUD 테스트")
    @WithMockUser(roles = "ADMIN")
    void menuManageIntegrationTest() {
        // 1. 등록
        MenuDto dto = MenuDto.builder()
                .menuNo(9999L)
                .menuNm("테스트메뉴")
                .progrmFileNm("testProgram")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .menuDc("테스트메뉴설명")
                .build();
        menuService.insertMenuManage(dto);

        // 2. 상세 조회
        MenuDto result = menuService.selectMenuManage(9999L);
        assertThat(result).isNotNull();
        assertThat(result.getMenuNm()).isEqualTo("테스트메뉴");

        // 3. 수정
        result.setMenuNm("테스트메뉴수정");
        menuService.updateMenuManage(result);
        MenuDto updated = menuService.selectMenuManage(9999L);
        assertThat(updated.getMenuNm()).isEqualTo("테스트메뉴수정");

        // 4. 목록 조회
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword("테스트");
        searchVO.setPageIndex(1);
        searchVO.setRecordCountPerPage(10);
        List<MenuDto> list = menuService.selectMenuManageList(searchVO);
        assertThat(list).isNotEmpty();

        // 5. 삭제
        menuService.deleteMenuManage(updated);
        MenuDto deleted = menuService.selectMenuManage(9999L);
        assertThat(deleted).isNull();
    }

    @Test
    @DisplayName("메뉴 계층 구조 조회 테스트")
    @WithMockUser(roles = "ADMIN")
    void menuHierarchyIntegrationTest() {
        // 부모 메뉴 등록
        MenuDto parent = MenuDto.builder()
                .menuNo(8888L)
                .menuNm("부모메뉴")
                .progrmFileNm("parentProg")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .build();
        menuService.insertMenuManage(parent);

        // 자식 메뉴 등록
        MenuDto child = MenuDto.builder()
                .menuNo(8889L)
                .menuNm("자식메뉴")
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
