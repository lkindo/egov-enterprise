package egovframework.com.sym.mnu.mpm.service.impl;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

import java.util.Collections;
import java.util.Optional;

import org.egovframe.rte.fdl.excel.EgovExcelService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.sym.prm.service.impl.ProgrmManageDAO;

@ExtendWith(MockitoExtension.class)
class EgovMenuManageServiceTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private ProgrmManageDAO progrmManageDAO;

    @Mock
    private EgovExcelService excelZipService;

    @InjectMocks
    private EgovMenuManageServiceImpl menuManageService;

    @Test
    void selectMainMenuHead_shouldCallOptimizedMethod() throws Exception {
        // Given
        given(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(0L)).willReturn(Collections.emptyList());

        // When
        menuManageService.selectMainMenuHead(new MenuManageVO());

        // Then
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(0L);
        verify(menuRepository, never()).findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }

    @Test
    void selectMainMenuLeft_shouldCallOptimizedMethod() throws Exception {
        // Given
        MenuManageVO vo = new MenuManageVO();
        vo.setMenuNo(123);
        given(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(123L)).willReturn(Collections.emptyList());

        // When
        menuManageService.selectMainMenuLeft(vo);

        // Then
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(123L);
        verify(menuRepository, never()).findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }

    @Test
    void selectLastMenuURL_shouldCallOptimizedMethod() throws Exception {
        // Given
        Long menuId = 100L;
        Menu menu = Menu.builder()
            .id(menuId)
            .upperMenuNo(0L)
            .build();

        given(menuRepository.findById(menuId)).willReturn(Optional.of(menu));
        given(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(menuId)).willReturn(Collections.emptyList());

        // When
        menuManageService.selectLastMenuURL(menuId.intValue(), "uniqId");

        // Then
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(menuId);
        verify(menuRepository, never()).findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }
}
