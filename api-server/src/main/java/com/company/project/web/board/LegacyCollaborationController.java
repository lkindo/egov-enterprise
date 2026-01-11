package com.company.project.web.board;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.EgovBoardService;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardMasterDto;
import com.company.project.service.template.EgovTemplateService;
import com.company.project.service.template.dto.TemplateDto;
import com.company.project.service.addressbook.EgovAddressBookService;
import com.company.project.service.addressbook.dto.AddressBookDto;
import com.company.project.service.schedule.EgovScheduleService;
import com.company.project.service.schedule.EgovMemoTodoService;
import com.company.project.service.schedule.dto.ScheduleDto;
import com.company.project.service.schedule.dto.MemoTodoDto;
import com.company.project.service.namecard.EgovNameCardService;
import com.company.project.service.namecard.dto.NameCardDto;
import com.company.project.web.adapter.BoardAdapter;
import com.company.project.web.adapter.ScheduleAdapter;
import com.company.project.web.adapter.NameCardAdapter;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.bbs.service.BoardVO;
import egovframework.com.cop.tpl.service.TemplateInfVO;
import egovframework.com.cop.adb.service.AddressBookVO;
import egovframework.com.cop.ncm.service.NameCardVO;
import egovframework.com.cop.smt.sim.service.IndvdlSchdulManageVO;
import egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO;
import egovframework.com.cop.smt.mtm.service.MemoTodoVO;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * Legacy URL Bridge Controller for Collaboration (COP)
 * Maps legacy .do URLs to modern JPA services to fix 404 errors.
 */
@Controller
@RequiredArgsConstructor
public class LegacyCollaborationController {

