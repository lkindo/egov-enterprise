package egovframework.com.sec.ram.web;

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
import egovframework.com.sec.ram.service.AuthorManage;
import egovframework.com.sec.ram.service.AuthorManageVO;
import egovframework.com.sec.ram.service.EgovAuthorManageService;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 沅뚰븳愿由ъ뿉 愿??controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?s
 *   2024.10.29	LeeBaekHaeng	寃?됱“嫄??좎?
 *
 * </pre>
 */
 @Controller
@SessionAttributes(types=SessionVO.class)
public class EgovAuthorManageController {

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name = "egovAuthorManageService")
    private EgovAuthorManageService egovAuthorManageService;

    /** EgovPropertyService */
    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;



	/**
	 * 沅뚰븳 紐⑸줉??議고쉶?쒕떎
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
    @IncludedInfo(name="沅뚰븳愿由?, listUrl="/sec/ram/EgovAuthorList.do", order = 60,gid = 20)
    @RequestMapping(value="/sec/ram/EgovAuthorList.do")
    public String selectAuthorList(@ModelAttribute("authorManageVO") AuthorManageVO authorManageVO,
    		                        ModelMap model)
            throws Exception {

    	/** EgovPropertyService.sample */
    	//authorManageVO.setPageUnit(propertiesService.getInt("pageUnit"));
    	//authorManageVO.setPageSize(propertiesService.getInt("pageSize"));

    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(authorManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(authorManageVO.getPageUnit());
		paginationInfo.setPageSize(authorManageVO.getPageSize());

		authorManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		authorManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		authorManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		authorManageVO.setAuthorManageList(egovAuthorManageService.selectAuthorList(authorManageVO));
        model.addAttribute("authorList", authorManageVO.getAuthorManageList());

        int totCnt = egovAuthorManageService.selectAuthorListTotCnt(authorManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);
        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/sec/ram/EgovAuthorManage";
    }

    /**
	 * 沅뚰븳 ?몃??뺣낫瑜?議고쉶?쒕떎.
	 * @param authorCode String
	 * @param authorManageVO AuthorManageVO
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/ram/EgovAuthor.do")
    public String selectAuthor(@RequestParam("authorCode") String authorCode,
    	                       @ModelAttribute("authorManageVO") AuthorManageVO authorManageVO,
    		                    ModelMap model) throws Exception {

		authorManageVO.setAuthorCode(authorCode);

    	model.addAttribute("authorManage", egovAuthorManageService.selectAuthor(authorManageVO));
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
    	return "egovframework/com/sec/ram/EgovAuthorUpdate";
    }

    /**
	 * 沅뚰븳 ?깅줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/sec/ram/EgovAuthorInsertView.do")
    public String insertAuthorView(@ModelAttribute("authorManage") AuthorManage authorManage)
            throws Exception {
        return "egovframework/com/sec/ram/EgovAuthorInsert";
    }

    /**
	 * 沅뚰븳 ?몃??뺣낫瑜??깅줉?쒕떎.
	 * @param authorManage AuthorManage
	 * @param bindingResult BindingResult
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/ram/EgovAuthorInsert.do")
    public String insertAuthor(@Valid @ModelAttribute("authorManage") AuthorManage authorManage,
    		                    BindingResult bindingResult,
    		                    ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sec/ram/EgovAuthorInsert";
		} else {
			egovAuthorManageService.insertAuthor(authorManage);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

			model.addAttribute("searchCondition", authorManage.getSearchCondition());
			model.addAttribute("searchKeyword", authorManage.getSearchKeyword());
			model.addAttribute("pageIndex", authorManage.getPageIndex());

			return "redirect:/sec/ram/EgovAuthorList.do";
		}
    }

    /**
	 * 沅뚰븳 ?몃??뺣낫瑜??섏젙?쒕떎.
	 * @param authorManage AuthorManage
	 * @param bindingResult BindingResult
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/ram/EgovAuthorUpdate.do")
    public String updateAuthor(@Valid @ModelAttribute("authorManage") AuthorManage authorManage,
    		                    BindingResult bindingResult,
    		                    Model model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sec/ram/EgovAuthorUpdate";
		} else {
			egovAuthorManageService.updateAuthor(authorManage);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));

			model.addAttribute("searchCondition", authorManage.getSearchCondition());
			model.addAttribute("searchKeyword", authorManage.getSearchKeyword());
			model.addAttribute("pageIndex", authorManage.getPageIndex());

			return "redirect:/sec/ram/EgovAuthorList.do";
		}
    }

    /**
	 * 沅뚰븳 ?몃??뺣낫瑜???젣?쒕떎.
	 * @param authorManage AuthorManage
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/ram/EgovAuthorDelete.do")
    public String deleteAuthor(@ModelAttribute("authorManage") AuthorManage authorManage,
    		                    Model model) throws Exception {

    	egovAuthorManageService.deleteAuthor(authorManage);
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		model.addAttribute("searchCondition", authorManage.getSearchCondition());
		model.addAttribute("searchKeyword", authorManage.getSearchKeyword());
		model.addAttribute("pageIndex", authorManage.getPageIndex());

		return "redirect:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * 沅뚰븳紐⑸줉????젣?쒕떎.
	 * @param authorCodes String
	 * @param authorManage AuthorManage
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping(value="/sec/ram/EgovAuthorListDelete.do")
    public String deleteAuthorList(@RequestParam("authorCodes") String authorCodes,
    		                       @ModelAttribute("authorManage") AuthorManage authorManage,
    		                        Model model) throws Exception {

    	String [] strAuthorCodes = authorCodes.split(";");
    	for (String strAuthorCode : strAuthorCodes) {
			authorManage.setAuthorCode(strAuthorCode);
			egovAuthorManageService.deleteAuthor(authorManage);
		}
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));

		model.addAttribute("searchCondition", authorManage.getSearchCondition());
		model.addAttribute("searchKeyword", authorManage.getSearchKeyword());
		model.addAttribute("pageIndex", authorManage.getPageIndex());

		return "redirect:/sec/ram/EgovAuthorList.do";
	}

	/**
	 * 沅뚰븳?쒗븳 ?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @RequestMapping("/sec/ram/accessDenied.do")
    public String accessDenied()
            throws Exception {
        return "egovframework/com/sec/accessDenied";
    }
}
