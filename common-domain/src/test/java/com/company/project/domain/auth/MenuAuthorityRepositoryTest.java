package com.company.project.domain.auth;

import com.company.project.TestJpaConfig;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("MenuAuthorityRepository 테스트")
class MenuAuthorityRepositoryTest {

        @Autowired
        private MenuAuthorityRepository menuAuthorityRepository;

        @Autowired
        private MenuRepository menuRepository;

        @Autowired
        private AuthorityRepository authorityRepository;

        @Test
        @DisplayName("메뉴 권한 저장 및 조회 확인")
        void saveAndFindById() {
                // Given
                MenuAuthority.MenuAuthorityId id = MenuAuthority.MenuAuthorityId.builder()
                                .authorCode("AUTH_001")
                                .menuNo(1L)
                                .build();
                MenuAuthority menuAuth = MenuAuthority.builder()
                                .id(id)
                                .mapngCreatId("MAP_001")
                                .build();

                // When
                menuAuthorityRepository.save(menuAuth);
                Optional<MenuAuthority> found = menuAuthorityRepository.findById(id);

                // Then
                assertThat(found).isPresent();
                assertThat(found.get().getMapngCreatId()).isEqualTo("MAP_001");
        }

        @Test
        @DisplayName("메뉴 생성 목록 조회 (Left Join) 확인")
        void selectMenuCreatList() {
                // Given
                menuRepository.save(Menu.builder().id(10L).menuNm("Main Menu").menuOrdr(1).build());
                menuRepository.save(Menu.builder().id(20L).menuNm("Sub Menu").menuOrdr(2).build());

                menuAuthorityRepository.save(MenuAuthority.builder()
                                .id(new MenuAuthority.MenuAuthorityId("AUTH_USER", 10L))
                                .build());

                // When
                List<MenuAuthorityProjection> result = menuAuthorityRepository.selectMenuCreatList("AUTH_USER");

                // Then
                assertThat(result).hasSize(2);
                assertThat(result.stream().filter(m -> m.getMenuNo().equals(10L)).findFirst().get().getRegYn())
                                .isEqualTo("Y");
                assertThat(result.stream().filter(m -> m.getMenuNo().equals(20L)).findFirst().get().getRegYn())
                                .isEqualTo("N");
        }

        @Test
        @DisplayName("메뉴 생성 관리 목록 조회 (Subquery) 확인")
        void selectMenuCreatManagList() {
                // Given
                authorityRepository.save(Authority.builder().authorCode("AUTH_001").authorNm("Admin Auth").build());
                authorityRepository.save(Authority.builder().authorCode("AUTH_002").authorNm("User Auth").build());

                menuAuthorityRepository.save(MenuAuthority.builder()
                                .id(new MenuAuthority.MenuAuthorityId("AUTH_001", 1L))
                                .build());
                menuAuthorityRepository.save(MenuAuthority.builder()
                                .id(new MenuAuthority.MenuAuthorityId("AUTH_001", 2L))
                                .build());

                // When
                Page<MenuCreatManageProjection> result = menuAuthorityRepository.selectMenuCreatManagList("Admin",
                                PageRequest.of(0, 10));

                // Then
                assertThat(result.getContent()).hasSize(1);
                assertThat(result.getContent().get(0).getAuthorCode()).isEqualTo("AUTH_001");
                assertThat(result.getContent().get(0).getChkYeoBu()).isEqualTo(2L);
        }
}
