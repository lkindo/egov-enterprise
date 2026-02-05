package egovframework.com.sym.mnu.mpm.service.impl;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;

@ExtendWith(MockitoExtension.class)
class EgovMenuManageServiceBenchmarkTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @InjectMocks
    private EgovMenuManageServiceImpl menuManageService;

    @Test
    void benchmarkRecursiveCalls_Optimized() throws Exception {
        int depth = 10;
        long startId = 1L;

        // Setup mock behavior for a chain of menus
        for (int i = 0; i < depth; i++) {
            long currentId = startId + i;
            long nextId = startId + i + 1;

            Menu currentMenu = Menu.builder()
                    .id(currentId)
                    .menuNm("Menu " + currentId)
                    .build();

            Menu nextMenu = Menu.builder()
                    .id(nextId)
                    .menuNm("Menu " + nextId)
                    .build();

            // Mock findById - Only the first one should be called
            if (i == 0) {
                when(menuRepository.findById(currentId)).thenReturn(Optional.of(currentMenu));
            }

            // Mock findFirstByUpperMenuNo (Optimized implementation)
            if (i < depth - 1) {
                // Return next child
                when(menuRepository.findFirstByUpperMenuNoOrderByMenuOrdrAsc(currentId))
                        .thenReturn(Optional.of(nextMenu));
            } else {
                // Last one has no children
                when(menuRepository.findFirstByUpperMenuNoOrderByMenuOrdrAsc(currentId))
                        .thenReturn(Optional.empty());
            }
        }

        // Run the method
        menuManageService.selectLastMenuURL((int) startId, "uniqId");

        // Verify invocation counts (Optimized)

        // Expected: findById called ONLY ONCE (for the startId)
        verify(menuRepository, times(1)).findById(startId);

        // Expected: findById NEVER called for subsequent nodes (IDs > startId)
        // We can verify total findById calls is 1.
        verify(menuRepository, times(1)).findById(anyLong());

        // Expected: findFirstByUpperMenuNo called for EACH node (Depth times)
        verify(menuRepository, times(depth)).findFirstByUpperMenuNoOrderByMenuOrdrAsc(anyLong());

        // Expected: findByUpperMenuNo (List version) NEVER called
        verify(menuRepository, never()).findByUpperMenuNoOrderByMenuOrdrAsc(anyLong());
    }
}
