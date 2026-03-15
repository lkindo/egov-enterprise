package com.company.project.domain.menu;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Menu 엔티티 테스트")
class MenuEntityTest {

    @Test
    @DisplayName("메뉴 정보 수정 테스트")
    void updateTest() {
        Menu menu = Menu.builder()
                .id(1L)
                .menuNm("Old Menu")
                .menuOrdr(1)
                .build();
        
        menu.update("New Menu", "prog1", 0L, 2, "Desc", "/path", "image");
        
        assertThat(menu.getMenuNm()).isEqualTo("New Menu");
        assertThat(menu.getMenuOrdr()).isEqualTo(2);
        assertThat(menu.getProgrmFileNm()).isEqualTo("prog1");
    }

    @Test
    @DisplayName("모던 라우트 업데이트 테스트")
    void updateModernRouteTest() {
        Menu menu = Menu.builder().id(1L).build();
        menu.updateModernRoute("/admin/new-route");
        assertThat(menu.getModernRoute()).isEqualTo("/admin/new-route");
    }

    @Test
    @DisplayName("전체 정보 수정 테스트 (모던 라우트 포함)")
    void updateWithModernRouteTest() {
        Menu menu = Menu.builder().id(1L).menuNm("Old").build();
        
        menu.updateWithModernRoute("New", "prog2", 10L, 5, "D", "P", "I", "/modern");
        
        assertThat(menu.getMenuNm()).isEqualTo("New");
        assertThat(menu.getModernRoute()).isEqualTo("/modern");
        assertThat(menu.getUpperMenuNo()).isEqualTo(10L);
    }
}
