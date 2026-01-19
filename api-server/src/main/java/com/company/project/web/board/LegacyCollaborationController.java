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
import org.springframework.web.bind.annotation.RequestParam;

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
import com.company.project.service.schedule.EgovLeaderScheduleService;
import com.company.project.service.schedule.dto.ScheduleDto;
import com.company.project.service.schedule.dto.MemoTodoDto;
import com.company.project.service.schedule.dto.LeaderScheduleDto;
import com.company.project.service.namecard.EgovNameCardService;
import com.company.project.service.namecard.dto.NameCardDto;
import com.company.project.service.community.EgovCommunityService;
import com.company.project.service.community.dto.CommunityDto;
import com.company.project.service.scrap.EgovScrapService;
import com.company.project.service.scrap.dto.ScrapDto;
import com.company.project.service.sms.EgovSmsService;
import com.company.project.service.sms.dto.SmsDto;
import com.company.project.service.mail.EgovMailService;
import com.company.project.service.mail.dto.SentMailDto;
import com.company.project.service.deptjob.EgovDeptJobBoxService;
import com.company.project.service.deptjob.dto.DeptJobBoxDto;
import com.company.project.service.memoreport.EgovMemoReportService;
import com.company.project.service.memoreport.dto.MemoReportDto;
import com.company.project.service.report.EgovWorkReportService;
import com.company.project.service.report.dto.WorkReportDto;
import com.company.project.service.duty.EgovDutyService;
import com.company.project.service.duty.dto.DutyDto;

