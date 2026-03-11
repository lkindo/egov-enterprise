package com.company.project.domain.menu;

import com.company.project.config.TestQueryDslConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestQueryDslConfig.class)
@ActiveProfiles("test")
class MenuRepositoryTest {

    @Autowired
    private MenuRepository menuRepository;

    @Test
    @DisplayName("메뉴 이름으로 검색 테스트")
    void searchMenus_success() {
        // given
        Menu menu1 = Menu.builder()
                .id(1L)
                .menuNm("시스템 관리")
                .menuOrdr(1)
                .build();
        Menu menu2 = Menu.builder()
                .id(2L)
                .menuNm("사용자 관리")
                .menuOrdr(2)
                .build();
        menuRepository.save(menu1);
        menuRepository.save(menu2);

        // when
        Page<Menu> result = menuRepository.searchMenus("시스템", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getMenuNm()).isEqualTo("시스템 관리");
    }
}
