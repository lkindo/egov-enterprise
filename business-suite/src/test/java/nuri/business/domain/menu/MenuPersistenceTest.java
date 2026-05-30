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
                .id(9999L)
                .menuNm("테스트 메뉴")
                .menuOrdr(1)
                .upMenuSn(0L)
                .build();

        // when: Save
        menuRepository.save(menu);
        menuRepository.flush();
        entityManager.clear();

        // then: Find
        Menu saved = menuRepository.findById(9999L).orElseThrow();
        assertThat(saved.getMenuNm()).isEqualTo("테스트 메뉴");

        // when: Update
        saved.update("수정된 메뉴", "file.do", 0L, 2, "Menu DC", "path", "image.png");
        menuRepository.save(saved);
        menuRepository.flush();
        entityManager.clear();

        // then: Verify Update
        Menu updated = menuRepository.findById(9999L).orElseThrow();
        assertThat(updated.getMenuNm()).isEqualTo("수정된 메뉴");
        assertThat(updated.getMenuOrdr()).isEqualTo(2);
    }

    @Test
    @DisplayName("메뉴 검색 기능 테스트")
    void searchMenus() {
        // given
        menuRepository.save(Menu.builder()
                .id(1000L)
                .menuNm("시스템 관리")
                .menuOrdr(1)
                .upMenuSn(0L)
                .build());
        menuRepository.save(Menu.builder()
                .id(1001L)
                .menuNm("사용자 관리")
                .menuOrdr(2)
                .upMenuSn(1000L)
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
