package egovframework.com.sym.mnu.mpm.service.impl;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

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
class EgovMenuManageServiceImplTest {

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
    void selectLastMenuURL_shouldCallFindByUpperMenuNo() throws Exception {
        // Arrange
        int menuNo = 100;
        Long menuId = (long) menuNo;

        Menu menu = Menu.builder()
                .id(menuId)
                .menuNm("Test Menu")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .build();

        when(menuRepository.findById(menuId)).thenReturn(Optional.of(menu));

        // This is what we expect to be called now
        when(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(menuId)).thenReturn(Collections.emptyList());

        // Act
        menuManageService.selectLastMenuURL(menuNo, "uniqId");

        // Assert
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(menuId);
        verify(menuRepository, times(0)).findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }

    @Test
    void selectMainMenuLeft_shouldCallFindByUpperMenuNo() throws Exception {
        // Arrange
        MenuManageVO vo = new MenuManageVO();
        vo.setMenuNo(100);
        Long menuId = 100L;

        when(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(menuId)).thenReturn(Collections.emptyList());

        // Act
        menuManageService.selectMainMenuLeft(vo);

        // Assert
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(menuId);
        verify(menuRepository, times(0)).findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }
}
