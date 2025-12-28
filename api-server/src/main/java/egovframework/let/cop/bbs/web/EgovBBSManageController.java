package egovframework.let.cop.bbs.web;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.fdl.security.userdetails.util.EgovUserDetailsHelper;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.support.SessionStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.validation.Valid;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import com.company.project.service.file.EgovFileService;
import egovframework.let.cop.bbs.service.Board;
import egovframework.let.cop.bbs.service.BoardMaster;
import egovframework.let.cop.bbs.service.BoardMasterVO;
import egovframework.let.cop.bbs.service.BoardVO;
import egovframework.let.cop.bbs.service.EgovBBSAttributeManageService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;

/**
 * 게시물 관리를 위한 컨트롤러 클래스
 * 
 * @author 공통 서비스 개발팀 이삼섭
 * @since 2009.03.19
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자          수정내용
 *  -------    --------    ---------------------------
 *  2009.03.19  이삼섭          최초 생성
 *  2009.06.29  한성곤	       2단계 기능 추가 (댓글관리, 만족도조사)
 *  2011.08.31  JJY            경량환경 템플릿 커스터마이징버전 생성
 *
 *      </pre>
 */
@Controller
public class EgovBBSManageController {

    private static final org.slf4j.Logger LOGGER = org.slf4j.LoggerFactory.getLogger(EgovBBSManageController.class);

    @Resource(name = "EgovBBSAttributeManageService")
    private EgovBBSAttributeManageService bbsAttrbService;

    @Resource(name = "boardMasterRepository")
    private com.company.project.domain.board.BoardMasterRepository boardMasterRepository;

    @Resource(name = "egovBoardService")
    private com.company.project.service.board.EgovBoardService boardService;

    @Resource(name = "egovFileService")
    private EgovFileService egovFileService;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name = "egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
     * XSS 방지 처리.
     *
     * @param data
     * @return
     */
    protected String unscript(String data) {
        if (data == null || data.trim().equals("")) {
            return "";
        }

        String ret = data;

        ret = ret.replaceAll("<(S|s)(C|c)(R|r)(I|i)(P|p)(T|t)", "&lt;script");
        ret = ret.replaceAll("</(S|s)(C|c)(R|r)(I|i)(P|p)(T|t)", "&lt;/script");

        ret = ret.replaceAll("<(O|o)(B|b)(J|j)(E|e)(C|c)(T|t)", "&lt;object");
        ret = ret.replaceAll("</(O|o)(B|b)(J|j)(E|e)(C|c)(T|t)", "&lt;/object");

        ret = ret.replaceAll("<(A|a)(P|p)(P|p)(L|l)(E|e)(T|t)", "&lt;applet");
        ret = ret.replaceAll("</(A|a)(P|p)(P|p)(L|l)(E|e)(T|t)", "&lt;/applet");

        ret = ret.replaceAll("<(E|e)(M|m)(B|b)(E|e)(D|d)", "&lt;embed");
        ret = ret.replaceAll("</(E|e)(M|m)(B|b)(E|e)(D|d)", "&lt;embed");

        ret = ret.replaceAll("<(F|f)(O|o)(R|r)(M|m)", "&lt;form");
        ret = ret.replaceAll("</(F|f)(O|o)(R|r)(M|m)", "&lt;form");

        return ret;
    }

