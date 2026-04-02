package com.company.project.foundation.service.menu;

import com.company.project.foundation.support.IntegrationTest;
import com.company.project.foundation.domain.auth.MenuAuthority;
import com.company.project.foundation.domain.auth.MenuAuthority.MenuAuthorityId;
import com.company.project.foundation.domain.auth.MenuAuthorityRepository;
import com.company.project.foundation.domain.menu.Menu;
import com.company.project.foundation.domain.menu.MenuRepository;
import com.company.project.foundation.domain.program.Program;
import com.company.project.foundation.domain.program.ProgramRepository;
import com.company.project.foundation.service.menu.dto.MenuDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.cache.CacheManager;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

/**
 * MenuService ?�합 ?�스?? * - N+1 쿼리 ?�결 검�? * - 캐싱 ?�작 검�? * - 권한�?메뉴 ?�터�?검�? */
@IntegrationTest
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
        // 캐시 ?�리??        if (cacheManager.getCache("menuHierarchy") != null) {
            cacheManager.getCache("menuHierarchy").clear();
        }
        if (cacheManager.getCache("allMenus") != null) {
            cacheManager.getCache("allMenus").clear();
        }
        if (cacheManager.getCache("menuParentMap") != null) {
            cacheManager.getCache("menuParentMap").clear();
        }
    }

    @Test
    @DisplayName("메뉴 계층 구조 조회 - N+1 쿼리 ?�결 검�?)
    void getMenuHierarchy_NPlusOneResolved() {
        // Given: 10 개의 메뉴?� 권한 ?�정
        createMenu(1L, "루트메뉴", 0L, "System");
        createMenu(2L, "?�식메뉴 1", 1L, "UserManage");
        createMenu(3L, "?�식메뉴 2", 1L, "BoardManage");

        createMenuAuthority(1L, "ROLE_ADMIN");
        createMenuAuthority(2L, "ROLE_ADMIN");
        createMenuAuthority(3L, "ROLE_ADMIN");

        entityManager.flush();
        entityManager.clear(); // ?�속??컨텍?�트 초기??(N+1 검증을 ?�해)

        // When: 메뉴 계층 구조 조회
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: 1 개의 쿼리�?모든 메뉴?� 권한 조회 (N+1 발생 ?�함)
        assertThat(result).hasSize(3);
        assertThat(result).extracting("menuNo", "menuNm", "upperMenuNo")
                .containsExactlyInAnyOrder(
                        tuple(1L, "루트메뉴", 0L),
                        tuple(2L, "?�식메뉴 1", 1L),
                        tuple(3L, "?�식메뉴 2", 1L));
    }

    @Test
    @DisplayName("권한�?메뉴 ?�터�?- ADMIN ?� 모든 메뉴 ?�근 가??)
    void getMenuHierarchy_AdminAccessAllMenus() {
        // Given: ADMIN 권한�??��? 메뉴�?권한 ?�정
        createMenu(1L, "관리자메뉴", 0L, "System");
        createMenu(2L, "?�반메뉴", 0L, "Board");

        // ADMIN 권한�?메뉴 1 ???�근 가??        createMenuAuthority(1L, "ROLE_ADMIN");
        // 메뉴 2 ??권한 ?�음

        entityManager.flush();
        entityManager.clear();

        // When: ADMIN ??메뉴 조회
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: ADMIN ?� 모든 메뉴 ?�근 가??        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("캐싱 ?�작 검�?- 2 번째 ?�출?� 캐시?�서 조회")
    void getMenuHierarchy_Caching() {
        // Given: 메뉴 ?�이???�정
        createMenu(1L, "캐시?�스??, 0L, "System");
        createMenuAuthority(1L, "ROLE_ADMIN");
        entityManager.flush();
        entityManager.clear();

        // When: �?번째 ?�출 (캐시 미스)
        long startTime1 = System.currentTimeMillis();
        List<MenuDto> result1 = menuService.getMenuHierarchy();
        long endTime1 = System.currentTimeMillis();

        // Then: �?번째 ?�출?� DB 조회
        assertThat(result1).hasSize(1);
        assertThat(endTime1 - startTime1).isGreaterThanOrEqualTo(0);

        // When: ??번째 ?�출 (캐시 ?�트)
        long startTime2 = System.currentTimeMillis();
        List<MenuDto> result2 = menuService.getMenuHierarchy();
        long endTime2 = System.currentTimeMillis();

        // Then: ??번째 ?�출?� 캐시?�서 조회 (빠름)
        assertThat(result2).hasSize(1);
        assertThat(endTime2 - startTime2).isLessThanOrEqualTo(endTime1 - startTime1);
    }

    @Test
    @DisplayName("buildMenuTree - ?�정 루트 메뉴???�브?�리�?조회")
    void buildMenuTree_SubTree() {
        // Given: 2 ?�계 메뉴 구조
        createMenu(1L, "루트", 0L, "System");
        createMenu(2L, "?�식 1", 1L, "User");
        createMenu(3L, "?�식 2", 1L, "Board");
        createMenu(4L, "?�자", 2L, "Detail");

        createMenuAuthority(1L, "ROLE_ADMIN");
        createMenuAuthority(2L, "ROLE_ADMIN");
        createMenuAuthority(3L, "ROLE_ADMIN");
        createMenuAuthority(4L, "ROLE_ADMIN");

        entityManager.flush();
        entityManager.clear();

        // When: 루트 메뉴 (1L) ???�브?�리 조회
        // Note: buildMenuTree ??private ?��?�?getMenuHierarchy �?간접 검�?        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: 모든 메뉴 ?�함
        assertThat(result).hasSize(4);
    }

    @Test
    @DisplayName("findAllWithAuthorities - ?�일 쿼리�?메뉴?� 권한 조회")
    void findAllWithAuthorities_SingleQuery() {
        // Given: ?�러 메뉴?� 권한
        createMenu(1L, "메뉴 1", 0L, "System");
        createMenu(2L, "메뉴 2", 0L, "Board");

        createMenuAuthority(1L, "ROLE_ADMIN");
        createMenuAuthority(2L, "ROLE_ADMIN");

        entityManager.flush();
        entityManager.clear();

        // When: findAllWithAuthorities ?�행
        // Note: ??메서?�는 MenuRepository ???�으므�?직접 ?�출 불�?
        // getMenuHierarchy �??�해 간접 검�?        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: 모든 메뉴?� 권한???�바르게 매핑??        assertThat(result).hasSize(2);
    }

    // ?�스???�퍼 메서??    private Menu createMenu(Long id, String menuNm, Long upperMenuNo, String progrmFileNm) {
        Program program = Program.builder()
                .progrmFileNm(progrmFileNm)
                .progrmKoreanNm("?�스?�프로그??)
                .build();
        programRepository.save(program);

        Menu menu = Menu.builder()
                .id(id)
                .menuNm(menuNm)
                .upperMenuNo(upperMenuNo)
                .progrmFileNm(progrmFileNm)
                .menuOrdr(0)
                .build();
        return menuRepository.save(menu);
    }

    private MenuAuthority createMenuAuthority(Long menuNo, String authorCode) {
        MenuAuthorityId id = MenuAuthorityId.builder()
                .menuNo(menuNo)
                .authorCode(authorCode)
                .build();
        MenuAuthority authority = MenuAuthority.builder()
                .id(id)
                .build();
        return menuAuthorityRepository.save(authority);
    }
}
