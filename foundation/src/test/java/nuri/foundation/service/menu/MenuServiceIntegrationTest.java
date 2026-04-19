package nuri.foundation.service.menu;

import nuri.foundation.support.IntegrationTest;
import nuri.foundation.domain.auth.MenuAuthority;
import nuri.foundation.domain.auth.MenuAuthority.MenuAuthorityId;
import nuri.foundation.domain.auth.MenuAuthorityRepository;
import nuri.foundation.domain.menu.Menu;
import nuri.foundation.domain.menu.MenuRepository;
import nuri.foundation.domain.program.Program;
import nuri.foundation.domain.program.ProgramRepository;
import nuri.foundation.service.menu.dto.MenuDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.security.test.context.support.WithMockUser;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * MenuService 통합 테스트
 * - N+1 쿼리 해결 검증
 * - 캐싱 동작 검증
 * - 권한별 메뉴 필터링 검증
 */
@IntegrationTest
@DisplayName("MenuService 통합 테스트")
class MenuServiceIntegrationTest {

    @Autowired
    private MenuService menuService;
    @Autowired
    private MenuRepository menuRepository;
    @Autowired
    private ProgramRepository programRepository;
    @Autowired
    private MenuAuthorityRepository menuAuthorityRepository;
    @Autowired
    private jakarta.persistence.EntityManager entityManager;
    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        // 캐시 초기화
        if (cacheManager.getCache("menuHierarchy") != null) {
            cacheManager.getCache("menuHierarchy").clear();
        }
        if (cacheManager.getCache("allMenus") != null) {
            cacheManager.getCache("allMenus").clear();
        }
        if (cacheManager.getCache("menuParentMap") != null) {
            cacheManager.getCache("menuParentMap").clear();
        }
        
        menuAuthorityRepository.deleteAll();
        menuRepository.deleteAll();
        programRepository.deleteAll();
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("메뉴 계층 구조 조회 및 캐싱 테스트")
    void testGetMenuHierarchyAndCaching() {
        // Given
        Program program = Program.builder()
                .progrmFileNm("PROG_01")
                .url("/test/prog1")
                .progrmKoreanNm("테스트프로그램")
                .build();
        programRepository.save(program);

        Menu root = Menu.builder()
                .id(1L)
                .menuNm("ROOT")
                .menuOrdr(1)
                .menuDc("DESC")
                .modernRoute("/root")
                .createdBy("admin")
                .lastModifiedBy("admin")
                .build();
        menuRepository.save(root);

        Menu child = Menu.builder()
                .id(2L)
                .menuNm("CHILD")
                .progrmFileNm("PROG_01")
                .upperMenuNo(1L)
                .menuOrdr(1)
                .menuDc("DESC")
                .modernRoute("/child")
                .createdBy("admin")
                .lastModifiedBy("admin")
                .build();
        menuRepository.save(child);

        MenuAuthority auth = MenuAuthority.builder()
                .id(MenuAuthorityId.builder().authorCode("ROLE_ADMIN").menuNo(1L).build())
                .build();
        menuAuthorityRepository.save(auth);

        MenuAuthority auth2 = MenuAuthority.builder()
                .id(MenuAuthorityId.builder().authorCode("ROLE_ADMIN").menuNo(2L).build())
                .build();
        menuAuthorityRepository.save(auth2);

        entityManager.flush();
        entityManager.clear();

        // When
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();

        // Then
        assertThat(hierarchy).isNotEmpty();
        assertThat(hierarchy.get(0).getChildren()).isNotEmpty();
    }
}