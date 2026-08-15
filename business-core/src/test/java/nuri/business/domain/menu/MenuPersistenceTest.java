package nuri.business.domain.menu;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import jakarta.persistence.EntityManager;

import static org.assertj.core.api.Assertions.assertThat;

class MenuPersistenceTest extends PersistenceTestSupport {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private MenuRepository menuRepository;

    @Test
    @DisplayName("메뉴 정보 CRUD 테스트")
    void menuCrud() {
        // given
        Menu menu = Menu.builder()
                .menuNm("테스트 메뉴")
                .menuOrdr(1)
                .build();

        // when: Save
        menuRepository.save(menu);
        menuRepository.flush();
        Long menuSn = menu.getMenuSn();
        assertThat(menuSn).isPositive();
        entityManager.clear();

        // then: Find
        Menu saved = menuRepository.findById(menuSn).orElseThrow();
        assertThat(saved.getMenuNm()).isEqualTo("테스트 메뉴");

        // when: Update
        saved.update("수정된 메뉴", "file.do", 0L, 2, "Menu DC", "path", "image.png", "Y");
        menuRepository.save(saved);
        menuRepository.flush();
        entityManager.clear();

        // then: Verify Update
        Menu updated = menuRepository.findById(menuSn).orElseThrow();
        assertThat(updated.getMenuNm()).isEqualTo("수정된 메뉴");
        assertThat(updated.getMenuOrdr()).isEqualTo(2);
    }

    @Test
    @DisplayName("메뉴 검색 기능 테스트")
    void searchMenus() {
        // given
        Menu parent = menuRepository.save(Menu.builder()
                .menuNm("시스템 관리")
                .menuOrdr(1)
                .build());
        menuRepository.save(Menu.builder()
                .menuNm("사용자 관리")
                .menuOrdr(2)
                .upMenuSn(parent.getMenuSn())
                .build());
        menuRepository.flush();
        entityManager.clear();

        // when
        Page<Menu> result = menuRepository.searchMenus("시스템", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getMenuNm()).isEqualTo("시스템 관리");
    }
}
