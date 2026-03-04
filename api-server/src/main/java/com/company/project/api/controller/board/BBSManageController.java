package com.company.project.api.controller.board;

import com.company.project.service.board.EgovBoardService;
import com.company.project.service.board.dto.BoardDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.Map;

/**
 * 게시??관리? ?한 컨트롤러 (공??항 ??
 */
@Controller
@RequiredArgsConstructor
public class BBSManageController {
    private final EgovBoardService boardService;
    private final EgovPropertyService propertiesService;

    /**
     * 게시?목록??조회?다.
     */
    @RequestMapping({ "/cop/bbs/selectBoardList.do", "/cop/bbs/admin/selectBoardList.do" })
    public String selectBoardList(@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {
        String bbsId = (String) commandMap.get("bbsId");
        int pageIndex = 1;
        if (commandMap.get("pageIndex") != null && !commandMap.get("pageIndex").toString().isEmpty()) {
            pageIndex = Integer.parseInt(commandMap.get("pageIndex").toString());
        }

        int pageUnit = propertiesService.getInt("pageUnit");
        int pageSize = propertiesService.getInt("pageSize");

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(pageIndex);
        paginationInfo.setRecordCountPerPage(pageUnit);
        paginationInfo.setPageSize(pageSize);

        Page<BoardDto> resultPage = boardService.getBoardPosts(bbsId, PageRequest.of(pageIndex - 1, pageUnit));
        model.addAttribute("resultList", resultPage.getContent());
        model.addAttribute("resultCnt", resultPage.getTotalElements());
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("bbsId", bbsId);

        return "cop/bbs/EgovNoticeList";
    }
}
