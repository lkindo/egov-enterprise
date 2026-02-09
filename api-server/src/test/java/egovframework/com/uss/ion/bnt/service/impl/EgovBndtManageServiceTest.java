package egovframework.com.uss.ion.bnt.service.impl;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.duty.BndtDiaryRepository;
import com.company.project.domain.duty.BndtDiary;
import egovframework.com.uss.ion.bnt.service.BndtDiaryVO;

@ExtendWith(MockitoExtension.class)
public class EgovBndtManageServiceTest {

    @Mock
    private BndtDiaryRepository bndtDiaryRepository;

    @InjectMocks
    private EgovBndtManageServiceImpl bndtManageService;

    @Test
    public void selectBndtDiary_ShouldUseOptimizedRepositoryMethod() throws Exception {
        // Arrange
        String bndtId = "TEST_ID";
        String bndtDe = "20231027";
        BndtDiaryVO vo = new BndtDiaryVO();
        vo.setBndtId(bndtId);
        vo.setBndtDe(bndtDe);

        List<BndtDiary> matchingDiaries = new ArrayList<>();
        // Add a matching diary
        matchingDiaries.add(BndtDiary.builder()
                .bndtId(bndtId)
                .bndtDe(bndtDe)
                .bndtCeckSe("01")
                .bndtCeckCd("CODE1")
                .build());

        when(bndtDiaryRepository.findByBndtIdAndBndtDe(bndtId, bndtDe)).thenReturn(matchingDiaries);

        // Act
        List<BndtDiaryVO> result = bndtManageService.selectBndtDiary(vo);

        // Assert
        assertEquals(1, result.size());
        assertEquals(bndtId, result.get(0).getBndtId());

        // Verify that findByBndtIdAndBndtDe was called and findAll was NOT called
        verify(bndtDiaryRepository, times(1)).findByBndtIdAndBndtDe(bndtId, bndtDe);
        verify(bndtDiaryRepository, times(0)).findAll();
    }
}
