package com.company.project.domain.menu;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MenuEntityTest {

    @Test
    @DisplayName("메뉴 정보 수정 테스트")
    void update_success() {
        // given
        Menu menu = Menu.builder()
                .id(1L)
                .menuNm("Old Name")
                .menuOrdr(1)
                .build();

        // when
        menu.update("New Name", "prog.jsp", 0L, 2, "Description", "/path/", "image.png");

        // then
        assertThat(menu.getMenuNm()).isEqualTo("New Name");
        assertThat(menu.getProgrmFileNm()).isEqualTo("prog.jsp");
        assertThat(menu.getMenuOrdr()).isEqualTo(2);
    }

    @Test
    @DisplayName("현대적 라우트 업데이트 테스트")
    void updateModernRoute_success() {
        // given
        Menu menu = Menu.builder().id(1L).build();

        // when
        menu.updateModernRoute("/admin/new-route");

        // then
        assertThat(menu.getModernRoute()).isEqualTo("/admin/new-route");
    }

    @Test
    @DisplayName("현대적 라우트 포함 전체 수정 테스트")
    void updateWithModernRoute_success() {
        // given
        Menu menu = Menu.builder().id(1L).build();

        // when
        menu.updateWithModernRoute("Name", "file", 0L, 1, "Dc", "path", "img", "/modern");

        // then
        assertThat(menu.getModernRoute()).isEqualTo("/modern");
        assertThat(menu.getMenuNm()).isEqualTo("Name");
    }
}
