package egovframework.com.sym.prm.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.program.ProgramRepository;

@ExtendWith(MockitoExtension.class)
public class EgovProgrmManageServiceImplUnitTest {

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private ProgrmManageDAO progrmManageDAO;

    @InjectMocks
    private EgovProgrmManageServiceImpl progrmManageService;

    @Test
    public void testDeleteProgrmManageList_Optimized() throws Exception {
        String ids = "ID1,ID2,ID3";

        progrmManageService.deleteProgrmManageList(ids);

        // Optimized verification:
        // It should NOT call deleteById
        verify(programRepository, never()).deleteById(any());

        // It should call batch delete exactly once
        verify(programRepository, times(1)).deleteAllByIdInBatch(any());
    }
}
