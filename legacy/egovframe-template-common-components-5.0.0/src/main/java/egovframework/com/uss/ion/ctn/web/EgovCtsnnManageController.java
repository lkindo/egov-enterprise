package egovframework.com.uss.ion.ctn.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.ctn.service.CtsnnManage;
import egovframework.com.uss.ion.ctn.service.CtsnnManageVO;
import egovframework.com.uss.ion.ctn.service.EgovCtsnnManageService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 媛쒖슂
 * - 寃쎌“愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 寃쎌“愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 寃쎌“愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 *  * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2010.6.15	?댁슜          理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 *  </pre>
 */
@Controller
public class EgovCtsnnManageController {

	@Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name = "egovCtsnnManageService")
    private EgovCtsnnManageService egovCtsnnManageService;

	@Resource(name="EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

    /**
	 * 寃쎌“愿由?紐⑸줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/uss/ion/ctn/EgovCtsnnManageListView.do")
    public String selectCtsnnManageListView(@ModelAttribute("ctsnnManageVO") CtsnnManageVO ctsnnManageVO,
                                            ModelMap model) throws Exception {
    	List<CmmnDetailCode> ctsnnCdCodeList = null;
    	ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM054");
		ctsnnCdCodeList = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("ctsnnCodeList",    ctsnnCdCodeList);
        return "egovframework/com/uss/ion/ctn/EgovCtsnnManageList";
    }

	/**
	 * 寃쎌“愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉??寃쎌“愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return String - 由ы꽩 Url
	 */
    @IncludedInfo(name="吏곸썝寃쎌“?ш?由?,order = 890 ,gid = 50)
    @RequestMapping(value="/uss/ion/ctn/selectCtsnnManageList.do")
	 public String selectCtsnnManageList(@ModelAttribute("ctsnnManageVO") CtsnnManageVO ctsnnManageVO,
			                                 ModelMap model) throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(ctsnnManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(ctsnnManageVO.getPageUnit());
		paginationInfo.setPageSize(ctsnnManageVO.getPageSize());

		ctsnnManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		ctsnnManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		ctsnnManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		ctsnnManageVO.setCtsnnManageList(egovCtsnnManageService.selectCtsnnManageList(ctsnnManageVO));

		int totCnt = egovCtsnnManageService.selectCtsnnManageListTotCnt(ctsnnManageVO);
		paginationInfo.setTotalRecordCount(totCnt);

    	List<CmmnDetailCode> ctsnnCdCodeList = null;
    	ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM054");
		ctsnnCdCodeList = cmmUseService.selectCmmCodeDetail(vo);

		model.addAttribute("paginationInfo" ,   paginationInfo );
		model.addAttribute("ctsnnManageList",   ctsnnManageVO.getCtsnnManageList());
        model.addAttribute("ctsnnCodeList"  ,   ctsnnCdCodeList);
 		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/ctn/EgovCtsnnManageList";
	}

	/**
	 * ?깅줉??寃쎌“愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/ctn/EgovCtsnnManageDetail.do")
	 public String selectCtsnnManage(@ModelAttribute("ctsnnManage") CtsnnManage ctsnnManage,
			                         @ModelAttribute("ctsnnManageVO") CtsnnManageVO ctsnnManageVO,
			                         @RequestParam Map<?, ?> commandMap,
			                         ModelMap model) throws Exception {

    	String sCmd = commandMap.get("cmd") == null ? "" : (String)commandMap.get("cmd"); // ?곸꽭?뺣낫 援щ텇
    	ctsnnManageVO.setReqstDe(EgovStringUtil.removeMinusChar(ctsnnManageVO.getReqstDe()));

        // ?깅줉 ?곸꽭?뺣낫
    	CtsnnManageVO ctsnnManageVOTemp = egovCtsnnManageService.selectCtsnnManage(ctsnnManageVO);

    	model.addAttribute("ctsnnManageVO", ctsnnManageVOTemp);
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		if(sCmd.equals("updt")){

	    	List<CmmnDetailCode> ctsnnCdCodeList = null;
	    	List<CmmnDetailCode> relateCodeList  = null;
	    	ComDefaultCodeVO vo  = new ComDefaultCodeVO();
			vo.setCodeId("COM054");
			ctsnnCdCodeList = cmmUseService.selectCmmCodeDetail(vo);
			vo.setCodeId("COM073");
			relateCodeList = cmmUseService.selectCmmCodeDetail(vo);
	        model.addAttribute("ctsnnCodeList",    ctsnnCdCodeList);
			model.addAttribute("relateCodeList",    relateCodeList);

			CtsnnManage ctsnnManageTemp = new CtsnnManage();

			ctsnnManageTemp.setCtsnnId(ctsnnManageVOTemp.getCtsnnId());
			ctsnnManageTemp.setCtsnnNm(ctsnnManageVOTemp.getCtsnnNm());
			ctsnnManageTemp.setRemark(ctsnnManageVOTemp.getRemark());
			ctsnnManageTemp.setUsid(ctsnnManageVOTemp.getUsid());
			ctsnnManageTemp.setCtsnnCd(ctsnnManageVOTemp.getCtsnnCd());
			ctsnnManageTemp.setReqstDe(ctsnnManageVOTemp.getReqstDe());
			ctsnnManageTemp.setInfrmlSanctnId(ctsnnManageVOTemp.getInfrmlSanctnId());
			ctsnnManageTemp.setTrgterNm(ctsnnManageVOTemp.getTrgterNm());
			ctsnnManageTemp.setBrth(ctsnnManageVOTemp.getBrth());
			ctsnnManageTemp.setOccrrDe(ctsnnManageVOTemp.getOccrrDe());
			ctsnnManageTemp.setRelate(ctsnnManageVOTemp.getRelate());
			ctsnnManageTemp.setSanctnerId(ctsnnManageVOTemp.getSanctnerId());

			model.addAttribute("ctsnnManage", ctsnnManageTemp);
			return "egovframework/com/uss/ion/ctn/EgovCtsnnUpdt";
		}else{
			return "egovframework/com/uss/ion/ctn/EgovCtsnnDetail";
		}

	}

	/**
	 * 寃쎌“愿由??깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/ctn/EgovCtsnnRegist.do")
	 public String insertViewCtsnnManage(@ModelAttribute("ctsnnManage") CtsnnManage ctsnnManage,
                                         @ModelAttribute("ctsnnManageVO") CtsnnManageVO ctsnnManageVO,
			                             ModelMap model) throws Exception {

    	List<CmmnDetailCode> ctsnnCdCodeList = null;
    	List<CmmnDetailCode> relateCodeList  = null;
    	ComDefaultCodeVO vo  = new ComDefaultCodeVO();
		vo.setCodeId("COM054");
		ctsnnCdCodeList = cmmUseService.selectCmmCodeDetail(vo);
		vo.setCodeId("COM073");
		relateCodeList = cmmUseService.selectCmmCodeDetail(vo);
        model.addAttribute("ctsnnCodeList",    ctsnnCdCodeList);
		model.addAttribute("relateCodeList",    relateCodeList);
    	return "egovframework/com/uss/ion/ctn/EgovCtsnnRegist";
	}

	/**
	 * 寃쎌“愿由ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/ctn/insertCtsnnManage.do")
	 public String insertCtsnnManage(   @ModelAttribute("ctsnnManageVO") CtsnnManageVO ctsnnManageVO,
			 							@Valid @ModelAttribute("ctsnnManage") CtsnnManage ctsnnManage,
			                            BindingResult bindingResult,
			                            SessionStatus status,
						                ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("ctsnnManageVO", ctsnnManageVO);
			return "egovframework/com/uss/ion/ctn/EgovCtsnnRegist";
		} else {
	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	    	ctsnnManage.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
	    	egovCtsnnManageService.insertCtsnnManage(ctsnnManage);
	    	status.setComplete();
	    	model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
	    	return "forward:/uss/ion/ctn/selectCtsnnManageList.do";
		}
	}

	/**
	 * 湲??깅줉??寃쎌“愿由ъ젙蹂대? ?섏젙?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 * @return String - 由ы꽩 Url
	 */
	 @RequestMapping(value="/uss/ion/ctn/updtCtsnnManage.do")
	 public String updtCtsnnManage(     @ModelAttribute("ctsnnManage") CtsnnManage ctsnnManage,
			 							@Valid @ModelAttribute("ctsnnManageVO") CtsnnManageVO ctsnnManageVO,
							            BindingResult bindingResult,
			                            SessionStatus status,
		                                ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
    		model.addAttribute("ctsnnManageVO", ctsnnManageVO);
			return "egovframework/com/uss/ion/ctn/EgovCtsnnUpdt";
		} else {

	    	//LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

	    	egovCtsnnManageService.updtCtsnnManage(ctsnnManage);
	    	return "forward:/uss/ion/ctn/selectCtsnnManageList.do";

		}
	}

	/**
	 * 湲??깅줉??寃쎌“愿由ъ젙蹂대? ??젣?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/ctn/deleteCtsnnManage.do")
	 public String deleteCtsnnManage(@ModelAttribute("ctsnnManage") CtsnnManage ctsnnManage,
			                         SessionStatus status,
			                         ModelMap model) throws Exception {

    	egovCtsnnManageService.deleteCtsnnManage(ctsnnManage);
    	status.setComplete();
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
    	return "forward:/uss/ion/ctn/selectCtsnnManageList.do";
	}


    /*** ?뱀씤愿??***/
	/**
	 * 寃쎌“愿由ъ젙蹂??뱀씤 泥섎━瑜??꾪빐 ?좎껌??寃쎌“愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return String - 由ы꽩 Url
	 */
    @IncludedInfo(name="吏곸썝寃쎌“?ъ듅?멸?由?,order = 891 ,gid = 50)
    @RequestMapping(value="/uss/ion/ctn/EgovCtsnnConfmList.do")
	 public String selectCtsnnManageConfmList(@ModelAttribute("ctsnnManageVO") CtsnnManageVO ctsnnManageVO,
			                                  ModelMap model) throws Exception {
		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(ctsnnManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(ctsnnManageVO.getPageUnit());
		paginationInfo.setPageSize(ctsnnManageVO.getPageSize());

		ctsnnManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		ctsnnManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		ctsnnManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
    	ctsnnManageVO.setSanctnerId((user == null || user.getUniqId() == null) ? "" : user.getUniqId()); //?ъ슜?먭? ?뱀씤沅뚯옄?몄? 議곌굔媛?setting   selectCtsnnManageList
    	ctsnnManageVO.setCtsnnManageList(egovCtsnnManageService.selectCtsnnManageConfmList(ctsnnManageVO));
		model.addAttribute("ctsnnManageList", ctsnnManageVO.getCtsnnManageList());

		int totCnt = egovCtsnnManageService.selectCtsnnManageConfmListTotCnt(ctsnnManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

    	List<CmmnDetailCode> ctsnnCdCodeList = null;
    	ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM054");
		ctsnnCdCodeList = cmmUseService.selectCmmCodeDetail(vo);

        model.addAttribute("ctsnnCodeList"  ,   ctsnnCdCodeList);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/ctn/EgovCtsnnConfmList";
	}

	/**
	 * 寃쎌“?뱀씤愿由??곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param ctsnnManageVO - 寃쎌“愿由?VO
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping(value="/uss/ion/ctn/EgovCtsnnConfm.do")
	 public String selectCtsnnConfm( @ModelAttribute("ctsnnManageVO") CtsnnManageVO ctsnnManageVO,
			                         @ModelAttribute("ctsnnManage")   CtsnnManage   ctsnnManage,
							         ModelMap model) throws Exception {
    	ctsnnManageVO.setReqstDe(EgovStringUtil.removeMinusChar(ctsnnManageVO.getReqstDe()));

        // ?깅줉 ?곸꽭?뺣낫
    	CtsnnManageVO ctsnnManageVOTemp = egovCtsnnManageService.selectCtsnnManage(ctsnnManageVO);

		CtsnnManage ctsnnManageTemp = new CtsnnManage();
		ctsnnManageTemp.setCtsnnId(ctsnnManageVOTemp.getCtsnnId());
		ctsnnManageTemp.setCtsnnNm(ctsnnManageVOTemp.getCtsnnNm());
		ctsnnManageTemp.setRemark(ctsnnManageVOTemp.getRemark());
		ctsnnManageTemp.setUsid(ctsnnManageVOTemp.getUsid());
		ctsnnManageTemp.setCtsnnCd(ctsnnManageVOTemp.getCtsnnCd());
		ctsnnManageTemp.setReqstDe(ctsnnManageVOTemp.getReqstDe());
		ctsnnManageTemp.setInfrmlSanctnId(ctsnnManageVOTemp.getInfrmlSanctnId());
		ctsnnManageTemp.setTrgterNm(ctsnnManageVOTemp.getTrgterNm());
		ctsnnManageTemp.setBrth(ctsnnManageVOTemp.getBrth());
		ctsnnManageTemp.setOccrrDe(ctsnnManageVOTemp.getOccrrDe());
		ctsnnManageTemp.setRelate(ctsnnManageVOTemp.getRelate());
		ctsnnManageTemp.setSanctnerId(ctsnnManageVOTemp.getSanctnerId());

		model.addAttribute("ctsnnManage",   ctsnnManageTemp);
    	model.addAttribute("ctsnnManageVO", ctsnnManageVOTemp);
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/ctn/EgovCtsnnConfm";
    }

	/**
	 * 湲??깅줉??寃쎌“愿由ъ젙蹂대? ?뱀씤 泥섎━?쒕떎.
	 * @param ctsnnManage - 寃쎌“愿由?model
	 * @return String - 由ы꽩 Url
	 */
	 @RequestMapping(value="/uss/ion/ctn/updtCtsnnConfm.do")
	 public String updateCtsnnManageConfm( @ModelAttribute("ctsnnManage")   CtsnnManage   ctsnnManage,
			                               BindingResult bindingResult,
			                               SessionStatus status,
		                                   ModelMap model) throws Exception {



    	if (bindingResult.hasErrors()) {
    		model.addAttribute("ctsnnManageVO", ctsnnManage);
			return "egovframework/com/uss/ion/ctn/EgovCtsnnConfm";
		} else {

	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

	    	ctsnnManage.setSanctnerId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
	    	ctsnnManage.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
	    	ctsnnManage.setReqstDe(EgovStringUtil.removeMinusChar(ctsnnManage.getReqstDe()));

	    	egovCtsnnManageService.updtCtsnnManageConfm(ctsnnManage);
	    	return "forward:/uss/ion/ctn/EgovCtsnnConfmList.do";
		}
	}

	/**
	 * 寃쎌“愿由ъ젙蹂?諛섎젮泥섎━ ?붾㈃???몄텧?쒕떎.
	 * @param ctsnnManage
	 * @return  String
	 */
	@RequestMapping("/uss/ion/ctn/EgovCtsnnReturn.do")
	public String selectSanctnerListPopup(@ModelAttribute("ctsnnManage")   CtsnnManage   ctsnnManage,
										  @RequestParam Map<?, ?> commandMap,
                                          ModelMap model) throws Exception{
		return "egovframework/com/uss/ion/ctn/EgovCtsnnReturn";
	}

}
