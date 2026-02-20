package com.company.project.web.board;

import org.egovframe.rte.fdl.property.EgovPropertyService;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.PageRequest;

import org.springframework.stereotype.Controller;

import org.springframework.ui.ModelMap;

import org.springframework.web.bind.annotation.ModelAttribute;

import org.springframework.web.bind.annotation.RequestMapping;

import com.company.project.service.board.EgovBoardMasterService;

import com.company.project.service.board.dto.BoardMasterDto;

import com.company.project.service.mail.EgovMailService;

import com.company.project.service.mail.dto.SentMailDto;

import com.company.project.web.adapter.BoardAdapter;

import com.company.project.web.adapter.MailAdapter;

import egovframework.com.cmm.util.EgovUserDetailsHelper;

import egovframework.com.cop.bbs.service.BoardMasterVO;

import egovframework.com.cop.ems.service.SndngMailVO;

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

    private final EgovMailService egovMailService;

    private final com.company.project.service.cmt.CommentService commentService;

    @Resource(name = "propertiesService")

    protected EgovPropertyService propertyService;

    /**

     *          ???         ???            ?(         ????????     ??

     */

    /*

     * @RequestMapping("/cop/bbs/selectBBSMasterInfs.do") public String

     * selectBBSMasterInfs(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO,

     * ModelMap model) throws Exception { PaginationInfo paginationInfo =

     * setupPaging(boardMasterVO.getPageIndex(), boardMasterVO.getPageUnit(),

     * model);

     * 

     * PageRequest pageable = PageRequest.of(boardMasterVO.getPageIndex() - 1,

     * boardMasterVO.getPageUnit()); Page<BoardMasterDto> pageResult =

     * egovBoardMasterService.getBoardMasterList(boardMasterVO.getSearchCnd(),

     * boardMasterVO.getSearchWrd(), pageable);

     * 

     * model.addAttribute("resultList",

     * pageResult.getContent().stream().map(BoardAdapter::toMasterVO).collect(

     * Collectors.toList())); model.addAttribute("resultCnt",

     * pageResult.getTotalElements()); return

     * "egovframework/com/cop/bbs/EgovBBSMasterList"; }

     */

    /**

     *          ?      ?            ?

     */

    /*

     * @RequestMapping("/cop/bbs/selectArticleList.do") public String

     * selectArticleList(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap

     * model) throws Exception { if (!EgovUserDetailsHelper.isAuthenticated())

     * return "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(boardVO.getPageIndex(),

     * boardVO.getPageUnit(), model);

     * 

     * BoardMasterDto masterDto =

     * egovBoardMasterService.getBoardMaster(boardVO.getBbsId()); PageRequest

     * pageable = PageRequest.of(boardVO.getPageIndex() - 1, boardVO.getPageUnit(),

     * Sort.Direction.DESC, "sortOrdr"); Page<BoardDto> pageResult =

     * egovBoardService.getBoardPosts(boardVO.getBbsId(), boardVO.getSearchCnd(),

     * boardVO.getSearchWrd(), pageable);

     * 

     * model.addAttribute("resultList",

     * BoardAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements());

     * model.addAttribute("boardMasterVO", BoardAdapter.toMasterVO(masterDto));

     * return "egovframework/com/cop/bbs/EgovArticleList"; }

     */

    /**

     * ??      ??            ?

     */

    /*

     * @RequestMapping("/cop/tpl/selectTemplateInfs.do") public String

     * selectTemplateInfs(@ModelAttribute("searchVO") TemplateInfVO searchVO,

     * ModelMap model) throws Exception { PaginationInfo paginationInfo =

     * setupPaging(searchVO.getPageIndex(), searchVO.getPageUnit(), model);

     * 

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage()); Page<TemplateDto> pageResult =

     * egovTemplateService.getTemplateList(searchVO.getSearchWrd(), pageable);

     * 

     * model.addAttribute("resultList",

     * TemplateAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/tpl/EgovTemplateList"; }

     */

    /**

     * ??      ??            ?

     */

    /*

     * @RequestMapping("/cop/scp/selectScrapList.do") public String

     * selectScrapList(@ModelAttribute("searchVO") ScrapVO searchVO, ModelMap model)

     * throws Exception { if (!EgovUserDetailsHelper.isAuthenticated()) return

     * "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(),

     * searchVO.getPageUnit(), model);

     * 

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage()); Page<ScrapDto> pageResult =

     * egovScrapService.getMyScrapList(getUserId(), pageable);

     * 

     * model.addAttribute("resultList",

     * ScrapAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/scp/EgovScrapList"; }

     */

    /**

     * ?      ???                   ?

     */

    /*

     * @RequestMapping("/cop/cmy/selectCmmntyInfs.do") public String

     * selectCmmntyInfs(@ModelAttribute("searchVO") CommunityVO searchVO, ModelMap

     * model) throws Exception { PaginationInfo paginationInfo =

     * setupPaging(searchVO.getPageIndex(), searchVO.getPageUnit(), model);

     * 

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage()); Page<CommunityDto> pageResult =

     * egovCommunityService.getCommunityList(searchVO.getSearchWrd(), pageable);

     * 

     * model.addAttribute("resultList",

     * CommunityAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/cmy/EgovCmmntyList"; }

     */

    /**

     * ?      ?                                    ?

     */

    /*

     * @RequestMapping("/cop/sms/selectSmsList.do") public String

     * selectSmsList(@ModelAttribute("searchVO") SmsVO searchVO, ModelMap model)

     * throws Exception { if (!EgovUserDetailsHelper.isAuthenticated()) return

     * "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(),

     * searchVO.getPageUnit(), model);

     * 

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage()); Page<SmsDto> pageResult =

     * egovSmsService.getSmsList(searchVO.getSearchWrd(), pageable);

     * 

     * model.addAttribute("resultList",

     * SmsAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/sms/EgovSmsList"; }

     */

    /**

     *          ?      ??     ??

     */

    /*

     * @RequestMapping("/cop/adb/selectAdbkList.do") public String

     * selectAdbkList(@ModelAttribute("searchVO") AddressBookVO addressBookVO,

     * ModelMap model) throws Exception { PaginationInfo paginationInfo =

     * setupPaging(addressBookVO.getPageIndex(), addressBookVO.getPageUnit(),

     * model);

     * 

     * PageRequest pageable = PageRequest.of(addressBookVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage()); Page<AddressBookDto> pageResult =

     * egovAddressBookService.getAddressBookList(addressBookVO.getSearchWrd(),

     * pageable);

     * 

     * model.addAttribute("resultList", pageResult.getContent());

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/adb/EgovAddressBookList"; }

     */

    /**

     *          ????????                   ??(         ??   ?   ??         ?

     */

    /**

     *          ????????                   ??(         ??   ?   ??         ?

     */

    @RequestMapping("/cop/com/selectBBSUseInfs.do")

    public String selectBBSUseInfs(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO, ModelMap model)

            throws Exception {

        setupPaging(boardMasterVO.getPageIndex(), boardMasterVO.getPageUnit(), model);

        PageRequest pageable = PageRequest.of(boardMasterVO.getPageIndex() - 1, boardMasterVO.getPageUnit());

        Page<BoardMasterDto> pageResult = egovBoardMasterService.getBoardMasterList(boardMasterVO.getSearchCnd(),

                boardMasterVO.getSearchWrd(), pageable);

        model.addAttribute("resultList",

                pageResult.getContent().stream().map(BoardAdapter::toMasterVO).toList());

        model.addAttribute("resultCnt", pageResult.getTotalElements());

        return "egovframework/com/cop/com/EgovBBSUseInfList";

    }

    /**

     *             ??     ??            ?

     */

    /*

     * @RequestMapping("/cop/ncm/selectNcrdInfs.do") public String

     * selectNcrdInfs(@ModelAttribute("searchVO") NameCardVO nameCardVO, ModelMap

     * model) throws Exception { if (!EgovUserDetailsHelper.isAuthenticated())

     * return "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(nameCardVO.getPageIndex(),

     * nameCardVO.getPageUnit(), model);

     * 

     * PageRequest pageable = PageRequest.of(nameCardVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage()); Page<NameCardDto> pageResult =

     * egovNameCardService.getNameCardList(nameCardVO.getSearchWrd(), pageable);

     * 

     * model.addAttribute("resultList",

     * NameCardAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/ncm/EgovNcrdList"; }

     */

    /**

     * ??            ?            ?

     */

    /*

     * @RequestMapping("/cop/ncm/selectMyNcrdUseInf.do") public String

     * selectMyNcrdUseInf(@ModelAttribute("searchVO") NameCardVO nameCardVO,

     * ModelMap model) throws Exception { if

     * (!EgovUserDetailsHelper.isAuthenticated()) return

     * "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(nameCardVO.getPageIndex(),

     * nameCardVO.getPageUnit(), model);

     * 

     * PageRequest pageable = PageRequest.of(nameCardVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage()); Page<NameCardDto> pageResult =

     * egovNameCardService.getMyNameCards(getUserId(), pageable);

     * 

     * model.addAttribute("resultList",

     * NameCardAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/ncm/EgovMyNcrdList"; }

     */

    /**

     *          ???      ?     ??            ?

     */

    /*

     * @RequestMapping("/cop/smt/sim/EgovIndvdlSchdulManageList.do") public String

     * selectIndvdlSchdulList(@ModelAttribute("searchVO") IndvdlSchdulManageVO

     * searchVO, ModelMap model) throws Exception { if

     * (!EgovUserDetailsHelper.isAuthenticated()) return

     * "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(),

     * searchVO.getPageUnit(), model); PageRequest pageable =

     * PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * //          ????      ??          ??            ?         ??Page<ScheduleDto> pageResult =

     * egovScheduleService.getScheduleList(getUserId(), pageable);

     * 

     * model.addAttribute("resultList",

     * ScheduleAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageList"; }

     */

    /**

     * ?     ??      ?   ???            ?

     */

    /*

     * @RequestMapping("/cop/smt/sdm/EgovDeptSchdulManageList.do") public String

     * selectDeptSchdulList(@ModelAttribute("searchVO") DeptSchdulManageVO searchVO,

     * ModelMap model) throws Exception { if

     * (!EgovUserDetailsHelper.isAuthenticated()) return

     * "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(),

     * searchVO.getPageUnit(), model); PageRequest pageable =

     * PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * // ?     ??            ??         ??     ????                ?? ??         ??          ??..             ??         ??       ??   ????     ??Page<ScheduleDto>

     * pageResult = egovScheduleService.getScheduleList("2",

     * searchVO.getSchdulDeptId(), pageable); // 2: // ?     ??      ??

     * 

     * model.addAttribute("resultList",

     * ScheduleAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageList"; }

     */

    /**

     * ?         ??      ?     ??            ?

     */

    /*

     * @RequestMapping("/cop/smt/sam/EgovAllSchdulManageList.do") public String

     * selectAllSchdulList(@ModelAttribute("searchVO") IndvdlSchdulManageVO

     * searchVO, ModelMap model) throws Exception { PaginationInfo paginationInfo =

     * setupPaging(searchVO.getPageIndex(), searchVO.getPageUnit(), model);

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * // ?          ??       (            ????   ? Page<ScheduleDto> pageResult =

     * egovScheduleService.getScheduleList(null, pageable);

     * 

     * model.addAttribute("resultList",

     * ScheduleAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/smt/sam/EgovAllSchdulManageList"; }

     */

    /**

     * ????     ??            ?

     */

    /*

     * @RequestMapping("/cop/smt/dsm/EgovDiaryManageList.do")

     * public String selectDiaryList(@ModelAttribute("searchVO") DiaryManageVO

     * searchVO, ModelMap model) throws Exception {

     * if (!EgovUserDetailsHelper.isAuthenticated())

     * return "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(),

     * searchVO.getPageUnit(), model);

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * Page<DutyDto> pageResult =

     * egovDutyService.getDutyList(searchVO.getSearchKeyword(), pageable);

     * 

     * paginationInfo.setTotalRecordCount((int) pageResult.getTotalElements());

     * model.addAttribute("paginationInfo", paginationInfo);

     * 

     * model.addAttribute("resultList",

     * DiaryAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements());

     * return "egovframework/com/cop/smt/dsm/EgovDiaryManageList";

     * }

     */

    /**

     *          ?      ?       ?          ?         

     */

    /*

     * @RequestMapping("/cop/ems/insertSndngMailView.do") public String

     * insertSndngMailView(@ModelAttribute("searchVO") SndngMailVO searchVO,

     * ModelMap model) throws Exception { return

     * "egovframework/com/cop/ems/EgovSndngMailRegist"; }

     */

    /**

     *          ?                ??                   ?

     */

    /**

     *          ?                ??                   ?

     */

    @RequestMapping("/cop/ems/selectSndngMailList.do")

    public String selectSndngMailList(@ModelAttribute("searchVO") SndngMailVO searchVO, ModelMap model)

            throws Exception {

        if (!EgovUserDetailsHelper.isAuthenticated())

            return "redirect:/uat/uia/egovLoginUsr.do";

        PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(), searchVO.getPageUnit(), model);

        PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1, paginationInfo.getRecordCountPerPage());

        Page<SentMailDto> pageResult = egovMailService.getSentMailList(searchVO.getSearchWrd(), pageable);

        model.addAttribute("resultList", MailAdapter.toVOList(pageResult.getContent()));

        model.addAttribute("resultCnt", pageResult.getTotalElements());

        return "egovframework/com/cop/ems/EgovSndngMailList";

    }

    /**

     *          ???      ?     ??            ?

     */

    /*

     * @RequestMapping("/cop/smt/lsm/usr/selectLeaderSchdulList.do") public String

     * selectLeaderSchdulList(@ModelAttribute("searchVO") LeaderSchdulVO searchVO,

     * ModelMap model) throws Exception { PaginationInfo paginationInfo =

     * setupPaging(searchVO.getPageIndex(), searchVO.getPageUnit(), model);

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * Page<LeaderScheduleDto> pageResult = egovLeaderScheduleService

     * .getLeaderScheduleList(searchVO.getSearchKeyword(), pageable);

     * 

     * // LeaderScheduleAdapter         ??                 ?DTO          ???????      ??Adapter ?         . ScheduleAdapter ??   ??

     *         ?      ?

     * // ?         . // ?            ?Content          ?   ??          (JSP?   ?             ????          ?         )

     * model.addAttribute("resultList", pageResult.getContent());

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/smt/lsm/EgovLeaderSchdulList"; }

     */

    /**

     *             ??                  ??            ?

     */

    /*

     * @RequestMapping("/cop/smt/wmr/selectWikMnthngReprtList.do") public String

     * selectWikMnthngReprtList(@ModelAttribute("searchVO") WikMnthngReprtVO

     * searchVO, ModelMap model) throws Exception { PaginationInfo paginationInfo =

     * setupPaging(searchVO.getPageIndex(), searchVO.getPageUnit(), model);

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * Page<WorkReportDto> pageResult =

     * egovWorkReportService.getWorkReportList(getUserId(), pageable);

     * 

     * model.addAttribute("resultList", pageResult.getContent());

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/smt/wmr/EgovWikMnthngReprtList"; }

     */

    /**

     *          ??                      ?

     */

    /*

     * @RequestMapping("/cop/smt/mtm/selectMemoTodoList.do") public String

     * selectMemoTodoList(@ModelAttribute("searchVO") MemoTodoVO searchVO, ModelMap

     * model) throws Exception { if (!EgovUserDetailsHelper.isAuthenticated())

     * return "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(),

     * searchVO.getPageUnit(), model); PageRequest pageable =

     * PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * Page<MemoTodoDto> pageResult =

     * egovMemoTodoService.getMemoTodoList(getUserId(),

     * pageable);

     * 

     * model.addAttribute("resultList", pageResult.getContent());

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/smt/mtm/EgovMemoTodoList"; }

     */

    /**

     * ?     ??      ?         ?            ?

     */

    /*

     * @RequestMapping("/cop/smt/djm/selectDeptJobBxList.do") public String

     * selectDeptJobBxList(@ModelAttribute("searchVO") DeptJobBxVO searchVO,

     * ModelMap model) throws Exception { PaginationInfo paginationInfo =

     * setupPaging(searchVO.getPageIndex(), searchVO.getPageUnit(), model);

     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * Page<DeptJobBoxDto> pageResult =

     * egovDeptJobBoxService.getDeptJobBoxList(searchVO.getSearchWrd(), pageable);

     * 

     * model.addAttribute("resultList",

     * DeptJobBoxAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/smt/djm/EgovDeptJobBxList"; }

     */

    /**

     *          ?      ?     ?            ?

     */

    /*

     * @RequestMapping("/cop/smt/mrm/selectMemoReprtList.do") public String

     * selectMemoReprtList(@ModelAttribute("searchVO") MemoReprtVO searchVO,

     * ModelMap model) throws Exception { if

     * (!EgovUserDetailsHelper.isAuthenticated()) return

     * "redirect:/uat/uia/egovLoginUsr.do";

     * 

     * PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(),

     * searchVO.getPageUnit(), model); PageRequest pageable =

     * PageRequest.of(searchVO.getPageIndex() - 1,

     * paginationInfo.getRecordCountPerPage());

     * 

     * Page<MemoReportDto> pageResult =

     * egovMemoReportService.getMyReportList(getUserId(), pageable);

     * 

     * model.addAttribute("resultList",

     * MemoReportAdapter.toVOList(pageResult.getContent()));

     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return

     * "egovframework/com/cop/smt/mrm/EgovMemoReprtList"; }

     */

    /**

     * ?   ? ??       ?         

     */

    @RequestMapping("/cop/cmt/updateArticleCommentView.do")

    public String updateArticleCommentView(

            @ModelAttribute("searchVO") egovframework.com.cop.bbs.service.BoardVO boardVO,

            ModelMap model) throws Exception {

        setupPaging(boardVO.getPageIndex(), boardVO.getPageUnit(), model);

        com.company.project.service.cmt.dto.CommentDto commentDto = commentService.getComment(boardVO.getCommentNo());

        model.addAttribute("articleCommentVO", commentDto);

        model.addAttribute("resultList", commentService.getComments(boardVO.getNttId(), boardVO.getBbsId(),

                PageRequest.of(boardVO.getPageIndex() - 1, propertyService.getInt("pageUnit"))).getContent());

        return "egovframework/com/cop/cmt/EgovArticleCommentList";

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

}