import com.company.project.web.adapter.BoardAdapter;
import com.company.project.web.adapter.ScheduleAdapter;
import com.company.project.web.adapter.NameCardAdapter;
import com.company.project.web.adapter.TemplateAdapter;
import com.company.project.web.adapter.CommunityAdapter;
import com.company.project.web.adapter.ScrapAdapter;
import com.company.project.web.adapter.SmsAdapter;
import com.company.project.web.adapter.MailAdapter;
import com.company.project.web.adapter.DeptJobBoxAdapter;
import com.company.project.web.adapter.MemoReportAdapter;
import com.company.project.web.adapter.DiaryAdapter;

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
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.cop.scp.service.ScrapVO;
import egovframework.com.cop.sms.service.SmsVO;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.cop.smt.djm.service.DeptJobBxVO;
import egovframework.com.cop.smt.mrm.service.MemoReprtVO;
import egovframework.com.cop.smt.lsm.service.LeaderSchdulVO;
import egovframework.com.cop.smt.wmr.service.WikMnthngReprtVO;
import egovframework.com.cop.smt.dsm.service.DiaryManageVO;

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
    private final EgovCommunityService egovCommunityService;
    private final EgovScrapService egovScrapService;
    private final EgovSmsService egovSmsService;
    private final EgovMailService egovMailService;
    private final EgovDeptJobBoxService egovDeptJobBoxService;
    private final EgovMemoReportService egovMemoReportService;
    private final EgovLeaderScheduleService egovLeaderScheduleService;
    private final EgovWorkReportService egovWorkReportService;
    private final EgovDutyService egovDutyService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    /**
     * 게시판 마스터 목록 (게시판 사용 관리)
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
     * 게시물 목록
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
     * 템플릿 목록
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
     * 스크랩 목록
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
     * 커뮤니티 목록
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
     * 문자메시지 목록
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
     * 주소록 관리
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
     * 게시판 사용 정보 조회 (게시판사용정보)
     */
    /*
     * @RequestMapping("/cop/com/selectBBSUseInfs.do") public String
     * selectBBSUseInfs(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO,
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
     * "egovframework/com/cop/com/EgovBBSUseInfList"; }
     */

    /**
     * 명함 관리 목록
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
     * 내 명함 목록
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
     * 개인일정관리 목록
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
     * // 개인 일정은 본인 것만 조회 Page<ScheduleDto> pageResult =
     * egovScheduleService.getScheduleList(getUserId(), pageable);
     * 
     * model.addAttribute("resultList",
     * ScheduleAdapter.toVOList(pageResult.getContent()));
     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return
     * "egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageList"; }
     */

    /**
     * 부서일정관리 목록
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
     * // 부서ID가 있으면 부서 일정 조회, 없으면 전체 등... 로직 필요하나 여기선 단순화 Page<ScheduleDto>
     * pageResult = egovScheduleService.getScheduleList("2",
     * searchVO.getSchdulDeptId(), pageable); // 2: // 부서일정
     * 
     * model.addAttribute("resultList",
     * ScheduleAdapter.toVOList(pageResult.getContent()));
     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return
     * "egovframework/com/cop/smt/sdm/EgovDeptSchdulManageList"; }
     */

    /**
     * 전체일정관리 목록
     */
    /*
     * @RequestMapping("/cop/smt/sam/EgovAllSchdulManageList.do") public String
     * selectAllSchdulList(@ModelAttribute("searchVO") IndvdlSchdulManageVO
     * searchVO, ModelMap model) throws Exception { PaginationInfo paginationInfo =
     * setupPaging(searchVO.getPageIndex(), searchVO.getPageUnit(), model);
     * PageRequest pageable = PageRequest.of(searchVO.getPageIndex() - 1,
     * paginationInfo.getRecordCountPerPage());
     * 
     * // 전체 일정 (모든 스케줄) Page<ScheduleDto> pageResult =
     * egovScheduleService.getScheduleList(null, pageable);
     * 
     * model.addAttribute("resultList",
     * ScheduleAdapter.toVOList(pageResult.getContent()));
     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return
     * "egovframework/com/cop/smt/sam/EgovAllSchdulManageList"; }
     */

    /**
     * 일지관리 목록
     */
    /*
     * @RequestMapping("/cop/smt/dsm/EgovDiaryManageList.do") public String
     * selectDiaryList(@ModelAttribute("searchVO") DiaryManageVO searchVO, ModelMap
     * model) throws Exception { if (!EgovUserDetailsHelper.isAuthenticated())
     * return "redirect:/uat/uia/egovLoginUsr.do";
     * 
     * // 일지는 날짜 기반 조회가 많으므로 단순 리스트 조회. 페이징은 서비스 구현에 따라 다름. // 현재 DutyService는 리스트
     * 반환 //
     * TODO: Pagination 적용 List<DutyDto> list =
     * egovDutyService.getDutyList(searchVO.getSearchKeyword());
     * 
     * model.addAttribute("resultList", DiaryAdapter.toVOList(list));
     * model.addAttribute("resultCnt", list.size()); return
     * "egovframework/com/cop/smt/dsm/EgovDiaryManageList"; }
     */

    /**
     * 메일발송 등록 화면
     */
    /*
     * @RequestMapping("/cop/ems/insertSndngMailView.do") public String
     * insertSndngMailView(@ModelAttribute("searchVO") SndngMailVO searchVO,
     * ModelMap model) throws Exception { return
     * "egovframework/com/cop/ems/EgovSndngMailRegist"; }
     */

    /**
     * 발송메일 내역 목록
     */
    /*
     * @RequestMapping("/cop/ems/selectSndngMailList.do") public String
     * selectSndngMailList(@ModelAttribute("searchVO") SndngMailVO searchVO,
     * ModelMap model) throws Exception { if
     * (!EgovUserDetailsHelper.isAuthenticated()) return
     * "redirect:/uat/uia/egovLoginUsr.do";
     * 
     * PaginationInfo paginationInfo = setupPaging(searchVO.getPageIndex(),
     * searchVO.getPageUnit(), model); PageRequest pageable =
     * PageRequest.of(searchVO.getPageIndex() - 1,
     * paginationInfo.getRecordCountPerPage());
     * 
     * Page<SentMailDto> pageResult =
     * egovMailService.getSentMailList(searchVO.getSearchWrd(), pageable);
     * 
     * model.addAttribute("resultList",
     * MailAdapter.toVOList(pageResult.getContent()));
     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return
     * "egovframework/com/cop/ems/EgovSndngMailList"; }
     */

    /**
     * 간부일정관리 목록
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
     * // LeaderScheduleAdapter가 없으므로 DTO 직접 사용하거나 Adapter 필요. ScheduleAdapter 재사용
     * 가능성
     * // 확인. // 임시로 Content 그대로 전달 (JSP에서 바인딩 확인 필요)
     * model.addAttribute("resultList", pageResult.getContent());
     * model.addAttribute("resultCnt", pageResult.getTotalElements()); return
     * "egovframework/com/cop/smt/lsm/EgovLeaderSchdulList"; }
     */

    /**
     * 주간/월간보고 목록
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
     * 메모할일 목록
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
     * 부서업무함 목록
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
     * 메모보고 목록
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