    /**
     * 게시물에 대한 목록을 조회한다.
     *
     * @param boardVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @GetMapping({ "/cop/bbs/selectBoardList.do", "/cop/bbs/admin/selectBoardList.do",
            "/cop/bbs/anonymous/selectBoardList.do" })
    public String selectBoardArticles(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model,
            HttpServletRequest request) throws Exception {
        // 메인화면에서 넘어온 경우 메뉴 갱신을 위해 추가
        request.getSession().setAttribute("baseMenuNo", "1000000");

        LoginVO user;
        if (EgovUserDetailsHelper.isAuthenticated()) {
            user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        } else {
            user = new LoginVO();
            user.setUniqId("anonymous");
        }

        boardVO.setBbsId(boardVO.getBbsId());
        boardVO.setBbsNm(boardVO.getBbsNm());

        // BoardMasterVO vo = new BoardMasterVO();
        // vo.setBbsId(boardVO.getBbsId());
        // vo.setUniqId(user.getUniqId());
        // BoardMasterVO master = bbsAttrbService.selectBBSMasterInf(vo);

        // Hibernate/JPA 기반으로 마스터 정보 조회
        com.company.project.domain.board.BoardMaster jpaMaster = boardMasterRepository.findById(boardVO.getBbsId())
                .orElseThrow(() -> new RuntimeException("Board Master not found: " + boardVO.getBbsId()));

        BoardMasterVO master = new BoardMasterVO();
        master.setBbsId(jpaMaster.getBbsId());
        master.setBbsNm(jpaMaster.getBbsNm());
        master.setBbsTyCode(jpaMaster.getBbsTyCode());
        master.setBbsAttrbCode(jpaMaster.getBbsAttrbCode());
        master.setReplyPosblAt(jpaMaster.getReplyPosblAt());
        master.setFileAtchPosblAt(jpaMaster.getFileAtchPosblAt());
        master.setPosblAtchFileNumber(jpaMaster.getAtchPosblFileNumber());

        LOGGER.debug("### Notice Board Master: ID={}, Name={}, Attr={}", master.getBbsId(), master.getBbsNm(),
                master.getBbsAttrbCode());

        // -------------------------------
        // 방명록이면 방명록 URL로 forward
        // -------------------------------
        if (master.getBbsTyCode().equals("BBST04")) {
            return "forward:/cop/bbs/selectGuestList.do";
        }
        //// -----------------------------

        boardVO.setPageUnit(propertyService.getInt("pageUnit"));
        boardVO.setPageSize(propertyService.getInt("pageSize"));

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                boardVO.getPageIndex() - 1,
                boardVO.getPageUnit());

        org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> page = boardService
                .getBoardPosts(boardVO.getBbsId(), boardVO.getSearchCnd(), boardVO.getSearchWrd(), pageable);

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
        paginationInfo.setPageSize(boardVO.getPageSize());
        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        // DTO를 VO로 변환하여 JSP 호환성 유지
        List<BoardVO> resultList = new ArrayList<>();
        for (com.company.project.service.board.dto.BoardDto dto : page.getContent()) {
            BoardVO board = new BoardVO();
            board.setNttId(dto.getId());
            board.setNttSj(dto.getNttSj());
            board.setFrstRegisterNm(dto.getNtcrNm());
            board.setFrstRegisterPnttm(
                    dto.getFrstRegisterPnttm() != null
                            ? dto.getFrstRegisterPnttm()
                                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                            : "");
            board.setInqireCo(dto.getInqireCo());
            board.setReplyLc(dto.getReplyLc() != null ? dto.getReplyLc().toString() : "0");
            board.setUseAt(dto.getUseAt() != null ? dto.getUseAt() : "Y");
            board.setIsExpired(dto.getIsExpired() != null ? dto.getIsExpired() : "N");
            board.setNtceBgnde(dto.getNtceBgnde());
            board.setNtceEndde(dto.getNtceEndde());
            board.setBbsId(dto.getBbsId());
            resultList.add(board);
        }

        LOGGER.debug("### Notice Board Result Count: {}", resultList.size());

        model.addAttribute("resultList", resultList);
        model.addAttribute("resultCnt", Long.toString(page.getTotalElements()));
        model.addAttribute("boardVO", boardVO);
        model.addAttribute("brdMstrVO", master);
        model.addAttribute("paginationInfo", paginationInfo);

        return "cop/bbs/EgovNoticeList";
    }

    /**
     * 게시판 목록 조회 (레거시 ArticleList 경로)
     */
    @RequestMapping("/cop/bbs/selectArticleList.do")
    public String selectArticleList(
            @ModelAttribute("searchVO") BoardVO boardVO,
            @RequestParam(required = false) String bbsId,
            ModelMap model) throws Exception {

        if (bbsId == null || bbsId.isEmpty()) {
            bbsId = "BBSMSTR_AAAAAAAAAAAA";
        }
        boardVO.setBbsId(bbsId);

        boardVO.setPageUnit(propertyService.getInt("pageUnit"));
        boardVO.setPageSize(propertyService.getInt("pageSize"));

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                boardVO.getPageIndex() - 1,
                boardVO.getPageUnit());

