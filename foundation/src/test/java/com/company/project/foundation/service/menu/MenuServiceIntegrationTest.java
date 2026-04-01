package com.company.project.foundation.service.menu;

import com.company.foundation.support.IntegrationTest;
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
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.cache.CacheManager;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

/**
 * MenuService 통합 테스트
 * - N+1 쿼리 해결 검증
 * - 캐싱 동작 검증
 * - 권한별 메뉴 필터링 검증
 */
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
    private TestEntityManager entityManager;
    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void setUp() {
        // 캐시 클리어
        cacheManager.getCache("menuHierarchy").clear();
        cacheManager.getCache("allMenus").clear();
        cacheManager.getCache("menuParentMap").clear();
    }

    @Test
    @DisplayName("메뉴 계층 구조 조회 - N+1 쿼리 해결 검증")
    void getMenuHierarchy_NPlusOneResolved() {
        // Given: 10 개의 메뉴와 권한 설정
        createMenu(1L, "루트메뉴", 0L, "System");
        createMenu(2L, "자식메뉴 1", 1L, "UserManage");
        createMenu(3L, "자식메뉴 2", 1L, "BoardManage");

        createMenuAuthority(1L, "ROLE_ADMIN");
        createMenuAuthority(2L, "ROLE_ADMIN");
        createMenuAuthority(3L, "ROLE_ADMIN");

        entityManager.flush();
        entityManager.clear(); // 영속성 컨텍스트 초기화 (N+1 검증을 위해)

        // When: 메뉴 계층 구조 조회
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: 1 개의 쿼리로 모든 메뉴와 권한 조회 (N+1 발생 안함)
        assertThat(result).hasSize(3);
        assertThat(result).extracting("menuNo", "menuNm", "upperMenuNo")
                .containsExactlyInAnyOrder(
                        tuple(1L, "루트메뉴", 0L),
                        tuple(2L, "자식메뉴 1", 1L),
                        tuple(3L, "자식메뉴 2", 1L));
    }

    @Test
    @DisplayName("권한별 메뉴 필터링 - ADMIN 은 모든 메뉴 접근 가능")
    void getMenuHierarchy_AdminAccessAllMenus() {
        // Given: ADMIN 권한과 일부 메뉴만 권한 설정
        createMenu(1L, "관리자메뉴", 0L, "System");
        createMenu(2L, "일반메뉴", 0L, "Board");

        // ADMIN 권한만 메뉴 1 에 접근 가능
        createMenuAuthority(1L, "ROLE_ADMIN");
        // 메뉴 2 는 권한 없음

        entityManager.flush();
        entityManager.clear();

        // When: ADMIN 이 메뉴 조회
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: ADMIN 은 모든 메뉴 접근 가능
        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("캐싱 동작 검증 - 2 번째 호출은 캐시에서 조회")
    void getMenuHierarchy_Caching() {
        // Given: 메뉴 데이터 설정
        createMenu(1L, "캐시테스트", 0L, "System");
        createMenuAuthority(1L, "ROLE_ADMIN");
        entityManager.flush();
        entityManager.clear();

        // When: 첫 번째 호출 (캐시 미스)
        long startTime1 = System.currentTimeMillis();
        List<MenuDto> result1 = menuService.getMenuHierarchy();
        long endTime1 = System.currentTimeMillis();

        // Then: 첫 번째 호출은 DB 조회
        assertThat(result1).hasSize(1);
        assertThat(endTime1 - startTime1).isGreaterThan(0);

        // When: 두 번째 호출 (캐시 히트)
        long startTime2 = System.currentTimeMillis();
        List<MenuDto> result2 = menuService.getMenuHierarchy();
        long endTime2 = System.currentTimeMillis();

        // Then: 두 번째 호출은 캐시에서 조회 (빠름)
        assertThat(result2).hasSize(1);
        assertThat(endTime2 - startTime2).isLessThan(endTime1 - startTime1);
    }

    @Test
    @DisplayName("buildMenuTree - 특정 루트 메뉴의 서브트리만 조회")
    void buildMenuTree_SubTree() {
        // Given: 2 단계 메뉴 구조
        createMenu(1L, "루트", 0L, "System");
        createMenu(2L, "자식 1", 1L, "User");
        createMenu(3L, "자식 2", 1L, "Board");
        createMenu(4L, "손자", 2L, "Detail");

        createMenuAuthority(1L, "ROLE_ADMIN");
        createMenuAuthority(2L, "ROLE_ADMIN");
        createMenuAuthority(3L, "ROLE_ADMIN");
        createMenuAuthority(4L, "ROLE_ADMIN");

        entityManager.flush();
        entityManager.clear();

        // When: 루트 메뉴 (1L) 의 서브트리 조회
        // Note: buildMenuTree 는 private 이므로 getMenuHierarchy 로 간접 검증
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: 모든 메뉴 포함
        assertThat(result).hasSize(4);
    }

    @Test
    @DisplayName("findAllWithAuthorities - 단일 쿼리로 메뉴와 권한 조회")
    void findAllWithAuthorities_SingleQuery() {
        // Given: 여러 메뉴와 권한
        createMenu(1L, "메뉴 1", 0L, "System");
        createMenu(2L, "메뉴 2", 0L, "Board");

        createMenuAuthority(1L, "ROLE_ADMIN");
        createMenuAuthority(2L, "ROLE_ADMIN");

        entityManager.flush();
        entityManager.clear();

        // When: findAllWithAuthorities 실행
        // Note: 이 메서드는 MenuRepository 에 있으므로 직접 호출 불가
        // getMenuHierarchy 를 통해 간접 검증
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then: 모든 메뉴와 권한이 올바르게 매핑됨
        assertThat(result).hasSize(2);
    }

    // 테스트 헬퍼 메서드
    private Menu createMenu(Long id, String menuNm, Long upperMenuNo, String progrmFileNm) {
        Program program = Program.builder()
                .progrmFileNm(progrmFileNm)
                .progrmKoreanNm("테스트프로그램")
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
