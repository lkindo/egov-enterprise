package egovframework.com.cop.smt.mtm.web;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.mtm.service.EgovMemoTodoService;
import egovframework.com.cop.smt.mtm.service.MemoTodo;
import egovframework.com.cop.smt.mtm.service.MemoTodoVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 媛쒖슂
 * - 硫붾え?좎씪?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 硫붾え?좎씪??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 硫붾え?좎씪??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶, ?ㅻ뒛???좎씪議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 19-7-2010 ?ㅼ쟾 10:12:46
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.7.19	?μ쿋??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */
@Controller
public class EgovMemoTodoController {

	@Resource(name="EgovMemoTodoService")
    protected EgovMemoTodoService memoTodoService;

	@Resource(name="propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    //Logger log = Logger.getLogger(this.getClass());

	/**
	 * 硫붾え?좎씪 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param memoTodoVO
	 */
    @IncludedInfo(name="硫붾え?좎씪愿由?, order = 420 ,gid = 40)
    @RequestMapping("/cop/smt/mtm/selectMemoTodoList.do")
	public String selectMemoTodoList(@ModelAttribute("searchVO") MemoTodoVO memoTodoVO, ModelMap model) throws Exception{
    	//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		memoTodoVO.setPageUnit(propertyService.getInt("pageUnit"));
		memoTodoVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(memoTodoVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(memoTodoVO.getPageUnit());
		paginationInfo.setPageSize(memoTodoVO.getPageSize());

		memoTodoVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		memoTodoVO.setLastIndex(paginationInfo.getLastRecordIndex());
		memoTodoVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		memoTodoVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));


		Map<String, Object> map = memoTodoService.selectMemoTodoList(memoTodoVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/mtm/EgovMemoTodoList";
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param memoTodoVO
	 */
    @RequestMapping("/cop/smt/mtm/selectMemoTodo.do")
	public String selectMemoTodo(@ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, ModelMap model) throws Exception{
    	MemoTodo memoTodo = memoTodoService.selectMemoTodo(memoTodoVO);
		model.addAttribute("memoTodo", memoTodo);


		return "egovframework/com/cop/smt/mtm/EgovMemoTodoDetail";
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫???깅줉?섏씠吏濡??대룞?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * @return  String - 由ы꽩 URL
	 *
	 * @param memoTodo
	 */
    @RequestMapping("/cop/smt/mtm/addMemoTodo.do")
	public String addMemoTodo(@ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, BindingResult bindingResult, ModelMap model) throws Exception{
    	String sLocationUrl = "egovframework/com/cop/smt/mtm/EgovMemoTodoRegist";

    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	// 1. 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

    	java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.KOREA);
		memoTodoVO.setTodoDe(formatter.format(new java.util.Date()));
    	memoTodoVO.setWrterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
    	memoTodoVO.setWrterNm(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()));

    	//?좎씪?쒖옉?쇱옄(??
    	model.addAttribute("todoBeginHour", getTimeHH());
    	//?좎씪?쒖옉?쇱옄(遺?
    	model.addAttribute("todoBeginMin", getTimeMM());
    	//?좎씪醫낅즺?쇱옄(??
    	model.addAttribute("todoEndHour", getTimeHH());
    	//?좎씪?뺣즺?쇱옄(遺?
    	model.addAttribute("todoEndMin", getTimeMM());

    	return sLocationUrl;
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫???섏젙?섏씠吏濡??대룞?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * @return  String - 由ы꽩 URL
	 *
	 * @param memoTodo
	 */
    @RequestMapping("/cop/smt/mtm/modifyMemoTodo.do")
	public String modifyMemoTodo(@ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, BindingResult bindingResult, ModelMap model) throws Exception{
    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	//?좎씪?쒖옉?쇱옄(??
    	model.addAttribute("todoBeginHour", getTimeHH());
    	//?좎씪?쒖옉?쇱옄(遺?
    	model.addAttribute("todoBeginMin", getTimeMM());
    	//?좎씪醫낅즺?쇱옄(??
    	model.addAttribute("todoEndHour", getTimeHH());
    	//?좎씪?뺣즺?쇱옄(遺?
    	model.addAttribute("todoEndMin", getTimeMM());

    	MemoTodoVO resultVO = memoTodoService.selectMemoTodo(memoTodoVO);
		resultVO.setSearchCnd(memoTodoVO.getSearchCnd());
		resultVO.setSearchWrd(memoTodoVO.getSearchWrd());
		resultVO.setSearchBgnDe(memoTodoVO.getSearchBgnDe());
		resultVO.setSearchEndDe(memoTodoVO.getSearchEndDe());
		resultVO.setSearchDe(memoTodoVO.getSearchDe());
		resultVO.setPageIndex(memoTodoVO.getPageIndex());
        model.addAttribute("memoTodoVO", resultVO);

		return "egovframework/com/cop/smt/mtm/EgovMemoTodoUpdt";
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜??섏젙?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * @return  String - 由ы꽩 URL
	 *
	 * @param memoTodo
	 */
    @RequestMapping("/cop/smt/mtm/updateMemoTodo.do")
	public String updateMemoTodo(@Valid @ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, BindingResult bindingResult, ModelMap model) throws Exception{
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			MemoTodo memoTodo = memoTodoService.selectMemoTodo(memoTodoVO);
		    model.addAttribute("memoTodo", memoTodo);
		    return "egovframework/com/cop/smt/mtm/EgovMemoTodoUpdt";
		}

		if (isAuthenticated) {
			memoTodoVO.setTodoBeginTime(memoTodoVO.getTodoDe() + memoTodoVO.getTodoBeginHour() + memoTodoVO.getTodoBeginMin());
			memoTodoVO.setTodoEndTime(memoTodoVO.getTodoDe() + memoTodoVO.getTodoEndHour() + memoTodoVO.getTodoEndMin());

    		memoTodoVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
    		memoTodoService.updateMemoTodo(memoTodoVO);
		}

		return "forward:/cop/smt/mtm/selectMemoTodoList.do";
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜??깅줉?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * @return  String - 由ы꽩 URL
	 *
	 * @param memoTodo
	 */
    @RequestMapping("/cop/smt/mtm/insertMemoTodo.do")
	public String insertMemoTodo(@Valid @ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, BindingResult bindingResult, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/mtm/EgovMemoTodoRegist";

		//?쒕쾭  validate 泥댄겕
		if(bindingResult.hasErrors()){
			return sLocationUrl;
		}

		memoTodoVO.setTodoBeginTime(memoTodoVO.getTodoDe() + memoTodoVO.getTodoBeginHour() + memoTodoVO.getTodoBeginMin());
		memoTodoVO.setTodoEndTime(memoTodoVO.getTodoDe() + memoTodoVO.getTodoEndHour() + memoTodoVO.getTodoEndMin());
		//?꾩씠???ㅼ젙
		memoTodoVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		memoTodoVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		memoTodoService.insertMemoTodo(memoTodoVO);
    	sLocationUrl = "forward:/cop/smt/mtm/selectMemoTodoList.do";

        return sLocationUrl;
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫瑜???젣?쒕떎.
	 * @param MemoTodo - 硫붾え?좎씪 model
	 * @return  String - 由ы꽩 URL
	 *
	 * @param memoTodo
	 */
    @RequestMapping("/cop/smt/mtm/deleteMemoTodo.do")
	public String deleteMemoTodo(@ModelAttribute("memoTodoVO") MemoTodoVO memoTodoVO, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}
    	memoTodoService.deleteMemoTodo(memoTodoVO);
		return "forward:/cop/smt/mtm/selectMemoTodoList.do";
	}

	/**
	 * 硫붾え?좎씪 ?뺣낫 以??ㅻ뒛???좎씪 ???紐⑸줉??議고쉶?쒕떎.
	 * @param MemoTodoVO - 硫붾え?좎씪 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param memoTodoVO
	 */
    @RequestMapping("/cop/smt/mtm/selectMemoTodoListToday.do")
	public String selectMemoTodoListToday(@ModelAttribute("searchVO") MemoTodoVO memoTodoVO, ModelMap model) throws Exception{
		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		memoTodoVO.setSearchId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		java.text.SimpleDateFormat formatter = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.KOREA);
		String strToday = formatter.format(new java.util.Date());
		memoTodoVO.setSearchBgnDe(strToday + "0000");
		memoTodoVO.setSearchEndDe(strToday + "2359");

		List<MemoTodoVO> memoTodoList = memoTodoService.selectMemoTodoListToday(memoTodoVO);
		model.addAttribute("resultList", memoTodoList);
		model.addAttribute("resultToday", strToday);

		return "egovframework/com/cop/smt/mtm/EgovMemoTodoListToday";
	}

    /**
	 * ?쒓컙??LIST瑜?諛섑솚?쒕떎.
	 * @return  List
	 * @throws
	 */
	private List<ComDefaultCodeVO> getTimeHH (){
    	ArrayList<ComDefaultCodeVO> listHH = new ArrayList<>();
    	//HashMap hmHHMM;
    	for(int i=0;i < 24; i++){
    		String sHH = "";
    		String strI = String.valueOf(i);
    		if(i<10){
    			sHH = "0" + strI;
    		}else{
    			sHH = strI;
    		}

    		ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
    		codeVO.setCode(sHH);
    		codeVO.setCodeNm(sHH);

    		listHH.add(codeVO);
    	}

    	return listHH;
	}

	/**
	 * 遺꾩쓽 LIST瑜?諛섑솚?쒕떎.
	 * @return  List
	 * @throws
	 */
	private List<ComDefaultCodeVO> getTimeMM (){
    	ArrayList<ComDefaultCodeVO> listMM = new ArrayList<>();
    	//HashMap hmHHMM;
    	for(int i=0;i < 60; i++){

    		String sMM = "";
    		String strI = String.valueOf(i);
    		if(i<10){
    			sMM = "0" + strI;
    		}else{
    			sMM = strI;
    		}

    		ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
    		codeVO.setCode(sMM);
    		codeVO.setCodeNm(sMM);

    		listMM.add(codeVO);
    	}
    	return listMM;
	}

}