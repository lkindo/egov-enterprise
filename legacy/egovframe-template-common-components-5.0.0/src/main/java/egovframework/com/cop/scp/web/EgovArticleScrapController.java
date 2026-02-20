package egovframework.com.cop.scp.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.bbs.service.BoardVO;
import egovframework.com.cop.bbs.service.EgovArticleService;
import egovframework.com.cop.scp.service.EgovArticleScrapService;
import egovframework.com.cop.scp.service.Scrap;
import egovframework.com.cop.scp.service.ScrapVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?ㅽ겕?⑷?由??쒕퉬??而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.07.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.10  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *   2016.06.13	源?고샇		?쒖??꾨젅?꾩썙??3.6 媛쒖꽑
 *
 * </pre>
 */

@Controller
public class EgovArticleScrapController {

    @Resource(name="EgovArticleScrapService")
    protected EgovArticleScrapService egovArticleScrapService;

    @Resource(name = "EgovArticleService")
    private EgovArticleService egovArticleService;

    @Resource(name="propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    //Logger log = Logger.getLogger(this.getClass());

    /**
     * ?ㅽ겕?⑷?由?紐⑸줉 議고쉶瑜??쒓났?쒕떎.
     *
     * @param scrapVO
     * @param model
     * @return
     * @throws Exception
     */
    @IncludedInfo(name="?ㅽ겕?⑷?由?, order = 250 ,gid = 40)
    @RequestMapping("/cop/scp/selectArticleScrapList.do")
    public String selectArticleScrapList(@ModelAttribute("searchVO") ScrapVO scrapVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		scrapVO.setUniqId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		scrapVO.setPageUnit(propertyService.getInt("pageUnit"));
		scrapVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(scrapVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(scrapVO.getPageUnit());
		paginationInfo.setPageSize(scrapVO.getPageSize());

		scrapVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		scrapVO.setLastIndex(paginationInfo.getLastRecordIndex());
		scrapVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = egovArticleScrapService.selectArticleScrapList(scrapVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/scp/EgovArticleScrapList";
    }

    /**
     * ?ㅽ겕?⑹뿉 ????곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param scrapVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/scp/selectArticleScrapDetail.do")
    public String selectArticleScrapDetail(@ModelAttribute("searchVO") ScrapVO scrapVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		ScrapVO scrap = egovArticleScrapService.selectArticleScrapDetail(scrapVO);

		model.addAttribute("sessionUniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		model.addAttribute("result", scrap);

		//寃뚯떆???댁슜 痍⑤뱷
		BoardVO vo = new BoardVO();
		vo.setNttId(scrap.getNttId());
		vo.setBbsId(scrap.getBbsId());
		vo = egovArticleService.selectArticleDetail(vo);

		model.addAttribute("articleVO", vo);
		////-----------------------------------

		return "egovframework/com/cop/scp/EgovArticleScrapDetail";
    }

    /**
     * ?ㅽ겕???깅줉???꾪븳 ?깅줉 ?섏씠吏濡??대룞?쒕떎.
     *
     * @param scrapVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/scp/insertArticleScrapView.do")
    public String insertArticleScrapView(@ModelAttribute("searchVO") ScrapVO scrapVO, ModelMap model) throws Exception {

		ScrapVO scrap = new ScrapVO();

		model.addAttribute("articleScrapVO", scrap);

		BoardVO vo = new BoardVO();
		vo.setNttId(scrapVO.getNttId());
		vo.setBbsId(scrapVO.getBbsId());

		//寃뚯떆???댁슜 痍⑤뱷
		vo = egovArticleService.selectArticleDetail(vo);

		model.addAttribute("articleVO", vo);
		////-----------------------------------

		return "egovframework/com/cop/scp/EgovArticleScrapRegist";
    }


    /**
     * ?ㅽ겕?⑹쓣 ?깅줉?쒕떎.
     *
     * @param scrapVO
     * @param scrap
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/scp/insertArticleScrap.do")
    public String insertArticleScrap(@ModelAttribute("searchVO") ScrapVO scrapVO, @Valid @ModelAttribute("scrap") Scrap scrap,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {

			//寃뚯떆???댁슜 痍⑤뱷
		    BoardVO vo = new BoardVO();
			vo.setNttId(scrapVO.getNttId());
			vo.setBbsId(scrapVO.getBbsId());

			model.addAttribute("articleScrapVO", scrap);
		    model.addAttribute("articleVO", vo);

		    return "egovframework/com/cop/scp/EgovArticleScrapRegist";
		}

		if (isAuthenticated) {
		    scrap.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		    egovArticleScrapService.insertArticleScrap(scrap);
		}

		return "forward:/cop/scp/selectArticleScrapList.do";
    }

    /**
     * ?ㅽ겕?⑹쓣 ??젣?쒕떎.
     *
     * @param ScrapVO
     * @param Scrap
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/scp/deleteArticleScrap.do")
    public String deleteArticleScrap(@ModelAttribute("searchVO") ScrapVO scrapVO, @ModelAttribute("Scrap") Scrap scrap, ModelMap model) throws Exception {
	@SuppressWarnings("unused")
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (isAuthenticated) {
		    egovArticleScrapService.deleteArticleScrap(scrapVO);
		}

		return "forward:/cop/scp/selectArticleScrapList.do";
    }

    /**
     * ?ㅽ겕???섏젙 ?섏씠吏濡??대룞?쒕떎.
     *
     * @param scrapVO
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/scp/updateArticleScrapView.do")
    public String updateArticleScrapView(@ModelAttribute("searchVO") ScrapVO scrapVO, @ModelAttribute("scrap") Scrap scrap, ModelMap model) throws Exception {
		Scrap vo = egovArticleScrapService.selectArticleScrapDetail(scrapVO);

		model.addAttribute("articleScrapVO", vo);

		//寃뚯떆???댁슜 痍⑤뱷
		BoardVO boardVO = new BoardVO();
		boardVO.setNttId(vo.getNttId());
		boardVO.setBbsId(vo.getBbsId());
		boardVO = egovArticleService.selectArticleDetail(boardVO);


	    model.addAttribute("articleVO", boardVO);


		return "egovframework/com/cop/scp/EgovArticleScrapUpdt";
    }

    /**
     * ?ㅽ겕?⑹쓣 ?섏젙?쒕떎.
     *
     * @param ScrapVO
     * @param Scrap
     * @param bindingResult
     * @param model
     * @return
     * @throws Exception
     */
    @RequestMapping("/cop/scp/updateArticleScrap.do")
    public String updateArticleScrap(@ModelAttribute("searchVO") ScrapVO scrapVO, @Valid @ModelAttribute("Scrap") Scrap scrap,
	    BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {

		    Scrap vo = egovArticleScrapService.selectArticleScrapDetail(scrapVO);

		    model.addAttribute("result", vo);

		    return "egovframework/com/cop/scp/EgovArticleScrapUpdt";
		}

		if (isAuthenticated) {
		    scrap.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		    egovArticleScrapService.updateArticleScrap(scrap);
		}

		return "forward:/cop/scp/selectArticleScrapList.do";
    }

}
