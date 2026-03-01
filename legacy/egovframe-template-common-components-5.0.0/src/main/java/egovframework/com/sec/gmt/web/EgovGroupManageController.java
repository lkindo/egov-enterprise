package egovframework.com.sec.gmt.web;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.SessionAttributes;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.SessionVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sec.gmt.service.EgovGroupManageService;
import egovframework.com.sec.gmt.service.GroupManage;
import egovframework.com.sec.gmt.service.GroupManageVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 洹몃９愿由ъ뿉 愿??controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?대Ц以          理쒖큹 ?앹꽦
 *   2011.08.26	 ?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */
@Controller
@SessionAttributes(types=SessionVO.class)
public class EgovGroupManageController {

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name = "egovGroupManageService")
    private EgovGroupManageService egovGroupManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    /** Message ID Generation */
    @Resource(name="egovGroupIdGnrService")
    private EgovIdGnrService egovGroupIdGnrService;

    /**
	 * 洹몃９ 紐⑸줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/sec/gmt/EgovGroupListView.do")
    public String selectGroupListView()
            throws Exception {
        return "egovframework/com/sec/gmt/EgovGroupManage";
    }

	/**
	 * ?쒖뒪?쒖궗??紐⑹쟻蹂?洹몃９ 紐⑸줉 議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return String
	 * @exception Exception
	 */
    @IncludedInfo(name="洹몃９愿由?, listUrl="/sec/gmt/EgovGroupList.do", order = 80,gid = 20)
    @RequestMapping(value="/sec/gmt/EgovGroupList.do")
	public String selectGroupList(@ModelAttribute("groupManageVO") GroupManageVO groupManageVO,
                                   ModelMap model) throws Exception {
    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(groupManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(groupManageVO.getPageUnit());
		paginationInfo.setPageSize(groupManageVO.getPageSize());

		groupManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		groupManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		groupManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		groupManageVO.setGroupManageList(egovGroupManageService.selectGroupList(groupManageVO));
        model.addAttribute("groupList", groupManageVO.getGroupManageList());

        int totCnt = egovGroupManageService.selectGroupListTotCnt(groupManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/sec/gmt/EgovGroupManage";
	}

	/**
	 * 寃?됱“嫄댁뿉 ?곕Ⅸ 洹몃９?뺣낫瑜?議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/gmt/EgovGroup.do")
	public String selectGroup(@ModelAttribute("groupManageVO") GroupManageVO groupManageVO,
								@ModelAttribute("groupManage") GroupManage groupManage,
	    		               ModelMap model) throws Exception {

	    model.addAttribute("groupManage", egovGroupManageService.selectGroup(groupManageVO));
	    return "egovframework/com/sec/gmt/EgovGroupUpdate";
	}

    /**
	 * 洹몃９ ?깅줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/gmt/EgovGroupInsertView.do")
    public String insertGroupView(@ModelAttribute("groupManage") GroupManage groupManage)
            throws Exception {
        return "egovframework/com/sec/gmt/EgovGroupInsert";
    }

	/**
	 * 洹몃９ 湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param groupManage GroupManage
	 * @param groupManageVO GroupManageVO
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/gmt/EgovGroupInsert.do")
	public String insertGroup(@Valid @ModelAttribute("groupManage") GroupManage groupManage,
			                  @ModelAttribute("groupManageVO") GroupManageVO groupManageVO,
			                   BindingResult bindingResult,
			                   ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
			return "egovframework/com/sec/gmt/EgovGroupInsert";
		} else {
	    	groupManage.setGroupId(egovGroupIdGnrService.getNextStringId());
	        groupManageVO.setGroupId(groupManage.getGroupId());

	        model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
	        model.addAttribute("groupManage", egovGroupManageService.insertGroup(groupManage, groupManageVO));
	        return "forward:/sec/gmt/EgovGroupList.do";
		}
	}

	/**
	 * ?붾㈃??議고쉶??洹몃９??湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param groupManage GroupManage
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/gmt/EgovGroupUpdate.do")
	public String updateGroup(@Valid @ModelAttribute("groupManage") GroupManage groupManage,
			                   BindingResult bindingResult,
                               Model model) throws Exception {

    	if (bindingResult.hasErrors()) {
			return "egovframework/com/sec/gmt/EgovGroupUpdate";
		} else {
    	    egovGroupManageService.updateGroup(groupManage);
            model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
    	    return "forward:/sec/gmt/EgovGroupList.do";
		}
	}

	/**
	 * 遺덊븘?뷀븳 洹몃９?뺣낫瑜??붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param groupManage GroupManage
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value="/sec/gmt/EgovGroupDelete.do")
	public String deleteGroup(@ModelAttribute("groupManage") GroupManage groupManage,
                             Model model) throws Exception {
		egovGroupManageService.deleteGroup(groupManage);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/gmt/EgovGroupList.do";
	}

	/**
	 * 遺덊븘?뷀븳 洹몃９?뺣낫 紐⑸줉???붾㈃??議고쉶?섏뿬 ?곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param groupIds String
	 * @param groupManage GroupManage
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value="/sec/gmt/EgovGroupListDelete.do")
	public String deleteGroupList(@RequestParam("groupIds") String groupIds,
			                      @ModelAttribute("groupManage") GroupManage groupManage,
	                               Model model) throws Exception {
    	String [] strGroupIds = groupIds.split(";");
    	for (String strGroupId : strGroupIds) {
    		groupManage.setGroupId(strGroupId);
    		egovGroupManageService.deleteGroup(groupManage);
    	}

		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sec/gmt/EgovGroupList.do";
	}

    /**
	 * 洹몃９?앹뾽 ?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/sec/gmt/EgovGroupSearchView.do")
    public String selectGroupSearchView()
            throws Exception {
        return "egovframework/com/sec/gmt/EgovGroupSearch";
    }

	/**
	 * ?쒖뒪?쒖궗??紐⑹쟻蹂?洹몃９ 紐⑸줉 議고쉶
	 * @param groupManageVO GroupManageVO
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/gmt/EgovGroupSearchList.do")
	public String selectGroupSearchList(@ModelAttribute("groupManageVO") GroupManageVO groupManageVO,
                                   ModelMap model) throws Exception {
    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(groupManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(groupManageVO.getPageUnit());
		paginationInfo.setPageSize(groupManageVO.getPageSize());

		groupManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		groupManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		groupManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		groupManageVO.setGroupManageList(egovGroupManageService.selectGroupList(groupManageVO));
        model.addAttribute("groupList", groupManageVO.getGroupManageList());

        int totCnt = egovGroupManageService.selectGroupListTotCnt(groupManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/sec/gmt/EgovGroupSearch";
	}
}
