package com.company.project.domain.menu;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MenuEntityTest {

    @Test
    @DisplayName("Menu 엔티티 생성 및 필드 매핑 테스트")
    void menuCreationTest() {
        Menu menu = Menu.builder()
                .id(100L) // Field name is id
                .menuNm("System Admin")
                .upperMenuNo(0L)
                .relateImagePath("/images/admin.png")
                .menuOrdr(1)
                .build();

        assertThat(menu.getId()).isEqualTo(100L);
        assertThat(menu.getMenuNm()).isEqualTo("System Admin");
        assertThat(menu.getRelateImagePath()).isEqualTo("/images/admin.png");
    }
}
