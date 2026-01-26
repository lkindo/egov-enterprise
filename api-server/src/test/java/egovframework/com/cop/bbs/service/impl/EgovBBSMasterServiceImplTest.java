package egovframework.com.cop.bbs.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
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
    private EgovBBSMasterDAO egovBBSMasterDAO;

    @Test
    public void selectNotUsedBdMstrList_test() {
        // given
        BoardMasterVO boardMasterVO = new BoardMasterVO();
        List<BoardMasterVO> expectedList = new ArrayList<>();
        BoardMasterVO vo = new BoardMasterVO();
        vo.setBbsId("BBS_0000000000001");
        expectedList.add(vo);

        when(egovBBSMasterDAO.selectNotUsedBdMstrList(any(BoardMasterVO.class))).thenReturn(expectedList);
        when(egovBBSMasterDAO.selectNotUsedBdMstrListCnt(any(BoardMasterVO.class))).thenReturn(1);

        // when
        Map<String, Object> result = egovBBSMasterService.selectNotUsedBdMstrList(boardMasterVO);

        // then
        assertNotNull(result);
        assertEquals(expectedList, result.get("resultList"));
        assertEquals("1", result.get("resultCnt"));
    }
}
