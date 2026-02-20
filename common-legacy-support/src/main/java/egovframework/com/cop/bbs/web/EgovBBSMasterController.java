package egovframework.com.cop.bbs.web;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.dto.BoardMasterDto;
import com.company.project.web.adapter.BoardAdapter;

import lombok.RequiredArgsConstructor;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.bbs.service.Blog;
import egovframework.com.cop.bbs.service.BlogVO;
import egovframework.com.cop.bbs.service.BoardMaster;
import egovframework.com.cop.bbs.service.BoardMasterVO;
import egovframework.com.cop.bbs.service.EgovBBSMasterService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * BBS Master Controller
 **/
@RequiredArgsConstructor
public class EgovBBSMasterController {

    private final EgovBoardMasterService egovBoardMasterService; // New JPA Service
    @Resource(name = "EgovBBSMasterService")
    private EgovBBSMasterService egovBBSMasterService; // Legacy Service kept for unmigrated methods

    @Resource(name = "EgovCmmUseService")
    private EgovCmmUseService cmmUseService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name = "egovBBSMstrIdGnrService")
    private EgovIdGnrService idgenServiceBbs;

    @Resource(name = "egovBlogIdGnrService")
    private EgovIdGnrService idgenServiceBlog;

    /** EgovMessageSource **/
    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    @RequestMapping("/cop/bbs/insertBBSMasterView.do")
    public String insertBBSMasterView(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO, ModelMap model)
            throws Exception {
        BoardMasterVO boardMaster = new BoardMasterVO();
        ComDefaultCodeVO vo = new ComDefaultCodeVO();
        vo.setCodeId("COM101");
        List<CmmnDetailCode> codeResult = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("bbsTyCode", codeResult);
        model.addAttribute("boardMasterVO", boardMaster);

        model.addAttribute("useComment", "true");
        model.addAttribute("useSatisfaction", "true");

        return "egovframework/com/cop/bbs/EgovBBSMasterRegist";
    }

    @RequestMapping("/cop/bbs/insertBBSMaster.do")
    public String insertBBSMaster(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO,
            @Valid @ModelAttribute("boardMaster") BoardMaster boardMaster,
            BindingResult bindingResult, ModelMap model) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (bindingResult.hasErrors()) {
            ComDefaultCodeVO vo = new ComDefaultCodeVO();
            vo.setCodeId("COM101");
            List<CmmnDetailCode> codeResult = cmmUseService.selectCmmCodeDetail(vo);
            model.addAttribute("bbsTyCode", codeResult);
            return "egovframework/com/cop/bbs/EgovBBSMasterRegist";
        }

        if (isAuthenticated) {
            boardMaster.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
            if ((boardMasterVO == null ? "" : EgovStringUtil.isNullToString(boardMasterVO.getBlogAt())).equals("Y")) {
                boardMaster.setBlogAt("Y");
            } else {
                boardMaster.setBlogAt("N");
            }

            BoardMasterDto dto = BoardAdapter.toMasterDto(boardMaster);
            egovBoardMasterService.createBoardMaster(dto);
        }
        if (boardMaster.getBlogAt().equals("Y")) {
            return "forward:/cop/bbs/selectArticleBlogList.do";
        } else {
            return "forward:/cop/bbs/selectBBSMasterInfs.do";
        }
    }

    @IncludedInfo(name = "Legacy Controller", order = 180, gid = 40)
    @RequestMapping("/cop/bbs/selectBBSMasterInfs.do")
    public String selectBBSMasterInfs(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO, ModelMap model)
            throws Exception {
        boardMasterVO.setPageUnit(propertyService.getInt("pageUnit"));
        boardMasterVO.setPageSize(propertyService.getInt("pageSize"));

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

        int totCnt = (int) pageResult.getTotalElements();

        List<BoardMasterVO> resultList = pageResult.getContent().stream()
                .map(BoardAdapter::toMasterVO)
                .collect(Collectors.toList());

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", resultList);
        model.addAttribute("resultCnt", totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/cop/bbs/EgovBBSMasterList";
    }

    @IncludedInfo(name = "Legacy Controller", order = 170, gid = 40)
    @RequestMapping("/cop/bbs/selectBlogList.do")
    public String selectBlogMasterList(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO, ModelMap model)
            throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        boardMasterVO.setPageUnit(propertyService.getInt("pageUnit"));
        boardMasterVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(boardMasterVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(boardMasterVO.getPageUnit());
        paginationInfo.setPageSize(boardMasterVO.getPageSize());

        boardMasterVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        boardMasterVO.setLastIndex(paginationInfo.getLastRecordIndex());
        boardMasterVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
        boardMasterVO.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

        PageRequest pageable = PageRequest.of(boardMasterVO.getPageIndex() - 1, boardMasterVO.getPageUnit());
        Page<BoardMasterDto> pageResult = egovBoardMasterService.getBoardMasterList(boardMasterVO.getSearchCnd(),
                boardMasterVO.getSearchWrd(), pageable);

        int totCnt = (int) pageResult.getTotalElements();

        List<BoardMasterVO> resultList = pageResult.getContent().stream()
                .map(BoardAdapter::toMasterVO)
                .collect(Collectors.toList());

        paginationInfo.setTotalRecordCount(totCnt);

        model.addAttribute("resultList", resultList);
        model.addAttribute("resultCnt", totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        return "egovframework/com/cop/bbs/EgovBlogList";
    }

    @RequestMapping("/cop/bbs/insertBlogMasterView.do")
    public String insertBlogMasterView(@ModelAttribute("searchVO") BlogVO blogVO, ModelMap model) throws Exception {
        model.addAttribute("blogMasterVO", new BlogVO());
        return "egovframework/com/cop/bbs/EgovBlogRegist";
    }

    @RequestMapping("/cop/bbs/selectChkBloguser.do")
    public ModelAndView chkBlogUser(@ModelAttribute("searchVO") BlogVO blogVO, ModelMap model) throws Exception {
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {
            throw new IllegalAccessException("Login Required!");
        }

        model.addAttribute("blogMasterVO", new BlogVO());

        String userVal = "";
        blogVO.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
        userVal = egovBBSMasterService.checkBlogUser(blogVO);

        ModelAndView mav = new ModelAndView("jsonView");
        mav.addObject("userChk", userVal);
        return mav;
    }

    @RequestMapping("/cop/bbs/insertBlogMaster.do")
    public String insertBlogMaster(@ModelAttribute("searchVO") BlogVO blogVO,
            @Valid @ModelAttribute("blogMaster") Blog blog,
            BindingResult bindingResult, ModelMap model) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        blogVO.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
        BlogVO vo = egovBBSMasterService.checkBlogUser2(blogVO);

        if (vo != null) {
            model.addAttribute("blogMasterVO", new BlogVO());
            model.addAttribute("message", egovMessageSource.getMessage("comCopBlog.validate.blogUserCheck"));
            return "egovframework/com/cop/bbs/EgovBlogRegist";
        }

        if (bindingResult.hasErrors()) {
            return "egovframework/com/cop/bbs/EgovBlogRegist";
        }

        egovBBSMasterService.insertBlogMasterAndBoardBlogUserRqst(blog, user);

        return "forward:/cop/bbs/selectBlogList.do";
    }

    @RequestMapping("/cop/bbs/selectBBSMasterDetail.do")
    public String selectBBSMasterDetail(@ModelAttribute("searchVO") BoardMasterVO searchVO, ModelMap model)
            throws Exception {
        BoardMasterDto dto = egovBoardMasterService.getBoardMaster(searchVO.getBbsId());
        BoardMasterVO vo = BoardAdapter.toMasterVO(dto);

        model.addAttribute("result", vo);

        model.addAttribute("useComment", "true");
        model.addAttribute("useSatisfaction", "true");

        return "egovframework/com/cop/bbs/EgovBBSMasterDetail";
    }

    @RequestMapping("/cop/bbs/updateBBSMasterView.do")
    public String updateBBSMasterView(@RequestParam("bbsId") String bbsId,
            @ModelAttribute("searchVO") BoardMaster searchVO, ModelMap model)
            throws Exception {

        BoardMasterVO boardMasterVO = new BoardMasterVO();
        ComDefaultCodeVO vo = new ComDefaultCodeVO();
        vo.setCodeId("COM101");
        List<CmmnDetailCode> codeResult = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("bbsTyCode", codeResult);

        boardMasterVO.setBbsId(bbsId);

        BoardMasterDto dto = egovBoardMasterService.getBoardMaster(bbsId);
        BoardMasterVO resultVo = BoardAdapter.toMasterVO(dto);

        model.addAttribute("boardMasterVO", resultVo);

        model.addAttribute("useComment", "true");
        model.addAttribute("useSatisfaction", "true");

        return "egovframework/com/cop/bbs/EgovBBSMasterUpdt";
    }

    @RequestMapping("/cop/bbs/updateBBSMaster.do")
    public String updateBBSMaster(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO,
            @Valid @ModelAttribute("boardMaster") BoardMaster boardMaster,
            BindingResult bindingResult, ModelMap model) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (bindingResult.hasErrors()) {
            BoardMasterDto dto = egovBoardMasterService.getBoardMaster(boardMasterVO.getBbsId());
            BoardMasterVO vo = BoardAdapter.toMasterVO(dto);

            model.addAttribute("result", vo);

            ComDefaultCodeVO comVo = new ComDefaultCodeVO();
            comVo.setCodeId("COM101");
            List<CmmnDetailCode> codeResult = cmmUseService.selectCmmCodeDetail(comVo);
            model.addAttribute("bbsTyCode", codeResult);

            return "egovframework/com/cop/bbs/EgovBBSMasterUpdt";
        }

        if (isAuthenticated) {
            boardMaster.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

            BoardMasterDto dto = BoardAdapter.toMasterDto(boardMaster);
            egovBoardMasterService.updateBoardMaster(dto);
        }

        return "forward:/cop/bbs/selectBBSMasterInfs.do";
    }

    @RequestMapping("/cop/bbs/deleteBBSMaster.do")
    public String deleteBBSMaster(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO,
            @ModelAttribute("boardMaster") BoardMaster boardMaster) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (isAuthenticated) {
            egovBoardMasterService.deleteBoardMaster(boardMaster.getBbsId(), user.getUniqId());
        }
        return "forward:/cop/bbs/selectBBSMasterInfs.do";
    }

    @RequestMapping("/cop/bbs/selectBlogListPortlet.do")
    public String selectBlogListPortlet(@ModelAttribute("searchVO") BlogVO blogVO, ModelMap model) throws Exception {
        List<BlogVO> result = egovBBSMasterService.selectBlogListPortlet(blogVO);
        model.addAttribute("resultList", result);
        return "egovframework/com/cop/bbs/EgovBlogListPortlet";
    }

    @RequestMapping("/cop/bbs/selectBBSListPortlet.do")
    public String selectBBSListPortlet(@ModelAttribute("searchVO") BoardMasterVO boardMasterVO, ModelMap model)
            throws Exception {
        List<BoardMasterVO> result = egovBBSMasterService.selectBBSListPortlet(boardMasterVO);
        model.addAttribute("resultList", result);
        return "egovframework/com/cop/bbs/EgovBBSListPortlet";
    }
}
