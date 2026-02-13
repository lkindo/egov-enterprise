package egovframework.com.cop.bbs.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import egovframework.com.cop.bbs.service.BoardMasterVO;

@ExtendWith(MockitoExtension.class)
public class EgovBBSMasterServiceImplTest {

    @InjectMocks
    private EgovBBSMasterServiceImpl egovBBSMasterService;

    @Mock
    private com.company.project.service.board.EgovBoardMasterService boardMasterService;

    @Test
    public void selectNotUsedBdMstrList_test() {
        // given
        BoardMasterVO boardMasterVO = new BoardMasterVO();
        boardMasterVO.setFirstIndex(0);
        boardMasterVO.setRecordCountPerPage(10);

        List<com.company.project.service.board.dto.BoardMasterDto> content = new java.util.ArrayList<>();
        content.add(com.company.project.service.board.dto.BoardMasterDto.builder()
                .bbsId("BBS_0000000000001")
                .build());

        org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardMasterDto> page = new org.springframework.data.domain.PageImpl<>(
                content, org.springframework.data.domain.PageRequest.of(0, 10), 1L);

        when(boardMasterService.getBoardMasterList(any(), any(), any())).thenReturn(page);

        // when
        Map<String, Object> result = egovBBSMasterService.selectNotUsedBdMstrList(boardMasterVO);

        // then
        assertNotNull(result);
        List<?> resultList = (List<?>) result.get("resultList");
        assertEquals(1, resultList.size());
        assertEquals("BBS_0000000000001", ((BoardMasterVO) resultList.get(0)).getBbsId());
        assertEquals("1", result.get("resultCnt"));
    }
}
