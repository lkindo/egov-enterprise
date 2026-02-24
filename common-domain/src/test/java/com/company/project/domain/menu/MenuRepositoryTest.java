package com.company.project.domain.menu;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.AuthorityRepository;
import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.config.QuerydslConfig;
import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(QuerydslConfig.class)
@ActiveProfiles("test")
public class MenuRepositoryTest {

        @Autowired
        private MenuRepository menuRepository;

        @Autowired
        private ProgramRepository programRepository;

        @Autowired
        private AuthorityRepository authorityRepository;

        @Autowired
        private UserAuthorityRepository userAuthorityRepository;

        @Autowired
        private MenuAuthorityRepository menuAuthorityRepository;

        @BeforeEach
        void setUp() {
                // 1. 프로그램 정보 등록
                programRepository.save(java.util.Objects.requireNonNull(Program.builder()
                                .progrmFileNm("mainProg")
                                .progrmKoreanNm("Main Program")
                                .url("/main/test.do")
                                .build()));

                // 2. 권한 정보 등록
                authorityRepository.save(java.util.Objects.requireNonNull(Authority.builder()
                                .authorCode("AUTH_USER")
                                .authorNm("사용자 권한")
                                .authorDc("일반 사용자용 권한")
                                .build()));

                // 3. 사용자 권한 매핑(uniqId -> authorCode)
                userAuthorityRepository.save(java.util.Objects.requireNonNull(UserAuthority.builder()
                                .uniqId("USR01")
                                .authorCode("AUTH_USER")
                                .build()));

                // 4. 메뉴 정보 등록
                menuRepository.save(java.util.Objects.requireNonNull(Menu.builder()
                                .id(100L)
                                .menuNm("Root Menu")
                                .upperMenuNo(0L)
                                .menuOrdr(1)
                                .progrmFileNm("mainProg")
                                .build()));

                // 5. 메뉴 권한 설정
                menuAuthorityRepository.save(java.util.Objects.requireNonNull(MenuAuthority.builder()
                                .id(MenuAuthority.MenuAuthorityId.builder()
                                                .menuNo(100L)
                                                .authorCode("AUTH_USER")
                                                .build())
                                .build()));
        }

        @Test
        @DisplayName("메뉴 명으로 검색 성공")
        void searchMenus() {
                Page<Menu> result = menuRepository.searchMenus("Root", PageRequest.of(0, 10));
                assertThat(result.getContent()).hasSize(1);
                assertThat(result.getContent().get(0).getMenuNm()).isEqualTo("Root Menu");
        }

        @Test
        @DisplayName("사용자 ID 기반 헤더 메뉴 조회 (권한 및 프로그램 Join 확인)")
        void selectMainMenuHead() {
                List<MenuProjection> result = menuRepository.selectMainMenuHead("USR01");

                assertThat(result).isNotEmpty();
                assertThat(result.get(0).getMenuNm()).isEqualTo("Root Menu");
                assertThat(result.get(0).getChkURL()).isEqualTo("/main/test.do"); // Program Join 확인
        }

        @Test
        @DisplayName("modern_route 업데이트 및 조회")
        void updateAndFindByModernRoute() {
                // Given: modern_route 가 설정된 메뉴
                Menu menu = menuRepository.findById(100L).orElseThrow();
                menu.updateModernRoute("/admin/system/menus");
                menuRepository.save(menu);

                // When: modern_route 로 조회
                Menu found = menuRepository.findByModernRoute("/admin/system/menus").orElseThrow();

                // Then
                assertThat(found.getId()).isEqualTo(100L);
                assertThat(found.getMenuNm()).isEqualTo("Root Menu");
                assertThat(found.getModernRoute()).isEqualTo("/admin/system/menus");
                assertThat(found.getRouteUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("modern_route 가 없는 메뉴 조회")
        void findAllWithoutModernRoute() {
                // When: modern_route 가 설정되지 않은 메뉴 조회
                List<Menu> result = menuRepository.findAllWithoutModernRoute();

                // Then: 초기 상태이므로 모든 메뉴가 조회됨
                assertThat(result).isNotEmpty();
        }

        @Test
        @DisplayName("bulkUpdateModernRouteByPattern 으로 일괄 업데이트")
        void bulkUpdateByPattern() {
                // Given: 여러 메뉴 추가
                menuRepository.save(Menu.builder()
                        .id(101L)
                        .menuNm("User Management")
                        .upperMenuNo(0L)
                        .menuOrdr(2)
                        .progrmFileNm("EgovUserManage")
                        .build());

                menuRepository.save(Menu.builder()
                        .id(102L)
                        .menuNm("Member Management")
                        .upperMenuNo(0L)
                        .menuOrdr(3)
                        .progrmFileNm("EgovMberManage")
                        .build());

                // When: 패턴으로 일괄 업데이트
                int updated = menuRepository.bulkUpdateModernRouteByPattern("Egov%Manage", "/admin/user/manage");

                // Then
                assertThat(updated).isGreaterThan(0);

                List<Menu> updatedMenus = menuRepository.findAllById(List.of(101L, 102L));
                for (Menu m : updatedMenus) {
                        assertThat(m.getModernRoute()).isEqualTo("/admin/user/manage");
                }
        }

        @Test
        @DisplayName("modern_route 설정된 메뉴 수 카운트")
        void countWithModernRoute() {
                // Given: modern_route 업데이트
                Menu menu = menuRepository.findById(100L).orElseThrow();
                menu.updateModernRoute("/admin/test");
                menuRepository.save(menu);

                // When: 카운트 조회
                long count = menuRepository.countWithModernRoute();

                // Then: 최소 1 개 이상
                assertThat(count).isGreaterThanOrEqualTo(1);
        }
}
