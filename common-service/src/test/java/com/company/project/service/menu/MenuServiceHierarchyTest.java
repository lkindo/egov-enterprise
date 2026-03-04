package com.company.project.service.menu;

import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.service.menu.dto.MenuDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class MenuServiceHierarchyTest {

    @Mock private MenuRepository menuRepository;
    @Mock private ProgramRepository programRepository;
    @Mock private MenuAuthorityRepository menuAuthorityRepository;

    @InjectMocks
    private MenuService menuService;

    @Test
    @DisplayName("메뉴 계층 구조 생성 테스트 (부모-자식 트리 변환)")
    void getMenuHierarchyTest() {
        // Given: 1(Root) -> 11(Child), 12(Child) / 2(Root)
        List<Menu> mockMenus = new ArrayList<>();
        mockMenus.add(createMenu(1L, "Root 1", 0L, 1));
        mockMenus.add(createMenu(11L, "Child 1-1", 1L, 1));
        mockMenus.add(createMenu(12L, "Child 1-2", 1L, 2));
        mockMenus.add(createMenu(2L, "Root 2", 0L, 2));

        given(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).willReturn(mockMenus);
        given(programRepository.findAll()).willReturn(new ArrayList<>()); // Empty programs

        // When
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();

        // Then
        assertThat(hierarchy).hasSize(2); // Root 1, Root 2

        MenuDto root1 = hierarchy.get(0);
        assertThat(root1.getMenuNm()).isEqualTo("Root 1");
        assertThat(root1.getChildren()).hasSize(2);
        assertThat(root1.getChildren().get(0).getMenuNm()).isEqualTo("Child 1-1");
        assertThat(root1.getChildren().get(1).getMenuNm()).isEqualTo("Child 1-2");

        MenuDto root2 = hierarchy.get(1);
        assertThat(root2.getMenuNm()).isEqualTo("Root 2");
        assertThat(root2.getChildren()).isEmpty();
    }

    private Menu createMenu(Long id, String nm, Long upperNo, int ordr) {
        return Menu.builder()
                .id(id)
                .menuNm(nm)
                .upperMenuNo(upperNo)
                .menuOrdr(ordr)
                .build();
    }
}
