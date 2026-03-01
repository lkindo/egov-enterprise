package egovframework.com.cop.cmt.web;

import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.cmt.service.Comment;
import egovframework.com.cop.cmt.service.CommentVO;
import egovframework.com.cop.cmt.service.EgovArticleCommentService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?볤? 愿由щ? ?꾪븳 而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?좎슜??
 * @since 2016.07.22
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------       --------    ---------------------------
 *   2016.07.22   ?좎슜??             理쒖큹 ?앹꽦
 *   2018.06.27     ?좎슜??	    ?볤? ?깅줉??泥섎━ ?덉쇅 ?섏젙
 * </pre>
 */

@Controller
public class EgovArticleCommentController {

	@Resource(name = "EgovArticleCommentService")
    protected EgovArticleCommentService egovArticleCommentService;

    @Resource(name="propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    //
                     Logger log = Logger.getLogger(this.getClass());

    /**
     * ?볤?愿由?紐⑸줉 議고쉶瑜??쒓났?쒕떎.
     *
     * @param boardVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmt/selectArticleCommentList.do")
    public String selectArticleCommentList(@ModelAttribute("searchVO") CommentVO commentVO, ModelMap model) throws Exception {

    	CommentVO articleCommentVO = new CommentVO();

		// ?섏젙 泥섎━?????볤? ?깅줉 ?붾㈃?쇰줈 泥섎━?섍린 ?꾪븳 援ы쁽
		if (commentVO.isModified()) {
		    commentVO.setCommentNo("");
		    commentVO.setCommentCn("");
		}

		// ?섏젙???꾪븳 泥섎━
		if (!commentVO.getCommentNo().equals("")) {
		    return "forward:/cop/cmt/updateArticleCommentView.do";
		}

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		model.addAttribute("sessionUniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		commentVO.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

//		commentVO.setSubPageUnit(propertyService.getInt("pageUnit"));
//		commentVO.setSubPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(commentVO.getSubPageIndex());
		paginationInfo.setRecordCountPerPage(commentVO.getSubPageUnit());
		paginationInfo.setPageSize(commentVO.getSubPageSize());

		commentVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
		commentVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
		commentVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = egovArticleCommentService.selectArticleCommentList(commentVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("type", "body");	// ?볤? ?섏씠吏 body import??

		model.addAttribute("articleCommentVO", articleCommentVO);	// validator ?⑸룄

		commentVO.setCommentCn("");	// ?깅줉 ???볤? ?댁슜 泥섎━

		return "egovframework/com/cop/cmt/EgovArticleCommentList";
    }


    /**
     * ?볤????깅줉?쒕떎.
     *
     * @param commentVO
     * @param comment
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmt/insertArticleComment.do")
    public String insertArticleComment(@ModelAttribute("searchVO") CommentVO commentVO, @Valid @ModelAttribute("comment") Comment comment,
	    BindingResult bindingResult, ModelMap model, @RequestParam HashMap<String, String> map) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
		    model.addAttribute("msg", "?볤??댁슜? ?꾩닔 ?낅젰媛믪엯?덈떎.");

		    return "forward:/cop/bbs/selectArticleDetail.do";
		}

		if (isAuthenticated) {
		    comment.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		    comment.setWrterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		    comment.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));


		    egovArticleCommentService.insertArticleComment(comment);

		    commentVO.setCommentCn("");
		    commentVO.setCommentNo("");
		}

		String chkBlog = map.get("blogAt");

		if("Y".equals(chkBlog)){
			return "forward:/cop/bbs/selectArticleBlogList.do";
		}else{
			return "forward:/cop/bbs/selectArticleDetail.do";
		}

    }


    /**
     * ?볤?????젣?쒕떎.
     *
     * @param commentVO
     * @param comment
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmt/deleteArticleComment.do")
    public String deleteArticleComment(@ModelAttribute("searchVO") CommentVO commentVO, @ModelAttribute("comment") Comment comment,
    		ModelMap model, @RequestParam HashMap<String, String> map) throws Exception {
		@SuppressWarnings("unused")
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
		    egovArticleCommentService.deleteArticleComment(commentVO);
		}

		commentVO.setCommentCn("");
		commentVO.setCommentNo("");

		String chkBlog = map.get("blogAt");

		if("Y".equals(chkBlog)){
			return "forward:/cop/bbs/selectArticleBlogList.do";
		}else{
			return "forward:/cop/bbs/selectArticleDetail.do";
		}
    }


    /**
     * ?볤? ?섏젙 ?섏씠吏濡??대룞?쒕떎.
     *
     * @param commentVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmt/updateArticleCommentView.do")
    public String updateArticleCommentView(@ModelAttribute("searchVO") CommentVO commentVO, ModelMap model) throws Exception {

	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	 //KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
    Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

    if(!isAuthenticated) {
        return "redirect:/uat/uia/egovLoginUsr.do";
    }

	CommentVO articleCommentVO = new CommentVO();

	commentVO.setWrterNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

	commentVO.setSubPageUnit(propertyService.getInt("pageUnit"));
	commentVO.setSubPageSize(propertyService.getInt("pageSize"));

	PaginationInfo paginationInfo = new PaginationInfo();
	paginationInfo.setCurrentPageNo(commentVO.getSubPageIndex());
	paginationInfo.setRecordCountPerPage(commentVO.getSubPageUnit());
	paginationInfo.setPageSize(commentVO.getSubPageSize());

	commentVO.setSubFirstIndex(paginationInfo.getFirstRecordIndex());
	commentVO.setSubLastIndex(paginationInfo.getLastRecordIndex());
	commentVO.setSubRecordCountPerPage(paginationInfo.getRecordCountPerPage());

	Map<String, Object> map = egovArticleCommentService.selectArticleCommentList(commentVO);
	int totCnt = Integer.parseInt((String)map.get("resultCnt"));

	paginationInfo.setTotalRecordCount(totCnt);

	model.addAttribute("resultList", map.get("resultList"));
	model.addAttribute("resultCnt", map.get("resultCnt"));
	model.addAttribute("paginationInfo", paginationInfo);
	model.addAttribute("type", "body");	// body import

	articleCommentVO = egovArticleCommentService.selectArticleCommentDetail(commentVO);

	model.addAttribute("articleCommentVO", articleCommentVO);


	return "egovframework/com/cop/cmt/EgovArticleCommentList";
    }


    /**
     * ?볤????섏젙?쒕떎.
     *
     * @param commentVO
     * @param comment
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/cmt/updateArticleComment.do")
    public String updateArticleComment(@ModelAttribute("searchVO") CommentVO commentVO, @Valid @ModelAttribute("comment") Comment comment,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
		    model.addAttribute("msg", "?댁슜? ?꾩닔 ?낅젰 媛믪엯?덈떎.");

		    return "forward:/cop/bbs/selectArticleDetail.do";
		}

		if (isAuthenticated) {
		    comment.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		    egovArticleCommentService.updateArticleComment(comment);

		    commentVO.setCommentCn("");
		    commentVO.setCommentNo("");
		}

		return "forward:/cop/bbs/selectArticleDetail.do";
    }


}
