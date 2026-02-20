package egovframework.com.utl.sys.nsm.web;
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
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.nsm.service.EgovNtwrkSvcMntrngService;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrng;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngLogVO;
import egovframework.com.utl.sys.nsm.service.NtwrkSvcMntrngVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅??곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:42
 *  <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.28   ?μ쿋??    理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 * </pre>
 */
@Controller
public class EgovNtwrkSvcMntrngController {

	@Resource(name="EgovNtwrkSvcMntrngService")
    protected EgovNtwrkSvcMntrngService ntwrkSvcMntrngService;

	@Resource(name="propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅????뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrngVO
	 */
    @SuppressWarnings("unused")
	@IncludedInfo(name="?ㅽ듃?뚰겕?쒕퉬?ㅻえ?덊꽣留?, order = 2120 ,gid = 90)
    @RequestMapping("/utl/sys/nsm/selectNtwrkSvcMntrngList.do")
	public String selectNtwrkSvcMntrngList(@ModelAttribute("searchVO") NtwrkSvcMntrngVO ntwrkSvcMntrngVO, ModelMap model) throws Exception{
    	//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		ntwrkSvcMntrngVO.setPageUnit(propertyService.getInt("pageUnit"));
		ntwrkSvcMntrngVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(ntwrkSvcMntrngVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(ntwrkSvcMntrngVO.getPageUnit());
		paginationInfo.setPageSize(ntwrkSvcMntrngVO.getPageSize());

		ntwrkSvcMntrngVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		ntwrkSvcMntrngVO.setLastIndex(paginationInfo.getLastRecordIndex());
		ntwrkSvcMntrngVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = ntwrkSvcMntrngService.selectNtwrkSvcMntrngList(ntwrkSvcMntrngVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngList";
	}

    /**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ????뺣낫???깅줉?섏씠吏濡??대룞?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrngVO
	 */
    @RequestMapping("/utl/sys/nsm/addNtwrkSvcMntrng.do")
	public String addNtwrkSvcMntrng(@ModelAttribute("ntwrkSvcMntrngVO") NtwrkSvcMntrngVO ntwrkSvcMntrngVO, BindingResult bindingResult, ModelMap model) throws Exception{
    	String sLocationUrl = "egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngRegist";

    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	return sLocationUrl;
	}

    /**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ????뺣낫???섏젙?섏씠吏濡??대룞?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅 ???VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrngVO
	 */
    @RequestMapping("/utl/sys/nsm/modifyNtwrkSvcMntrng.do")
	public String modifyNtwrkSvcMntrng(@ModelAttribute("ntwrkSvcMntrngVO") NtwrkSvcMntrngVO ntwrkSvcMntrngVO, BindingResult bindingResult, ModelMap model) throws Exception{
    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	NtwrkSvcMntrngVO resultVO = ntwrkSvcMntrngService.selectNtwrkSvcMntrng(ntwrkSvcMntrngVO);

    	//?쒖뒪??IP ?ㅼ젙
    	String[] sysIps = resultVO.getSysIp().split("[.]");
    	resultVO.setSysIp1(sysIps[0]);
    	resultVO.setSysIp2(sysIps[1]);
    	resultVO.setSysIp3(sysIps[2]);
    	resultVO.setSysIp4(sysIps[3]);

		resultVO.setSearchCnd(ntwrkSvcMntrngVO.getSearchCnd());
		resultVO.setSearchWrd(ntwrkSvcMntrngVO.getSearchWrd());
		resultVO.setPageIndex(ntwrkSvcMntrngVO.getPageIndex());

		if(resultVO.getCreatDt() != null && !resultVO.getCreatDt().equals("")){
			if(resultVO.getCreatDt().length() > 18){
				resultVO.setCreatDt(resultVO.getCreatDt().substring(0, 19));
			}
		}

        model.addAttribute("ntwrkSvcMntrngVO", resultVO);

		return "egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngUpdt";
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅????뺣낫瑜?議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrngVO
	 */
    @RequestMapping("/utl/sys/nsm/selectNtwrkSvcMntrng.do")
	public String selectNtwrkSvcMntrng(@ModelAttribute("ntwrkSvcMntrngVO") NtwrkSvcMntrngVO ntwrkSvcMntrngVO, ModelMap model) throws Exception{
    	NtwrkSvcMntrng ntwrkSvcMntrng = ntwrkSvcMntrngService.selectNtwrkSvcMntrng(ntwrkSvcMntrngVO);

    	//?쒖뒪??IP ?ㅼ젙
    	String[] sysIps = ntwrkSvcMntrng.getSysIp().split("[.]");
    	ntwrkSvcMntrng.setSysIp1(sysIps[0]);
    	ntwrkSvcMntrng.setSysIp2(sysIps[1]);
    	ntwrkSvcMntrng.setSysIp3(sysIps[2]);
    	ntwrkSvcMntrng.setSysIp4(sysIps[3]);

    	if(ntwrkSvcMntrng.getCreatDt() != null && !ntwrkSvcMntrng.getCreatDt().equals("")){
			if(ntwrkSvcMntrng.getCreatDt().length() > 18){
				ntwrkSvcMntrng.setCreatDt(ntwrkSvcMntrng.getCreatDt().substring(0, 19));
			}
		}
		model.addAttribute("ntwrkSvcMntrngVO", ntwrkSvcMntrng);


		return "egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngDetail";
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅????뺣낫瑜??섏젙?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrng
	 */
    @RequestMapping("/utl/sys/nsm/updateNtwrkSvcMntrng.do")
	public String updateNtwrkSvcMntrng(
		@Valid @ModelAttribute("ntwrkSvcMntrngVO") NtwrkSvcMntrngVO ntwrkSvcMntrngVO,
		BindingResult bindingResult, ModelMap model) throws Exception{

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			NtwrkSvcMntrng ntwrkSvcMntrng = ntwrkSvcMntrngService.selectNtwrkSvcMntrng(ntwrkSvcMntrngVO);
		    model.addAttribute("ntwrkSvcMntrng", ntwrkSvcMntrng);
		    return "egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngUpdt";
		}

		if (isAuthenticated) {
			//?쒖뒪??IP ?ㅼ젙
			String sysIp = "";
			sysIp += ntwrkSvcMntrngVO.getSysIp1();
			sysIp += ".";
			sysIp += ntwrkSvcMntrngVO.getSysIp2();
			sysIp += ".";
			sysIp += ntwrkSvcMntrngVO.getSysIp3();
			sysIp += ".";
			sysIp += ntwrkSvcMntrngVO.getSysIp4();
			ntwrkSvcMntrngVO.setSysIp(sysIp);

    		ntwrkSvcMntrngVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
    		ntwrkSvcMntrngService.updateNtwrkSvcMntrng(ntwrkSvcMntrngVO);
		}

		return "forward:/utl/sys/nsm/selectNtwrkSvcMntrngList.do";
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅????뺣낫瑜??깅줉?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrng
	 */
    @RequestMapping("/utl/sys/nsm/insertNtwrkSvcMntrng.do")
	public String insertNtwrkSvcMntrng(
		@Valid @ModelAttribute("ntwrkSvcMntrngVO") NtwrkSvcMntrngVO ntwrkSvcMntrngVO,
		BindingResult bindingResult, ModelMap model) throws Exception{

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngRegist";

		if(bindingResult.hasErrors()){
			return sLocationUrl;
		}

		//?쒖뒪??IP ?ㅼ젙
		String sysIp = "";
		sysIp += ntwrkSvcMntrngVO.getSysIp1();
		sysIp += ".";
		sysIp += ntwrkSvcMntrngVO.getSysIp2();
		sysIp += ".";
		sysIp += ntwrkSvcMntrngVO.getSysIp3();
		sysIp += ".";
		sysIp += ntwrkSvcMntrngVO.getSysIp4();
		ntwrkSvcMntrngVO.setSysIp(sysIp);

		//?꾩씠???ㅼ젙
		ntwrkSvcMntrngVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		ntwrkSvcMntrngVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		if(ntwrkSvcMntrngService.selectNtwrkSvcMntrngCheck(ntwrkSvcMntrngVO) > 0){
			model.addAttribute("ntwrkSvcMntrngDuplicated", "true");
			sLocationUrl = "forward:/utl/sys/nsm/addNtwrkSvcMntrng.do";
		}else{
			ntwrkSvcMntrngService.insertNtwrkSvcMntrng(ntwrkSvcMntrngVO);
	    	sLocationUrl = "forward:/utl/sys/nsm/selectNtwrkSvcMntrngList.do";
		}

        return sLocationUrl;
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅????뺣낫瑜???젣?쒕떎.
	 * @param NtwrkSvcMntrng - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅???model
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrng
	 */
    @RequestMapping("/utl/sys/nsm/deleteNtwrkSvcMntrng.do")
	public String deleteNtwrkSvcMntrng(@ModelAttribute("ntwrkSvcMntrngVO") NtwrkSvcMntrngVO ntwrkSvcMntrngVO, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}
    	ntwrkSvcMntrngService.deleteNtwrkSvcMntrng(ntwrkSvcMntrngVO);
		return "forward:/utl/sys/nsm/selectNtwrkSvcMntrngList.do";
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrngLogVO
	 */
	@SuppressWarnings({ "unchecked", "unused" })
	@RequestMapping("/utl/sys/nsm/selectNtwrkSvcMntrngLogList.do")
	public String selectNtwrkSvcMntrngLogList(@ModelAttribute("searchVO") NtwrkSvcMntrngLogVO ntwrkSvcMntrngLogVO, ModelMap model) throws Exception{
		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		ntwrkSvcMntrngLogVO.setPageUnit(propertyService.getInt("pageUnit"));
		ntwrkSvcMntrngLogVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(ntwrkSvcMntrngLogVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(ntwrkSvcMntrngLogVO.getPageUnit());
		paginationInfo.setPageSize(ntwrkSvcMntrngLogVO.getPageSize());

		ntwrkSvcMntrngLogVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		ntwrkSvcMntrngLogVO.setLastIndex(paginationInfo.getLastRecordIndex());
		ntwrkSvcMntrngLogVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// 議고쉶湲곌컙?ㅼ젙
		if(ntwrkSvcMntrngLogVO.getSearchBgnDe() != null && ntwrkSvcMntrngLogVO.getSearchEndDe() != null){
			if(!ntwrkSvcMntrngLogVO.getSearchBgnDe().equals("") && !ntwrkSvcMntrngLogVO.getSearchEndDe().equals("")){
				ntwrkSvcMntrngLogVO.setSearchBgnDt(ntwrkSvcMntrngLogVO.getSearchBgnDe() + " " + ntwrkSvcMntrngLogVO.getSearchBgnHour());
				ntwrkSvcMntrngLogVO.setSearchEndDt(ntwrkSvcMntrngLogVO.getSearchEndDe() + " " + ntwrkSvcMntrngLogVO.getSearchEndHour());
			}
		}

		Map<String, Object> map = ntwrkSvcMntrngService.selectNtwrkSvcMntrngLogList(ntwrkSvcMntrngLogVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		List<NtwrkSvcMntrngLogVO> list = (List<NtwrkSvcMntrngLogVO>)map.get("resultList");
		for(int k=0; k<list.size(); k++){
			NtwrkSvcMntrngLogVO logVO = list.get(k);

			if(logVO.getCreatDt() != null && !logVO.getCreatDt().equals("")){
				if(logVO.getCreatDt().length() > 18){
					logVO.setCreatDt(logVO.getCreatDt().substring(0, 19));
				}
			}

			list.set(k, logVO);
			//System.out.println(list.get(k).getCreatDt());
		}

		// 議고쉶?쒖옉??
    	model.addAttribute("searchBgnHour", getTimeHH());
    	// 議고쉶醫낅즺??
    	model.addAttribute("searchEndHour", getTimeHH());

		model.addAttribute("resultList", list);
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngLogList";
	}

	/**
	 * ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param NtwrkSvcMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param ntwrkSvcMntrngLogVO
	 */
	@RequestMapping("/utl/sys/nsm/selectNtwrkSvcMntrngLog.do")
	public String selectNtwrkSvcMntrngLog(@ModelAttribute("ntwrkSvcMntrngLogVO") NtwrkSvcMntrngLogVO ntwrkSvcMntrngLogVO, ModelMap model) throws Exception{
		NtwrkSvcMntrngLogVO ntwrkSvcMntrngLog = ntwrkSvcMntrngService.selectNtwrkSvcMntrngLog(ntwrkSvcMntrngLogVO);
		if(ntwrkSvcMntrngLog.getCreatDt() != null && !ntwrkSvcMntrngLog.getCreatDt().equals("")){
			if(ntwrkSvcMntrngLog.getCreatDt().length() > 18){
				ntwrkSvcMntrngLog.setCreatDt(ntwrkSvcMntrngLog.getCreatDt().substring(0, 19));
			}
		}
		model.addAttribute("ntwrkSvcMntrngLog", ntwrkSvcMntrngLog);


		return "egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngLogDetail";
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
    		codeVO.setCodeNm(sHH + ":00");

    		listHH.add(codeVO);
    	}

    	return listHH;
	}
}