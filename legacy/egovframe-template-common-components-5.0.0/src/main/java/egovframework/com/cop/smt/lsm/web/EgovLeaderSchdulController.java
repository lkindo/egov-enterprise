package egovframework.com.cop.smt.lsm.web;

import java.util.ArrayList;
import java.util.Calendar;
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
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.lsm.service.EgovLeaderSchdulService;
import egovframework.com.cop.smt.lsm.service.EmplyrVO;
import egovframework.com.cop.smt.lsm.service.LeaderSchdulVO;
import egovframework.com.cop.smt.lsm.service.LeaderSttus;
import egovframework.com.cop.smt.lsm.service.LeaderSttusVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 媛쒖슂
 * - 媛꾨??쇱젙?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 媛꾨??쇱젙??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 媛꾨??쇱젙??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:05
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??            ?섏젙??           ?섏젙?댁슜
 *  ----------   --------   ---------------------------
 *  2010.06.28   ?μ쿋??           理쒖큹 ?앹꽦
 *  2011.08.26   ?뺤쭊??           IncludedInfo annotation 異붽?
 *  2020.11.02   ?좎슜??           KISA 蹂댁븞?쎌젏 議곗튂 - ??null) 媛?泥댄겕
 *  2024.10.29	LeeBaekHaeng	遺덊븘???뺣????뺣━
 *
 * </pre>
 */
@Controller
public class EgovLeaderSchdulController {

	@Resource(name="EgovLeaderSchdulService")
    protected EgovLeaderSchdulService leaderSchdulService;

