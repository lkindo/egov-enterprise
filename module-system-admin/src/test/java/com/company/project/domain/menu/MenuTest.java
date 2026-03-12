package com.company.project.domain.menu;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Menu 엔티티 테스트")
class MenuTest {

    @Test
    @DisplayName("Menu 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        Menu menu = Menu.builder()
                .id(1L)
                .menuNm("System Management")
                .modernRoute("/admin/system")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .build();

        assertThat(menu.getId()).isEqualTo(1L);
        assertThat(menu.getMenuNm()).isEqualTo("System Management");
        assertThat(menu.getModernRoute()).isEqualTo("/admin/system");
        assertThat(menu.getUpperMenuNo()).isEqualTo(0L);
        assertThat(menu.getMenuOrdr()).isEqualTo(1);
    }

    @Test
    @DisplayName("Menu 엔티티 정보 수정 테스트")
    void updateTest() {
        Menu menu = Menu.builder()
                .id(1L)
                .menuNm("Old Name")
                .build();

        menu.updateWithModernRoute("New Name", "progrm.jsp", 0L, 2, "Desc", "path", "image", "/new-route");

        assertThat(menu.getMenuNm()).isEqualTo("New Name");
        assertThat(menu.getModernRoute()).isEqualTo("/new-route");
        assertThat(menu.getMenuOrdr()).isEqualTo(2);
    }
}
