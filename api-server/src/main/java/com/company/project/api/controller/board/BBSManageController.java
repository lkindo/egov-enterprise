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

import jakarta.annotation.Resource;
import java.util.Map;

/**
 * 레거시 게시판 요청 처리를 위한 컨트롤러
 */
@Controller
@RequiredArgsConstructor
public class BBSManageController {

    private final EgovBoardService boardService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /**
     * 게시물 목록 조회 (공통)
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

        // bbsId에 따른 뷰 결정 (간략화를 위해 공통 사용 혹은 조건부 분기)
        if (bbsId.startsWith("BBSMSTR_")) {
            return "cop/bbs/EgovNoticeList";
        }

        return "cop/bbs/EgovNoticeList";
    }
}