    private final EgovBoardMasterService egovBoardMasterService;
    private final EgovBoardService egovBoardService;
    private final EgovTemplateService egovTemplateService;
    private final EgovAddressBookService egovAddressBookService;
    private final EgovScheduleService egovScheduleService;
    private final EgovNameCardService egovNameCardService;
    private final EgovMemoTodoService egovMemoTodoService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    /**
     * 게시판 마스터 목록 (게시판 사용 관리)
     */
    @RequestMapping("/cop/bbs/selectBBSMasterInfs.do")
    public String selectBBSMasterInfs(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO, ModelMap model)
            throws Exception {
        int pageUnit = propertyService.getInt("pageUnit");
        int pageSize = propertyService.getInt("pageSize");

        boardMasterVO.setPageUnit(pageUnit);
        boardMasterVO.setPageSize(pageSize);

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(boardMasterVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(boardMasterVO.getPageUnit());
        paginationInfo.setPageSize(boardMasterVO.getPageSize());

        boardMasterVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        boardMasterVO.setLastIndex(paginationInfo.getLastRecordIndex());
        boardMasterVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        PageRequest pageable = PageRequest.of(boardMasterVO.getPageIndex() - 1, boardMasterVO.getPageUnit());
        Page<BoardMasterDto> pageResult = egovBoardMasterService.getBoardMasterList(boardMasterVO.getSearchCnd(),
                boardMasterVO.getSearchWrd(), pageable);

        model.addAttribute("resultList",
                pageResult.getContent().stream().map(BoardAdapter::toMasterVO).collect(Collectors.toList()));
        model.addAttribute("resultCnt", pageResult.getTotalElements());
        model.addAttribute("paginationInfo", paginationInfo);
        return "egovframework/com/cop/bbs/EgovBBSMasterList";
    }

    /**
     * 게시물 목록
     */
    @RequestMapping("/cop/bbs/selectArticleList.do")
    public String selectArticleList(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
        if (!EgovUserDetailsHelper.isAuthenticated())
            return "redirect:/uat/uia/egovLoginUsr.do";

        boardVO.setPageUnit(propertyService.getInt("pageUnit"));
        boardVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
        paginationInfo.setPageSize(boardVO.getPageSize());

        boardVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        boardVO.setLastIndex(paginationInfo.getLastRecordIndex());
        boardVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        BoardMasterDto masterDto = egovBoardMasterService.getBoardMaster(boardVO.getBbsId());
        PageRequest pageable = PageRequest.of(boardVO.getPageIndex() - 1, boardVO.getPageUnit(), Sort.Direction.DESC,
                "sortOrdr");
        Page<BoardDto> pageResult = egovBoardService.getBoardPosts(boardVO.getBbsId(), boardVO.getSearchCnd(),
                boardVO.getSearchWrd(), pageable);

        model.addAttribute("resultList", BoardAdapter.toVOList(pageResult.getContent()));
        model.addAttribute("resultCnt", pageResult.getTotalElements());
        model.addAttribute("boardMasterVO", BoardAdapter.toMasterVO(masterDto));
        model.addAttribute("paginationInfo", paginationInfo);
        return "egovframework/com/cop/bbs/EgovArticleList";
    }

    // 템플릿 관리는 EgovTemplateManageController에서 처리하므로 중복 제거
    // @RequestMapping("/cop/tpl/selectTemplateInfs.do") - 중복 매핑 충돌 방지

    /**
     * 주소록 관리
     */
    @RequestMapping("/cop/adb/selectAdbkList.do")
    public String selectAdbkList(@ModelAttribute("searchVO") AddressBookVO addressBookVO, ModelMap model)
            throws Exception {
        PaginationInfo paginationInfo = setupPaging(addressBookVO.getPageIndex(), addressBookVO.getPageUnit(), model);

        PageRequest pageable = PageRequest.of(addressBookVO.getPageIndex() - 1, paginationInfo.getRecordCountPerPage());
        Page<AddressBookDto> pageResult = egovAddressBookService.getAddressBookList(addressBookVO.getSearchWrd(),
                pageable);

        model.addAttribute("resultList", pageResult.getContent());
        model.addAttribute("resultCnt", pageResult.getTotalElements());
        return "egovframework/com/cop/adb/EgovAddressBookList";
    }

    /**
     * 게시판 사용 정보 조회 (게시판사용정보)
     */
    @RequestMapping("/cop/com/selectBBSUseInfs.do")
    public String selectBBSUseInfs(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO, ModelMap model)
            throws Exception {
        int pageUnit = propertyService.getInt("pageUnit");
        int pageSize = propertyService.getInt("pageSize");

        boardMasterVO.setPageUnit(pageUnit);
        boardMasterVO.setPageSize(pageSize);

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(boardMasterVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(boardMasterVO.getPageUnit());
        paginationInfo.setPageSize(boardMasterVO.getPageSize());

        boardMasterVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        boardMasterVO.setLastIndex(paginationInfo.getLastRecordIndex());
        boardMasterVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        PageRequest pageable = PageRequest.of(boardMasterVO.getPageIndex() - 1, boardMasterVO.getPageUnit());
        Page<BoardMasterDto> pageResult = egovBoardMasterService.getBoardMasterList(boardMasterVO.getSearchCnd(),
                boardMasterVO.getSearchWrd(), pageable);

        paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());

        model.addAttribute("resultList",
                pageResult.getContent().stream().map(BoardAdapter::toMasterVO).collect(Collectors.toList()));
        model.addAttribute("resultCnt", pageResult.getTotalElements());
        model.addAttribute("paginationInfo", paginationInfo);
        return "egovframework/com/cop/com/EgovBBSUseInfList";
    }

    /**
     * 명함 관리 목록
     */
    @RequestMapping("/cop/ncm/selectNcrdInfs.do")
    public String selectNcrdInfs(@ModelAttribute("searchVO") NameCardVO nameCardVO, ModelMap model) throws Exception {
        if (!EgovUserDetailsHelper.isAuthenticated())
            return "redirect:/uat/uia/egovLoginUsr.do";

        PaginationInfo paginationInfo = setupPaging(nameCardVO.getPageIndex(), nameCardVO.getPageUnit(), model);

        PageRequest pageable = PageRequest.of(nameCardVO.getPageIndex() - 1, paginationInfo.getRecordCountPerPage());
        Page<NameCardDto> pageResult = egovNameCardService.getNameCardList(nameCardVO.getSearchWrd(), pageable);

        model.addAttribute("resultList", NameCardAdapter.toVOList(pageResult.getContent()));
        model.addAttribute("resultCnt", pageResult.getTotalElements());
        return "egovframework/com/cop/ncm/EgovNcrdList";
    }

    /**
     * 내 명함 목록
     */
    @RequestMapping("/cop/ncm/selectMyNcrdUseInf.do")
    public String selectMyNcrdUseInf(@ModelAttribute("searchVO") NameCardVO nameCardVO, ModelMap model)
            throws Exception {
        if (!EgovUserDetailsHelper.isAuthenticated())
            return "redirect:/uat/uia/egovLoginUsr.do";

        PaginationInfo paginationInfo = setupPaging(nameCardVO.getPageIndex(), nameCardVO.getPageUnit(), model);

        PageRequest pageable = PageRequest.of(nameCardVO.getPageIndex() - 1, paginationInfo.getRecordCountPerPage());
        Page<NameCardDto> pageResult = egovNameCardService.getMyNameCards(getUserId(), pageable);

        model.addAttribute("resultList", NameCardAdapter.toVOList(pageResult.getContent()));
        model.addAttribute("resultCnt", pageResult.getTotalElements());
        return "egovframework/com/cop/ncm/EgovMyNcrdList";
    }

    private PaginationInfo setupPaging(int pageIndex, int pageUnit, ModelMap model) {
        if (pageUnit <= 0)
            pageUnit = propertyService.getInt("pageUnit");
        int pageSize = propertyService.getInt("pageSize");

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(pageIndex);
        paginationInfo.setRecordCountPerPage(pageUnit);
        paginationInfo.setPageSize(pageSize);

        model.addAttribute("paginationInfo", paginationInfo);
        return paginationInfo;
    }

    private String getUserId() {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        return (user != null) ? user.getUniqId() : "anonymous";
    }
}
