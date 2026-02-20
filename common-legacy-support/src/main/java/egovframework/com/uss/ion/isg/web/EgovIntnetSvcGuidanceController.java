/**
 * ??
 * - ?????????????controller ?????? ???.
 *
 *
 * ???
 * - ??????????????, ??, ???? ?????????.
 * - ???????????? ?, ??????.
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?? 2:08:02
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2010.08.03	lee.m.j		????
 *  2011.08.26	???	IncludedInfo annotation ??
 *  2023.06.09	??		NSR ? (?? ??????)
 *
 *  </pre>
 **/

package egovframework.com.uss.ion.isg.web;

import java.util.List;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.isg.service.EgovIntnetSvcGuidanceService;
import egovframework.com.uss.ion.isg.service.IntnetSvcGuidance;
import egovframework.com.uss.ion.isg.service.IntnetSvcGuidanceVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

@Controller
public class EgovIntnetSvcGuidanceController {

	@Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name = "egovIntnetSvcGuidanceService")
    private EgovIntnetSvcGuidanceService egovIntnetSvcGuidanceService;

    /** Message ID Generation **/
    @Resource(name="egovIntnetSvcGuidanceIdGnrService")
    private EgovIdGnrService egovIntnetSvcGuidanceIdGnrService;

    /**
	 * ??????? ? ???
	 * @return String
	 * @exception Exception
	 **/
    @RequestMapping("/uss/ion/isg/selectIntnetSvcGuidanceListView.do")
    public String selectIntnetSvcGuidanceListView() throws Exception {

        return "egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceList";
    }

	/**
	 * ?????????????? ?????????? ?????.
	 * @param intnetSvcGuidanceVO - ??????? VO
	 * @return String - ? Url
	 **/
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
// 	@RequestMapping("/uss/ion/isg/selectIntnetSvcGuidanceList.do")
	public String selectIntnetSvcGuidanceList(@ModelAttribute("intnetSvcGuidanceVO") IntnetSvcGuidanceVO intnetSvcGuidanceVO,
                                               ModelMap model ) throws Exception {

    	/** paging **/
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(intnetSvcGuidanceVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(intnetSvcGuidanceVO.getPageUnit());
		paginationInfo.setPageSize(intnetSvcGuidanceVO.getPageSize());

		intnetSvcGuidanceVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		intnetSvcGuidanceVO.setLastIndex(paginationInfo.getLastRecordIndex());
		intnetSvcGuidanceVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		intnetSvcGuidanceVO.setIntnetSvcGuidanceList(egovIntnetSvcGuidanceService.selectIntnetSvcGuidanceList(intnetSvcGuidanceVO));

		model.addAttribute("intnetSvcGuidanceList", intnetSvcGuidanceVO.getIntnetSvcGuidanceList());

        int totCnt = egovIntnetSvcGuidanceService.selectIntnetSvcGuidanceListTotCnt(intnetSvcGuidanceVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceList";
	}

	/**
	 * ???????????????????.
	 * @param intnetSvcGuidanceVO - ??????? VO
	 * @return String - ? Url
	 **/
	@RequestMapping("/uss/ion/isg/getIntnetSvcGuidance.do")
	public String selectIntnetSvcGuidance(@RequestParam("intnetSvcId") String intnetSvcId,
			                              @ModelAttribute("intnetSvcGuidanceVO") IntnetSvcGuidanceVO intnetSvcGuidanceVO,
			                              ModelMap model) throws Exception {

		intnetSvcGuidanceVO.setIntnetSvcId(intnetSvcId);
		model.addAttribute("intnetSvcGuidance", egovIntnetSvcGuidanceService.selectIntnetSvcGuidance(intnetSvcGuidanceVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceUpdt";
	}

	/**
	 * ??????????? ???? ???? ????.
	 * @return String - ? Url
	 **/
	@RequestMapping("/uss/ion/isg/addViewIntnetSvcGuidance.do")
    public String insertIntnetSvcGuidanceView(@ModelAttribute("intnetSvcGuidanceVO") IntnetSvcGuidanceVO intnetSvcGuidanceVO) throws Exception {

        return "egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceRegist";
    }

	/**
	 * ???????????????.
	 * @param intnetSvcGuidance - ??????? model
	 * @return String - ? Url
	 **/
	@RequestMapping("/uss/ion/isg/addIntnetSvcGuidance.do")
	public String insertIntnetSvcGuidance(@Valid @ModelAttribute("intnetSvcGuidance") IntnetSvcGuidance intnetSvcGuidance,
			                              @ModelAttribute("intnetSvcGuidanceVO") IntnetSvcGuidanceVO intnetSvcGuidanceVO,
			                               BindingResult bindingResult,
			                               ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("intnetSvcGuidanceVO", intnetSvcGuidanceVO);
			return "egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceRegist";
		} else {
	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

	    	intnetSvcGuidance.setIntnetSvcId(egovIntnetSvcGuidanceIdGnrService.getNextStringId());
	    	intnetSvcGuidance.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
	    	intnetSvcGuidanceVO.setIntnetSvcId(intnetSvcGuidance.getIntnetSvcId());

	    	model.addAttribute("intnetSvcGuidance", egovIntnetSvcGuidanceService.insertIntnetSvcGuidance(intnetSvcGuidance, intnetSvcGuidanceVO));
	    	model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

//			return "egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceUpdt";
			return "forward:/uss/ion/isg/selectIntnetSvcGuidanceList.do";
		}
	}

	/**
	 * ??????????????????.
	 * @param intnetSvcGuidance - ??????? model
	 * @return String - ? Url
	 **/
	@RequestMapping("/uss/ion/isg/updtIntnetSvcGuidance.do")
	public String updateIntnetSvcGuidance(@Valid @ModelAttribute("intnetSvcGuidance") IntnetSvcGuidance intnetSvcGuidance,
			                                                                   BindingResult bindingResult,
			                        			                               ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("intnetSvcGuidanceVO", intnetSvcGuidance);
			return "egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceUpdt";
		} else {
	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	    	intnetSvcGuidance.setUserId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

			egovIntnetSvcGuidanceService.updateIntnetSvcGuidance(intnetSvcGuidance);
//			return "forward:/uss/ion/isg/getIntnetSvcGuidance.do";
			return "forward:/uss/ion/isg/selectIntnetSvcGuidanceList.do";
		}
	}

	/**
	 * ???????????????????.
	 * @param intnetSvcGuidance - ??????? model
	 * @return String - ? Url
	 **/
	@RequestMapping("/uss/ion/isg/removeIntnetSvcGuidance.do")
	public String deleteIntnetSvcGuidance(@ModelAttribute("intnetSvcGuidance") IntnetSvcGuidance intnetSvcGuidance,
			                               ModelMap model) throws Exception {

    	egovIntnetSvcGuidanceService.deleteIntnetSvcGuidance(intnetSvcGuidance);

    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
    	return "forward:/uss/ion/isg/selectIntnetSvcGuidanceList.do";
	}


	/**
	 * ???????? ??????.
	 * @param intnetSvcGuidanceVO - ??????? VO
	 * @return String - ? Url
	 **/
	@RequestMapping("/uss/ion/isg/selectIntnetSvcGuidanceResultList.do")
	public String selectIntnetSvcGuidanceResult(@ModelAttribute("intnetSvcGuidanceVO") IntnetSvcGuidanceVO intnetSvcGuidanceVO,
                                               ModelMap model ) throws Exception {

		List<IntnetSvcGuidanceVO> intnetSvcGuidanceList = egovIntnetSvcGuidanceService.selectIntnetSvcGuidanceResult(intnetSvcGuidanceVO);

		for (IntnetSvcGuidanceVO element : intnetSvcGuidanceList) {
			element.setIntnetSvcDc(element.getIntnetSvcDc());
		}

		model.addAttribute("intnetSvcGuidanceList", intnetSvcGuidanceList);

		return "egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceView";
	}
}
