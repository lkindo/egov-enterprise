package nuri.business.domain.menu;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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
        // given — [2026-10-04 프로그램 목록 퇴역] 프로그램 엔티티와 메뉴의 연관을 걷었다. 연결 프로그램 컬럼은 단순 문자열이다.
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
        saved.update("수정된 메뉴", 0L, 2, "Menu DC", "path", "image.png", "Y");
        menuRepository.save(saved);
        menuRepository.flush();
        entityManager.clear();

        // then: Verify Update
        Menu updated = menuRepository.findById(menuSn).orElseThrow();
        assertThat(updated.getMenuNm()).isEqualTo("수정된 메뉴");
        assertThat(updated.getMenuOrdr()).isEqualTo(2);
        assertThat(updated.getMenuExpln()).isEqualTo("Menu DC");
    }
}