	@Resource(name="EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	@Resource(name="propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    /**
	 * ?ъ슜???뺣낫??????앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * @param EmplyrVO
	 * @return  String
	 *
	 * @param emplyrVO
	 */
	@RequestMapping("/cop/smt/lsm/selectEmplyrListPopup.do")
	public String selectEmplyrListPopup(@ModelAttribute("searchVO") EmplyrVO emplyrVO, ModelMap model) throws Exception{
		return "egovframework/com/cop/smt/lsm/EgovEmplyrListPopup";
	}

	/**
	 * ?ъ슜???뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param EmplyrVO
	 * @return  String
	 *
	 * @param emplyrVO
	 */
	@RequestMapping("/cop/smt/lsm/selectEmplyrList.do")
	public String selectEmplyrList(@ModelAttribute("searchVO") EmplyrVO emplyrVO, ModelMap model) throws Exception{
		//LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		//emplyrVO.setUniqId(user.getUniqId());

		emplyrVO.setPageUnit(propertyService.getInt("pageUnit"));
		emplyrVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(emplyrVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(emplyrVO.getPageUnit());
		paginationInfo.setPageSize(emplyrVO.getPageSize());

		emplyrVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		emplyrVO.setLastIndex(paginationInfo.getLastRecordIndex());
		emplyrVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = leaderSchdulService.selectEmplyrList(emplyrVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/lsm/EgovEmplyrList";
	}

    /**
	 * 媛꾨??쇱젙 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	* @param LeaderSchdulVO
	 * @return  String
	 *
	 * @param leaderSchdulVO
	 */
	@IncludedInfo(name="媛꾨??쇱젙愿由?, order = 390 ,gid = 40)
	@RequestMapping(value="/cop/smt/lsm/usr/selectLeaderSchdulList.do")
	public String selectLeaderSchdulList(@ModelAttribute("leaderSchdulVO") LeaderSchdulVO leaderSchdulVO, ModelMap model) throws Exception{

		model.addAttribute("leaderSchdulVO", leaderSchdulVO);

		return "egovframework/com/cop/smt/lsm/EgovLeaderSchdulList";
	}

	/**
	 * ?붾퀎 媛꾨??쇱젙 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param LeaderSchdulVO
	 * @return  String
	 *
	 * @param leaderSchdulVO
	 */
	@RequestMapping(value="/cop/smt/lsm/usr/selectLeaderSchdulMonthList.do")
	public String selectLeaderSchdulMonthList(@ModelAttribute("searchVO") LeaderSchdulVO leaderSchdulVO, ModelMap model) throws Exception{
		//?쇱젙援щ텇 寃???좎?
		//if(leaderSchdulVO.getSearchKeywordEx() != null){
		//	leaderSchdulVO.setSearchKeywordEx(new String(leaderSchdulVO.getSearchKeywordEx().getBytes("8859_1"), "UTF-8"));
		//}
        model.addAttribute("searchKeyword", leaderSchdulVO.getSearchKeyword() == null ? "" : (String)leaderSchdulVO.getSearchKeyword());
        model.addAttribute("searchKeywordEx", leaderSchdulVO.getSearchKeywordEx() == null ? "" : (String)leaderSchdulVO.getSearchKeywordEx());
        model.addAttribute("searchCondition", leaderSchdulVO.getSearchCondition() == null ? "" : (String)leaderSchdulVO.getSearchCondition());

        java.util.Calendar cal = java.util.Calendar.getInstance();

		String sYear = leaderSchdulVO.getYear();
		String sMonth = leaderSchdulVO.getMonth();

		int iYear = cal.get(java.util.Calendar.YEAR);
		int iMonth = cal.get(java.util.Calendar.MONTH);

		//寃???ㅼ젙
		String sSearchMonth = "";
		if(sYear == null || sMonth == null || sYear.equals("") || sMonth.equals("")){
			sSearchMonth += Integer.toString(iYear);
			sSearchMonth += Integer.toString(iMonth+1).length() == 1 ? "0" + Integer.toString(iMonth+1) : Integer.toString(iMonth+1);
		}else{
			iYear = Integer.parseInt(sYear);
			iMonth = Integer.parseInt(sMonth);
			sSearchMonth += sYear;
			sSearchMonth += Integer.toString(iMonth+1).length() == 1 ? "0" + Integer.toString(iMonth+1) :Integer.toString(iMonth+1);
		}

		leaderSchdulVO.setSearchMode("MONTH");
		leaderSchdulVO.setSearchMonth(sSearchMonth);

		/*
		 * 怨듯넻肄붾뱶
		 * 媛꾨??쇱젙援щ텇
		 */
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
	   	voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM057");
    	List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("schdulSe", listComCode);

        List<LeaderSchdulVO> resultList = leaderSchdulService.selectLeaderSchdulList(leaderSchdulVO);
        model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/lsm/EgovLeaderSchdulMonthList";
	}

	/**
	 * 二쇰퀎 媛꾨??쇱젙 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param LeaderSchdulVO
	 * @return  String
	 *
	 * @param leaderSchdulVO
	 */
	@RequestMapping(value="/cop/smt/lsm/usr/selectLeaderSchdulWeekList.do")
	public String selectLeaderSchdulWeekList(@ModelAttribute("searchVO") LeaderSchdulVO leaderSchdulVO, ModelMap model) throws Exception{
		//?쇱젙援щ텇 寃???좎?
		//if(leaderSchdulVO.getSearchKeywordEx() != null){
		//	leaderSchdulVO.setSearchKeywordEx(new String(leaderSchdulVO.getSearchKeywordEx().getBytes("8859_1"), "UTF-8"));
		//}
        model.addAttribute("searchKeyword", leaderSchdulVO.getSearchKeyword() == null ? "" : (String)leaderSchdulVO.getSearchKeyword());
        model.addAttribute("searchKeywordEx", leaderSchdulVO.getSearchKeywordEx() == null ? "" : (String)leaderSchdulVO.getSearchKeywordEx());
        model.addAttribute("searchCondition", leaderSchdulVO.getSearchCondition() == null ? "" : (String)leaderSchdulVO.getSearchCondition());

		/*
		 * 怨듯넻肄붾뱶
		 * 媛꾨??쇱젙援щ텇
		 */
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
	   	voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM057");
    	List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("schdulSe", listComCode);

		/* *****************************************************************
    	// 罹섎윴???ㅼ젙 濡쒖쭅
		****************************************************************** */
        Calendar calNow = Calendar.getInstance();
        Calendar calBefore = Calendar.getInstance();
        Calendar calNext = Calendar.getInstance();


		String strYear = leaderSchdulVO.getYear();
		String strMonth = leaderSchdulVO.getMonth();
		String strWeek =leaderSchdulVO.getWeek();

		int iNowYear = calNow.get(Calendar.YEAR);
		int iNowMonth = calNow.get(Calendar.MONTH);
		int iNowDate = calNow.get(Calendar.DATE);
		int iNowWeek = 0;

		if(strYear != null && !strYear.equals(""))
		{
		  iNowYear = Integer.parseInt(strYear);
		  iNowMonth = Integer.parseInt(strMonth);
		  iNowWeek = Integer.parseInt(strWeek);
		}

		//?곕룄/???뗮똿
		calNow.set(iNowYear, iNowMonth, 1);
		calBefore.set(iNowYear, iNowMonth, 1);
		calNext.set(iNowYear, iNowMonth, 1);

		calBefore.add(Calendar.MONTH, -1);
		calNext.add(Calendar.MONTH, +1);

		int endDay = calNow.getActualMaximum(Calendar.DAY_OF_MONTH);
		int startWeek = calNow.get(Calendar.DAY_OF_WEEK);


		List<List<String>> listWeekGrop = new ArrayList<>();
		List<String> listWeekDate = new ArrayList<>();

		String sUseDate = "";

		calBefore.add(Calendar.DATE , calBefore.getActualMaximum(Calendar.DAY_OF_MONTH) - (startWeek-1));
		for(int i = 1; i < startWeek ; i++ )
		{
			sUseDate = Integer.toString(calBefore.get(Calendar.YEAR));
			sUseDate += dateTypeIntForString(calBefore.get(Calendar.MONTH)+1);
			sUseDate += dateTypeIntForString(calBefore.get(Calendar.DATE));


			listWeekDate.add(sUseDate);
			calBefore.add(Calendar.DATE, +1);
		}

		int iBetweenCount = startWeek;

		// 二쇰퀎濡??먮Ⅸ?? BETWEEN 援ы븯湲?
		for(int i=1; i <= endDay; i++)
		{
			sUseDate = Integer.toString(iNowYear);
			sUseDate += Integer.toString(iNowMonth+1).length() == 1 ? "0" + Integer.toString(iNowMonth+1) : Integer.toString(iNowMonth+1);
			sUseDate += Integer.toString(i).length() == 1 ? "0" + Integer.toString(i) : Integer.toString(i);

			listWeekDate.add(sUseDate);

			if( iBetweenCount % 7 == 0){
				listWeekGrop.add(listWeekDate);
				listWeekDate = new ArrayList<>();

				if(strYear == null &&  i < iNowDate){
					iNowWeek++;
				}
			}

			//誘몄?留?7???먮룞怨꾩궛
			if(i == endDay){

				for(int j=listWeekDate.size(); j < 7;j++){
					String sUseNextDate = Integer.toString(calNext.get(Calendar.YEAR));
					sUseNextDate += dateTypeIntForString(calNext.get(Calendar.MONTH)+1);
					sUseNextDate += dateTypeIntForString(calNext.get(Calendar.DATE));
					listWeekDate.add(sUseNextDate);
					calNext.add(Calendar.DATE, +1);
				}

				listWeekGrop.add(listWeekDate);
			}

			iBetweenCount++;
		}

		model.addAttribute("year", iNowYear);
		model.addAttribute("month", iNowMonth);
		model.addAttribute("week", iNowWeek);


		model.addAttribute("listWeekGrop", listWeekGrop);

		List<String> listWeek = listWeekGrop.get(iNowWeek);

		leaderSchdulVO.setSearchMode("WEEK");
		leaderSchdulVO.setSearchBgnDe(listWeek.get(0));
		leaderSchdulVO.setSearchEndDe(listWeek.get(listWeek.size()-1));

		List<LeaderSchdulVO> resultList = leaderSchdulService.selectLeaderSchdulList(leaderSchdulVO);
        model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/lsm/EgovLeaderSchdulWeekList";
	}

	/**
	 * ?쇰퀎 媛꾨??쇱젙 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param LeaderSchdulVO
	 * @return  String
	 *
	 * @param leaderSchdulVO
	 */
	@RequestMapping(value="/cop/smt/lsm/usr/selectLeaderSchdulDailyList.do")
	public String selectLeaderSchdulDailyList(@ModelAttribute("searchVO") LeaderSchdulVO leaderSchdulVO, ModelMap model) throws Exception{
		//寃???좎?
		//if(leaderSchdulVO.getSearchKeywordEx() != null){
		//	leaderSchdulVO.setSearchKeywordEx(new String(leaderSchdulVO.getSearchKeywordEx().getBytes("8859_1"), "UTF-8"));
		//}
        model.addAttribute("searchKeyword", leaderSchdulVO.getSearchKeyword() == null ? "" : (String)leaderSchdulVO.getSearchKeyword());
        model.addAttribute("searchKeywordEx", leaderSchdulVO.getSearchKeywordEx() == null ? "" : (String)leaderSchdulVO.getSearchKeywordEx());
        model.addAttribute("searchCondition", leaderSchdulVO.getSearchCondition() == null ? "" : (String)leaderSchdulVO.getSearchCondition());

		/*
		 * 怨듯넻肄붾뱶
		 * 媛꾨??쇱젙援щ텇
		 */
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
	   	voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM057");
    	List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("schdulSe", listComCode);

		/* *****************************************************************
    	// 罹섎윴???ㅼ젙 濡쒖쭅
		****************************************************************** */
        Calendar calNow = Calendar.getInstance();

        String strYear = leaderSchdulVO.getYear();
		String strMonth = leaderSchdulVO.getMonth();
		String strDay =leaderSchdulVO.getDay();

		String strSearchDay = "";
		int iNowYear = calNow.get(Calendar.YEAR);
		int iNowMonth = calNow.get(Calendar.MONTH);
		int iNowDay = calNow.get(Calendar.DATE);

		if(strYear != null && !strYear.equals(""))
		{
		  iNowYear = Integer.parseInt(strYear);
		  iNowMonth = Integer.parseInt(strMonth);
		  iNowDay = Integer.parseInt(strDay);
		}

		strSearchDay = Integer.toString(iNowYear);
		strSearchDay += dateTypeIntForString(iNowMonth+1);
		strSearchDay += dateTypeIntForString(iNowDay);

		leaderSchdulVO.setSearchMode("DAILY");
		leaderSchdulVO.setSearchDay(strSearchDay);

		model.addAttribute("year", iNowYear);
		model.addAttribute("month", iNowMonth);
		model.addAttribute("day", iNowDay);

		List<LeaderSchdulVO> resultList = leaderSchdulService.selectLeaderSchdulList(leaderSchdulVO);
        model.addAttribute("resultList", resultList);

		return "egovframework/com/cop/smt/lsm/EgovLeaderSchdulDailyList";
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param LeaderSchdulVO
	 * @return  String
	 *
	 * @param leaderSchdulVO
	 */
	@RequestMapping(value="/cop/smt/lsm/usr/selectLeaderSchdul.do")
	public String selectLeaderSchdul(@ModelAttribute("leaderSchdulVO") LeaderSchdulVO leaderSchdulVO,  ModelMap model) throws Exception{
		/*
		 * 怨듯넻肄붾뱶
		 * 媛꾨??쇱젙援щ텇
		 */
    	ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM057");
    	List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("schdulSe", listComCode);

    	/*
    	 * 怨듯넻肄붾뱶
    	 * 諛섎났援щ텇 議고쉶
    	 */
    	voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM058");
    	listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("reptitSeCode", listComCode);

    	LeaderSchdulVO resultVO = leaderSchdulService.selectLeaderSchdul(leaderSchdulVO);
    	resultVO.setSearchMode(leaderSchdulVO.getSearchMode());
    	resultVO.setYear(leaderSchdulVO.getYear());
    	resultVO.setMonth(leaderSchdulVO.getMonth());
    	resultVO.setWeek(leaderSchdulVO.getWeek());
    	resultVO.setDay(leaderSchdulVO.getDay());
        model.addAttribute("leaderSchdulVO", resultVO);

		return "egovframework/com/cop/smt/lsm/EgovLeaderSchdulDetail";
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??섏젙?좎닔 ?덈뒗 ?섏젙?쇱쑝濡??대룞?쒕떎.
	 * @param LeaderSchdulVO
	 * @return  String
	 *
	 * @param leaderSchdulVO
	 */
	@RequestMapping(value="/cop/smt/lsm/mng/modifyLeaderSchdul.do")
	public String modifyLeaderSchdul(@ModelAttribute("leaderSchdulVO") LeaderSchdulVO leaderSchdulVO,  ModelMap model) throws Exception{

		String sLocationUrl = "egovframework/com/cop/smt/lsm/EgovLeaderSchdulModify";

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		/*
		 * 怨듯넻肄붾뱶
		 * 媛꾨??쇱젙援щ텇
		 */
    	ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM057");
    	List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("schdulSe", listComCode);
    	/*
    	 * 怨듯넻肄붾뱶
    	 * 諛섎났援щ텇
    	 */
    	voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM058");
    	listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("reptitSeCode", listComCode);

    	//?쇱젙?쒖옉?쇱옄(??
		model.addAttribute("schdulBgndeHH", getTimeHH());
    	//?쇱젙?쒖옉?쇱옄(遺?
		model.addAttribute("schdulBgndeMM", getTimeMM());
    	//?쇱젙醫낅즺?쇱옄(??
		model.addAttribute("schdulEnddeHH", getTimeHH());
    	//?쇱젙?뺣즺?쇱옄(遺?
		model.addAttribute("schdulEnddeMM", getTimeMM());

    	LeaderSchdulVO resultVO = leaderSchdulService.selectLeaderSchdul(leaderSchdulVO);

    	String sSchdulBgnde = resultVO.getSchdulBgnDe();
    	String sSchdulEndde = resultVO.getSchdulEndDe();

    	resultVO.setSchdulBgndeYYYMMDD(sSchdulBgnde.substring(0, 4) +"-"+sSchdulBgnde.substring(4, 6)+"-"+sSchdulBgnde.substring(6, 8) );
    	resultVO.setSchdulBgndeHH(sSchdulBgnde.substring(8, 10));
    	resultVO.setSchdulBgndeMM(sSchdulBgnde.substring(10, 12));

    	resultVO.setSchdulEnddeYYYMMDD(sSchdulEndde.substring(0, 4) +"-"+sSchdulEndde.substring(4, 6)+"-"+sSchdulEndde.substring(6, 8) );
    	resultVO.setSchdulEnddeHH(sSchdulEndde.substring(8, 10));
    	resultVO.setSchdulEnddeMM(sSchdulEndde.substring(10, 12));

    	resultVO.setSearchMode(leaderSchdulVO.getSearchMode());
    	resultVO.setYear(leaderSchdulVO.getYear());
    	resultVO.setMonth(leaderSchdulVO.getMonth());
    	resultVO.setWeek(leaderSchdulVO.getWeek());
    	resultVO.setDay(leaderSchdulVO.getDay());
    	model.addAttribute("leaderSchdulVO", resultVO);

		return sLocationUrl;
	}

	/**
     * 媛꾨??쇱젙 ?깅줉???꾪븳 ?깅줉 ?섏씠吏濡??대룞?쒕떎.
     *
     * @param LeaderSchdulVO
     * @param model
     * @return
     * @throws Exception
     */
	@RequestMapping(value="/cop/smt/lsm/mng/addLeaderSchdul.do")
	public String addLeaderSchdul(
			@ModelAttribute("leaderSchdulVO") LeaderSchdulVO leaderSchdulVO,
			BindingResult bindingResult,
    		ModelMap model)
	throws Exception {
		String sLocationUrl = "egovframework/com/cop/smt/lsm/EgovLeaderSchdulRegist";

    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	// 1. 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
    	model.addAttribute("schdulChargerId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
    	model.addAttribute("schdulChargerName", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getName()));

    	/*
     	 * 怨듯넻肄붾뱶
     	 * 媛꾨??쇱젙援щ텇
     	 */
    	ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM057");
    	List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("schdulSe", listComCode);
    	/*
    	 * 怨듯넻肄붾뱶
    	 * 諛섎났援щ텇
    	 */
    	voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM058");
    	listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("reptitSeCode", listComCode);

    	//?쇱젙?쒖옉?쇱옄(??
		model.addAttribute("schdulBgndeHH", getTimeHH());
    	//?쇱젙?쒖옉?쇱옄(遺?
		model.addAttribute("schdulBgndeMM", getTimeMM());
    	//?쇱젙醫낅즺?쇱옄(??
		model.addAttribute("schdulEnddeHH", getTimeHH());
    	//?쇱젙?뺣즺?쇱옄(遺?
		model.addAttribute("schdulEnddeMM", getTimeMM());

    	model.addAttribute("searchMode", leaderSchdulVO.getSearchMode());
    	model.addAttribute("year", leaderSchdulVO.getYear());
    	model.addAttribute("month", leaderSchdulVO.getMonth());
    	model.addAttribute("week", leaderSchdulVO.getWeek());
    	model.addAttribute("day", leaderSchdulVO.getDay());


    	return sLocationUrl;

	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??깅줉?쒕떎.
	 * @param LeaderSchdul
	 * @return  String
	 *
	 * @param leaderSchdul
	 */
	@RequestMapping(value="/cop/smt/lsm/mng/insertLeaderSchdul.do")
	public String insertLeaderSchdul(@Valid @ModelAttribute("leaderSchdulVO") LeaderSchdulVO leaderSchdulVO,
		    BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/lsm/EgovLeaderSchdulRegist";

		//?쒕쾭  validate 泥댄겕
		if(bindingResult.hasErrors()){

			return sLocationUrl;
		}

		//?꾩씠???ㅼ젙
		leaderSchdulVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		leaderSchdulVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		leaderSchdulService.insertLeaderSchdul(leaderSchdulVO);
    	sLocationUrl = "forward:/cop/smt/lsm/usr/selectLeaderSchdulList.do";

        return sLocationUrl;
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??섏젙?쒕떎.
	 * @param LeaderSchdul
	 * @return  String
	 *
	 * @param leaderSchdul
	 */
	@RequestMapping(value="/cop/smt/lsm/mng/updateLeaderSchdul.do")
	public String updateLeaderSchdul(@Valid @ModelAttribute("leaderSchdulVO") LeaderSchdulVO leaderSchdulVO,
			BindingResult bindingResult, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/lsm/EgovLeaderSchdulModify";

		//?쒕쾭  validate 泥댄겕
		if(bindingResult.hasErrors()){

			return sLocationUrl;
		}

		//?꾩씠???ㅼ젙
		leaderSchdulVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		leaderSchdulService.updateLeaderSchdul(leaderSchdulVO);
    	sLocationUrl = "forward:/cop/smt/lsm/usr/selectLeaderSchdulList.do";

        return sLocationUrl;
	}

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜???젣?쒕떎.
	 * @param LeaderSchdul
	 * @return  String
	 *
	 * @param leaderSchdul
	 */
	@RequestMapping(value="/cop/smt/lsm/mng/deleteLeaderSchdul.do")
	public String deleteLeaderSchdul(@ModelAttribute("leaderSchdulVO") LeaderSchdulVO leaderSchdulVO, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}
		leaderSchdulService.deleteLeaderSchdul(leaderSchdulVO);
		return "forward:/cop/smt/lsm/usr/selectLeaderSchdulList.do";
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫?????紐⑸줉??議고쉶?쒕떎. (?ъ슜???붾㈃)
	 * @param LeaderSttusVO
	 * @return  String
	 *
	 * @param leaderSttusVO
	 */
	@RequestMapping("/cop/smt/lsm/usr/selectLeaderSttusList.do")
	public String selectLeaderSttusListView(@ModelAttribute("searchVO") LeaderSttusVO leaderSttusVO, ModelMap model) throws Exception{
		//LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		String sLocationUrl = "egovframework/com/cop/smt/lsm/EgovLeaderSttusListView";

		boolean po = false;
		List<String> authenticated = EgovUserDetailsHelper.getAuthorities();
		// KISA 蹂댁븞?쎌젏 議곗튂 - ??null) 媛?泥댄겕
		if ( authenticated != null ) {
			for (String element : authenticated) {
				if("ROLE_LEADERSCHDUL".equals(String.valueOf(element).trim())){
					po = true;
				}
			}
		}

		if(po){
			return "forward:/cop/smt/lsm/mng/selectLeaderSttusList.do";
		}

		leaderSttusVO.setPageUnit(propertyService.getInt("pageUnit"));
		leaderSttusVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(leaderSttusVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(leaderSttusVO.getPageUnit());
		paginationInfo.setPageSize(leaderSttusVO.getPageSize());

		leaderSttusVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		leaderSttusVO.setLastIndex(paginationInfo.getLastRecordIndex());
		leaderSttusVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = leaderSchdulService.selectLeaderSttusList(leaderSttusVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return sLocationUrl;
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫?????紐⑸줉??議고쉶?쒕떎. (愿由ъ옄 ?붾㈃)
	 * @param LeaderSttusVO
	 * @return  String
	 *
	 * @param leaderSttusVO
	 */
	@RequestMapping("/cop/smt/lsm/mng/selectLeaderSttusList.do")
	public String selectLeaderSttusList(@ModelAttribute("searchVO") LeaderSttusVO leaderSttusVO, ModelMap model) throws Exception{
		//LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		String sLocationUrl = "egovframework/com/cop/smt/lsm/EgovLeaderSttusList";

		leaderSttusVO.setPageUnit(propertyService.getInt("pageUnit"));
		leaderSttusVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(leaderSttusVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(leaderSttusVO.getPageUnit());
		paginationInfo.setPageSize(leaderSttusVO.getPageSize());

		leaderSttusVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		leaderSttusVO.setLastIndex(paginationInfo.getLastRecordIndex());
		leaderSttusVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = leaderSchdulService.selectLeaderSttusList(leaderSttusVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return sLocationUrl;
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫???깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @param LeaderSttus
	 * @return  String
	 *
	 * @param LeaderSttus
	 */
	@RequestMapping("/cop/smt/lsm/mng/addLeaderSttus.do")
	public String addLeaderSttus(
			@ModelAttribute("leaderSttusVO") LeaderSttusVO leaderSttusVO,
			ModelMap model) throws Exception{
		String sLocationUrl = "egovframework/com/cop/smt/lsm/EgovLeaderSttusRegist";

    	// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	/*
		 * 怨듯넻肄붾뱶
		 * 媛꾨??곹깭
		 */
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
	   	voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM061");
    	List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("leaderSttus", listComCode);

    	return sLocationUrl;
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫???섏젙?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @param LeaderSttus
	 * @return  String
	 *
	 * @param LeaderSttus
	 */
	@RequestMapping("/cop/smt/lsm/mng/modifyLeaderSttus.do")
	public String modifyLeaderSttus(@ModelAttribute("leaderSttusVO") LeaderSttusVO leaderSttusVO, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	LeaderSttusVO resultVO = leaderSchdulService.selectLeaderSttus(leaderSttusVO);
		resultVO.setSearchCnd(leaderSttusVO.getSearchCnd());
		resultVO.setSearchWrd(leaderSttusVO.getSearchWrd());
		resultVO.setPageIndex(leaderSttusVO.getPageIndex());

		/*
		 * 怨듯넻肄붾뱶
		 * 媛꾨??곹깭
		 */
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
	   	voComCode = new ComDefaultCodeVO();
    	voComCode.setCodeId("COM061");
    	List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
    	model.addAttribute("leaderSttus", listComCode);

        model.addAttribute("leaderSttusVO", resultVO);

		return "egovframework/com/cop/smt/lsm/EgovLeaderSttusUpdt";
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜??섏젙?쒕떎.
	 * @param LeaderSttusVO
	 * @return  String
	 *
	 * @param leaderSttusVO
	 */
	@RequestMapping("/cop/smt/lsm/mng/updateLeaderSttus.do")
	public String updateLeaderSttus(@Valid @ModelAttribute("leaderSttusVO") LeaderSttusVO leaderSttusVO, BindingResult bindingResult, ModelMap model) throws Exception{
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			//LeaderSttus result = leaderSchdulService.selectLeaderSttus(leaderSttusVO);
		    //model.addAttribute("leaderSttus", result);
		    return "egovframework/com/cop/smt/lsm/EgovLeaderSttusUpdt";
		}

		if (isAuthenticated) {
			leaderSttusVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			leaderSchdulService.updateLeaderSttus(leaderSttusVO);
		}

		return "forward:/cop/smt/lsm/mng/selectLeaderSttusList.do";
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜??깅줉?쒕떎.
	 * @param LeaderSttusVO
	 * @return  String
	 *
	 * @param leaderSttusVO
	 */
	@RequestMapping("/cop/smt/lsm/mng/insertLeaderSttus.do")
	public String insertLeaderSttus(@Valid @ModelAttribute("leaderSttusVO") LeaderSttusVO leaderSttusVO, BindingResult bindingResult, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/lsm/EgovLeaderSttusRegist";

		//?쒕쾭  validate 泥댄겕
		if(bindingResult.hasErrors()){
			return sLocationUrl;
		}

		//?꾩씠???ㅼ젙
		leaderSttusVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		leaderSttusVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		//媛꾨??곹깭 以묐났泥댄겕
		if(leaderSchdulService.selectLeaderSttusCheck(leaderSttusVO) > 0){
			model.addAttribute("leaderIdDuplicated", "true");
			sLocationUrl = "forward:/cop/smt/lsm/mng/addLeaderSttus.do";
		}else{
			leaderSchdulService.insertLeaderSttus(leaderSttusVO);
	    	sLocationUrl = "forward:/cop/smt/lsm/mng/selectLeaderSttusList.do";
		}
		return sLocationUrl;
	}

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜???젣?쒕떎.
	 * @param LeaderSttus
	 * @return  String
	 *
	 * @param LeaderSttus
	 */
	@RequestMapping("/cop/smt/lsm/mng/deleteLeaderSttus.do")
	public String deleteLeaderSttus(@ModelAttribute("leaderSttusVO") LeaderSttus leaderSttus, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}
    	leaderSchdulService.deleteLeaderSttus(leaderSttus);
		return "forward:/cop/smt/lsm/mng/selectLeaderSttusList.do";
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
	/**
	 * 0??遺숈뿬 諛섑솚
	 * @return  String
	 * @throws
	 */
    private String dateTypeIntForString(int iInput){
		String sOutput = "";
		if(Integer.toString(iInput).length() == 1){
			sOutput = "0" + Integer.toString(iInput);
		}else{
			sOutput = Integer.toString(iInput);
		}

       return sOutput;
    }

}