        org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> page = boardService
                .getBoardPosts(bbsId, boardVO.getSearchCnd(), boardVO.getSearchWrd(), pageable);

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
        paginationInfo.setPageSize(boardVO.getPageSize());
        paginationInfo.setTotalRecordCount((int) page.getTotalElements());

        model.addAttribute("resultList", page.getContent());
        model.addAttribute("paginationInfo", paginationInfo);

        // 게시판 정보 (Notice와 달리 Map으로 구성하는 경우 대응)
        Map<String, Object> boardMasterVO = new HashMap<>();
        boardMasterVO.put("bbsId", bbsId);
        boardMasterVO.put("bbsNm", getBoardName(bbsId));
        boardMasterVO.put("tmplatCours", "/css/egovframework/com/com.css");

        model.addAttribute("boardMasterVO", boardMasterVO);
        model.addAttribute("brdMstrVO", boardMasterVO);

        return "cop/bbs/EgovArticleList";
    }

    /**
     * 게시판 이름 조회 (레거시 지원용)
     */
    private String getBoardName(String bbsId) {
        if ("BBSMSTR_AAAAAAAAAAAA".equals(bbsId)) {
            return "공지사항";
        } else if ("BBSMSTR_CCCCCCCCCCCC".equals(bbsId)) {
            return "업무게시판";
        }
        return "게시판";
    }

    /**
     * 디버그용 게시판 목록 조회 (JSON)
     */
    @GetMapping("/cop/bbs/debugBoardList.do")
    @ResponseBody
    public Map<String, Object> debugBoardList(@RequestParam(required = false) String bbsId) {
        Map<String, Object> result = new HashMap<>();

        if (bbsId == null || bbsId.isEmpty()) {
            bbsId = "BBSMSTR_AAAAAAAAAAAA";
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        org.springframework.data.domain.Page<com.company.project.service.board.dto.BoardDto> page = boardService
                .getBoardPosts(bbsId, pageable);

        result.put("bbsId", bbsId);
        result.put("bbsNm", getBoardName(bbsId));
        result.put("resultList", page.getContent());
        result.put("totalCount", page.getTotalElements());

        return result;
    }

    /**
     * 게시물에 대한 상세 정보를 조회한다.
     *
     * @param boardVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @GetMapping({ "/cop/bbs/selectBoardArticle.do", "/cop/bbs/admin/selectBoardArticle.do",
            "/cop/bbs/anonymous/selectBoardArticle.do" })
    public String selectBoardArticle(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
        LoginVO user = new LoginVO();
        if (EgovUserDetailsHelper.isAuthenticated()) {
            user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        }
        // 조회수 증가 여부 지정
        boardVO.setPlusCount(true);

        if (!boardVO.getSubPageIndex().equals("")) {
            boardVO.setPlusCount(false);
        }

        boardVO.setLastUpdusrId(user.getUniqId());

        // 상세 조회 시 bbsId와 nttId 모두 전달
        com.company.project.service.board.dto.BoardDto dto = boardService.getPostDetail(boardVO.getBbsId(),
                boardVO.getNttId());

        // 마스터 정보 조회
        BoardMaster masterMatch = new BoardMaster();
        masterMatch.setBbsId(boardVO.getBbsId());
        masterMatch.setUniqId(user.getUniqId());
        BoardMasterVO masterVo = bbsAttrbService.selectBBSMasterInf(masterMatch);

        if (masterVo.getTmplatCours() == null || masterVo.getTmplatCours().equals("")) {
            masterVo.setTmplatCours("/css/egovframework/cop/bbs/egovBaseTemplate.css");
        }

        BoardVO vo = new BoardVO();
        vo.setNttId(dto.getId());
        vo.setNttSj(dto.getNttSj());
        vo.setNttCn(dto.getNttCn());
        vo.setFrstRegisterNm(dto.getNtcrNm());
        vo.setFrstRegisterPnttm(
                dto.getFrstRegisterPnttm() != null
                        ? dto.getFrstRegisterPnttm().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "");
        vo.setInqireCo(dto.getInqireCo());
        vo.setAtchFileId(dto.getAtchFileId());
        vo.setBbsId(dto.getBbsId());
        vo.setBbsNm(masterVo.getBbsNm());
        vo.setParnts(dto.getParnts());
        vo.setSortOrdr(dto.getSortOrdr());
        vo.setReplyLc(dto.getReplyLc() != null ? dto.getReplyLc().toString() : "0");

        model.addAttribute("result", vo);
        model.addAttribute("sessionUniqId", user.getUniqId());
        model.addAttribute("brdMstrVO", masterVo);

        return "cop/bbs/EgovNoticeInqire";
    }

    /**
     * 게시글 상세 조회 (레거시 ArticleDetail 경로)
     */
    @RequestMapping("/cop/bbs/selectArticleDetail.do")
    public String selectArticleDetail(
            @ModelAttribute("searchVO") BoardVO boardVO,
            @RequestParam(required = false) String bbsId,
            @RequestParam(required = false) Long nttId,
            ModelMap model) throws Exception {

        com.company.project.service.board.dto.BoardDto result = boardService.getPostDetail(bbsId, nttId);

        Map<String, Object> boardMasterVO = new HashMap<>();
        boardMasterVO.put("bbsId", bbsId);
        boardMasterVO.put("bbsNm", getBoardName(bbsId));
        boardMasterVO.put("replyPosblAt", "Y");
        boardMasterVO.put("tmplatCours", "/css/egovframework/com/com.css");

        model.addAttribute("boardMasterVO", boardMasterVO);
        model.addAttribute("brdMstrVO", boardMasterVO);
        model.addAttribute("result", result);
        model.addAttribute("sessionUniqId", "USRCNFRM_00000000001");
        model.addAttribute("useComment", "false");
        model.addAttribute("useSatisfaction", "false");

        return "cop/bbs/EgovArticleDetail";
    }

    /**
     * 게시물 등록을 위한 등록페이지로 이동한다.
     *
     * @param boardVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @GetMapping({ "/cop/bbs/addBoardArticle.do", "/cop/bbs/admin/addBoardArticle.do",
            "/cop/bbs/anonymous/addBoardArticle.do" })
    public String addBoardArticle(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        BoardMasterVO bdMstr = new BoardMasterVO();

        if (isAuthenticated) {

            BoardMasterVO vo = new BoardMasterVO();
            vo.setBbsId(boardVO.getBbsId());
            vo.setUniqId(user.getUniqId());
            bdMstr = bbsAttrbService.selectBBSMasterInf(vo);
            model.addAttribute("bdMstr", bdMstr);
        }

        // ----------------------------
        // 기본 BBS template 지정
        // ----------------------------
        if (bdMstr.getTmplatCours() == null || bdMstr.getTmplatCours().equals("")) {
            bdMstr.setTmplatCours("/css/egovframework/cop/bbs/egovBaseTemplate.css");
        }

        model.addAttribute("brdMstrVO", bdMstr);
        //// -----------------------------

        return "cop/bbs/EgovNoticeRegist";
    }

    /**
     * 게시물을 등록한다.
     *
     * @param boardVO
     * @param board
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @PostMapping({ "/cop/bbs/insertBoardArticle.do", "/cop/bbs/admin/insertBoardArticle.do",
            "/cop/bbs/anonymous/insertBoardArticle.do" })
    public String insertBoardArticle(final MultipartHttpServletRequest multiRequest,
            @ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("bdMstr") BoardMaster bdMstr,
            @Valid @ModelAttribute("board") Board board, BindingResult bindingResult, SessionStatus status,
            ModelMap model,
            RedirectAttributes redirectAttributes)
            throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (bindingResult.hasErrors()) {

            BoardMasterVO master = new BoardMasterVO();
            BoardMasterVO vo = new BoardMasterVO();

            vo.setBbsId(boardVO.getBbsId());
            vo.setUniqId(user.getUniqId());

            master = bbsAttrbService.selectBBSMasterInf(vo);

            model.addAttribute("bdMstr", master);

            // ----------------------------
            // 기본 BBS template 지정
            // ----------------------------
            if (master.getTmplatCours() == null || master.getTmplatCours().equals("")) {
                master.setTmplatCours("/css/egovframework/cop/bbs/egovBaseTemplate.css");
            }

            model.addAttribute("brdMstrVO", master);
            //// -----------------------------

            return "cop/bbs/EgovNoticeRegist";
        }

        if (isAuthenticated) {
            String atchFileId = "";

            final Map<String, MultipartFile> files = multiRequest.getFileMap();
            if (!files.isEmpty()) {
                atchFileId = egovFileService.uploadFiles(new ArrayList<>(files.values()));
            }
            board.setAtchFileId(atchFileId);
            board.setFrstRegisterId(user.getUniqId());
            board.setBbsId(board.getBbsId());

            board.setNtcrNm(""); // dummy 오류 수정 (익명이 아닌 경우 validator 처리를 위해 dummy로 지정됨)
            board.setPassword(""); // dummy 오류 수정 (익명이 아닌 경우 validator 처리를 위해 dummy로 지정됨)

            board.setNttCn(unscript(board.getNttCn())); // XSS 방지

            com.company.project.service.board.dto.BoardSaveRequest saveRequest = new com.company.project.service.board.dto.BoardSaveRequest(
                    board.getBbsId(),
                    board.getNttSj(),
                    board.getNttCn(),
                    board.getNtceBgnde(),
                    board.getNtceEndde(),
                    board.getAtchFileId());
            boardService.createPost(user.getUniqId(), saveRequest);
        }

        redirectAttributes.addAttribute("bbsId", boardVO.getBbsId());
        redirectAttributes.addAttribute("searchCnd", boardVO.getSearchCnd());
        redirectAttributes.addAttribute("searchWrd", boardVO.getSearchWrd());
        redirectAttributes.addAttribute("pageIndex", boardVO.getPageIndex());

        return "redirect:/cop/bbs/selectBoardList.do";
    }

    /**
     * 게시물에 대한 답변 등록을 위한 등록페이지로 이동한다.
     *
     * @param boardVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @GetMapping({ "/cop/bbs/addReplyBoardArticle.do", "/cop/bbs/admin/addReplyBoardArticle.do",
            "/cop/bbs/anonymous/addReplyBoardArticle.do" })
    public String addReplyBoardArticle(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
        if (!isAuthenticated) {
            model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
            return "uat/uia/EgovLoginUsr";
        }
        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

        BoardMasterVO master = new BoardMasterVO();
        BoardMasterVO vo = new BoardMasterVO();

        vo.setBbsId(boardVO.getBbsId());
        vo.setUniqId(user.getUniqId());

        master = bbsAttrbService.selectBBSMasterInf(vo);

        model.addAttribute("bdMstr", master);
        model.addAttribute("result", boardVO);

        // ----------------------------
        // 기본 BBS template 지정
        // ----------------------------
        if (master.getTmplatCours() == null || master.getTmplatCours().equals("")) {
            master.setTmplatCours("/css/egovframework/cop/bbs/egovBaseTemplate.css");
        }

        model.addAttribute("brdMstrVO", master);
        //// -----------------------------

        return "cop/bbs/EgovNoticeReply";
    }

    /**
     * 게시물에 대한 답변을 등록한다.
     *
     * @param boardVO
     * @param board
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @PostMapping({ "/cop/bbs/replyBoardArticle.do", "/cop/bbs/admin/replyBoardArticle.do",
            "/cop/bbs/anonymous/replyBoardArticle.do" })
    public String replyBoardArticle(final MultipartHttpServletRequest multiRequest,
            @ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("bdMstr") BoardMaster bdMstr,
            @Valid @ModelAttribute("board") Board board, BindingResult bindingResult, ModelMap model,
            SessionStatus status,
            RedirectAttributes redirectAttributes)
            throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (bindingResult.hasErrors()) {
            BoardMasterVO master = new BoardMasterVO();
            BoardMasterVO vo = new BoardMasterVO();

            vo.setBbsId(boardVO.getBbsId());
            vo.setUniqId(user.getUniqId());

            master = bbsAttrbService.selectBBSMasterInf(vo);

            model.addAttribute("bdMstr", master);
            model.addAttribute("result", boardVO);

            // ----------------------------
            // 기본 BBS template 지정
            // ----------------------------
            if (master.getTmplatCours() == null || master.getTmplatCours().equals("")) {
                master.setTmplatCours("/css/egovframework/cop/bbs/egovBaseTemplate.css");
            }

            model.addAttribute("brdMstrVO", master);
            //// -----------------------------

            return "cop/bbs/EgovNoticeReply";
        }

        if (isAuthenticated) {
            final Map<String, MultipartFile> files = multiRequest.getFileMap();
            String atchFileId = "";

            if (!files.isEmpty()) {
                atchFileId = egovFileService.uploadFiles(new ArrayList<>(files.values()));
            }

            board.setAtchFileId(atchFileId);
            board.setReplyAt("Y");
            board.setFrstRegisterId(user.getUniqId());
            board.setBbsId(board.getBbsId());
            board.setParnts(Long.toString(boardVO.getNttId()));
            board.setSortOrdr(boardVO.getSortOrdr());
            board.setReplyLc(Integer.toString(Integer.parseInt(boardVO.getReplyLc()) + 1));

            board.setNtcrNm(""); // dummy 오류 수정 (익명이 아닌 경우 validator 처리를 위해 dummy로 지정됨)
            board.setPassword(""); // dummy 오류 수정 (익명이 아닌 경우 validator 처리를 위해 dummy로 지정됨)

            board.setNttCn(unscript(board.getNttCn())); // XSS 방지

            com.company.project.service.board.dto.BoardSaveRequest saveRequest = new com.company.project.service.board.dto.BoardSaveRequest(
                    board.getBbsId(),
                    board.getNttSj(),
                    board.getNttCn(),
                    board.getNtceBgnde(),
                    board.getNtceEndde(),
                    board.getAtchFileId());
            boardService.replyPost(user.getUniqId(), boardVO.getNttId(), saveRequest);
        }

        redirectAttributes.addAttribute("bbsId", boardVO.getBbsId());
        redirectAttributes.addAttribute("searchCnd", boardVO.getSearchCnd());
        redirectAttributes.addAttribute("searchWrd", boardVO.getSearchWrd());
        redirectAttributes.addAttribute("pageIndex", boardVO.getPageIndex());

        return "redirect:/cop/bbs/selectBoardList.do";
    }

    /**
     * 게시물 수정을 위한 수정페이지로 이동한다.
     *
     * @param boardVO
     * @param vo
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @GetMapping({ "/cop/bbs/forUpdateBoardArticle.do", "/cop/bbs/admin/forUpdateBoardArticle.do",
            "/cop/bbs/anonymous/forUpdateBoardArticle.do" })
    public String selectBoardArticleForUpdt(@ModelAttribute("searchVO") BoardVO boardVO,
            @ModelAttribute("board") BoardVO vo, ModelMap model) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        boardVO.setFrstRegisterId(user.getUniqId());

        BoardMaster master = new BoardMaster();
        BoardMasterVO bmvo = new BoardMasterVO();
        BoardVO bdvo = new BoardVO();

        vo.setBbsId(boardVO.getBbsId());

        master.setBbsId(boardVO.getBbsId());
        master.setUniqId(user.getUniqId());

        if (isAuthenticated) {
            bmvo = bbsAttrbService.selectBBSMasterInf(master);

            com.company.project.service.board.dto.BoardDto dto = boardService.getPostDetail(boardVO.getBbsId(),
                    boardVO.getNttId());
            bdvo = new BoardVO();
            bdvo.setNttId(dto.getId());
            bdvo.setNttSj(dto.getNttSj());
            bdvo.setNttCn(dto.getNttCn());
            bdvo.setFrstRegisterNm(dto.getNtcrNm());
            bdvo.setAtchFileId(dto.getAtchFileId());
            bdvo.setBbsId(dto.getBbsId());
            bdvo.setNtceBgnde(dto.getNtceBgnde());
            bdvo.setNtceEndde(dto.getNtceEndde());
        }

        model.addAttribute("result", bdvo);
        model.addAttribute("bdMstr", bmvo);

        // ----------------------------
        // 기본 BBS template 지정
        // ----------------------------
        if (bmvo.getTmplatCours() == null || bmvo.getTmplatCours().equals("")) {
            bmvo.setTmplatCours("/css/egovframework/cop/bbs/egovBaseTemplate.css");
        }

        model.addAttribute("brdMstrVO", bmvo);
        //// -----------------------------

        return "cop/bbs/EgovNoticeUpdt";
    }

    /**
     * 게시물에 대한 내용을 수정한다.
     *
     * @param boardVO
     * @param board
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @PostMapping({ "/cop/bbs/updateBoardArticle.do", "/cop/bbs/admin/updateBoardArticle.do",
            "/cop/bbs/anonymous/updateBoardArticle.do" })
    public String updateBoardArticle(final MultipartHttpServletRequest multiRequest,
            @ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("bdMstr") BoardMaster bdMstr,
            @Valid @ModelAttribute("board") Board board, BindingResult bindingResult, ModelMap model,
            SessionStatus status,
            RedirectAttributes redirectAttributes)
            throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        // 기존 게시글의 첨부파일 ID를 조회 시 bbsId와 nttId 모두 전달
        com.company.project.service.board.dto.BoardDto existingDto = boardService.getPostDetail(boardVO.getBbsId(),
                boardVO.getNttId());
        String atchFileId = existingDto.getAtchFileId();

        if (atchFileId == null) {
            atchFileId = "";
        }

        if (bindingResult.hasErrors()) {

            boardVO.setFrstRegisterId(user.getUniqId());

            // board 객체의 값으로 boardVO 설정 (form에서 전송된 값 사용)
            boardVO.setNttId(board.getNttId());
            boardVO.setBbsId(board.getBbsId());

            BoardMaster master = new BoardMaster();
            BoardMasterVO bmvo = new BoardMasterVO();
            BoardVO bdvo = new BoardVO();

            master.setBbsId(board.getBbsId());
            master.setUniqId(user.getUniqId());

            bmvo = bbsAttrbService.selectBBSMasterInf(master);

            bdvo = new BoardVO();
            bdvo.setNttId(existingDto.getId());
            bdvo.setNttSj(existingDto.getNttSj());
            bdvo.setNttCn(existingDto.getNttCn());
            bdvo.setFrstRegisterNm(existingDto.getNtcrNm());
            bdvo.setAtchFileId(existingDto.getAtchFileId());
            bdvo.setBbsId(existingDto.getBbsId());

            // board 객체에 첨부파일 ID 설정 (BindingResult 유지하면서 첨부파일 정보 복원)
            board.setAtchFileId(bdvo.getAtchFileId());

            model.addAttribute("result", bdvo);
            model.addAttribute("bdMstr", bmvo);
            // board 객체는 @ModelAttribute로 자동 추가되므로 별도 추가 불필요

            return "cop/bbs/EgovNoticeUpdt";
        }

        if (isAuthenticated) {
            final Map<String, MultipartFile> files = multiRequest.getFileMap();
            if (!files.isEmpty()) {
                if ("".equals(atchFileId)) {
                    atchFileId = egovFileService.uploadFiles(new ArrayList<>(files.values()));
                    board.setAtchFileId(atchFileId);
                } else {
                    egovFileService.updateFiles(atchFileId, new ArrayList<>(files.values()));
                    board.setAtchFileId(atchFileId);
                }
            }

            board.setLastUpdusrId(user.getUniqId());

            board.setNtcrNm(""); // dummy 오류 수정 (익명이 아닌 경우 validator 처리를 위해 dummy로 지정됨)
            board.setPassword(""); // dummy 오류 수정 (익명이 아닌 경우 validator 처리를 위해 dummy로 지정됨)

            board.setNttCn(unscript(board.getNttCn())); // XSS 방지

            com.company.project.service.board.dto.BoardSaveRequest saveRequest = new com.company.project.service.board.dto.BoardSaveRequest(
                    board.getBbsId(),
                    board.getNttSj(),
                    board.getNttCn(),
                    board.getNtceBgnde(),
                    board.getNtceEndde(),
                    board.getAtchFileId());
            boardService.updatePost(board.getBbsId(), board.getNttId(), saveRequest);
        }

        // redirect 시 파라미터 전달
        redirectAttributes.addAttribute("bbsId", boardVO.getBbsId());
        redirectAttributes.addAttribute("searchCnd", boardVO.getSearchCnd());
        redirectAttributes.addAttribute("searchWrd", boardVO.getSearchWrd());
        redirectAttributes.addAttribute("pageIndex", boardVO.getPageIndex());

        return "redirect:/cop/bbs/selectBoardList.do";
    }

    /**
     * 게시물에 대한 내용을 삭제한다.
     *
     * @param boardVO
     * @param board
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @PostMapping({ "/cop/bbs/deleteBoardArticle.do", "/cop/bbs/admin/deleteBoardArticle.do",
            "/cop/bbs/anonymous/deleteBoardArticle.do" })
    public String deleteBoardArticle(@ModelAttribute("searchVO") BoardVO boardVO, @ModelAttribute("board") Board board,
            @ModelAttribute("bdMstr") BoardMaster bdMstr, ModelMap model,
            RedirectAttributes redirectAttributes) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if (isAuthenticated) {
            boardService.deletePost(board.getBbsId(), board.getNttId(), user.getUniqId());
        }

        redirectAttributes.addAttribute("bbsId", boardVO.getBbsId());
        redirectAttributes.addAttribute("searchCnd", boardVO.getSearchCnd());
        redirectAttributes.addAttribute("searchWrd", boardVO.getSearchWrd());
        redirectAttributes.addAttribute("pageIndex", boardVO.getPageIndex());

        return "redirect:/cop/bbs/selectBoardList.do";
    }

    /**
     * 템플릿에 대한 미리보기용 게시물 목록을 조회한다.
     *
     * @param boardVO
     * @param sessionVO
     * @param model
     * @return
     * @throws Exception
     */
    @GetMapping("/cop/bbs/previewBoardList.do")
    public String previewBoardArticles(@ModelAttribute("searchVO") BoardVO boardVO, ModelMap model) throws Exception {

        String template = boardVO.getSearchWrd(); // 템플릿 URL

        BoardMasterVO master = new BoardMasterVO();

        master.setBbsNm("미리보기 게시판");

        boardVO.setPageUnit(propertyService.getInt("pageUnit"));
        boardVO.setPageSize(propertyService.getInt("pageSize"));

        PaginationInfo paginationInfo = new PaginationInfo();

        paginationInfo.setCurrentPageNo(boardVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(boardVO.getPageUnit());
        paginationInfo.setPageSize(boardVO.getPageSize());

        boardVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        boardVO.setLastIndex(paginationInfo.getLastRecordIndex());
        boardVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

        BoardVO target = null;
        List<BoardVO> list = new ArrayList<BoardVO>();

        target = new BoardVO();
        target.setNttSj("게시판 기능 설명");
        target.setFrstRegisterId("ID");
        target.setFrstRegisterNm("관리자");
        target.setFrstRegisterPnttm("2009-01-01");
        target.setInqireCo(7);
        target.setParnts("0");
        target.setReplyAt("N");
        target.setReplyLc("0");
        target.setUseAt("Y");

        list.add(target);

        target = new BoardVO();
        target.setNttSj("게시판 부가 기능 설명");
        target.setFrstRegisterId("ID");
        target.setFrstRegisterNm("관리자");
        target.setFrstRegisterPnttm("2009-01-01");
        target.setInqireCo(7);
        target.setParnts("0");
        target.setReplyAt("N");
        target.setReplyLc("0");
        target.setUseAt("Y");

        list.add(target);

        boardVO.setSearchWrd("");

        int totCnt = list.size();

        paginationInfo.setTotalRecordCount(totCnt);

        master.setTmplatCours(template);

        model.addAttribute("resultList", list);
        model.addAttribute("resultCnt", Integer.toString(totCnt));
        model.addAttribute("boardVO", boardVO);
        model.addAttribute("brdMstrVO", master);
        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("preview", "true");

        return "cop/bbs/EgovNoticeList";
    }
}
