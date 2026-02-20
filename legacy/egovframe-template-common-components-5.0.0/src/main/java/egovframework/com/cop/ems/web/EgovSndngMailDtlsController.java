package egovframework.com.cop.ems.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cop.ems.service.EgovSndngMailDtlsService;
import egovframework.com.cop.ems.service.SndngMailVO;
import jakarta.annotation.Resource;

/**
 * 諛쒖넚硫붿씪 ?댁뿭??議고쉶?섎뒗 而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2009.03.12  諛뺤???         理쒖큹 ?앹꽦
 *
 *  </pre>
 */
@Controller
public class EgovSndngMailDtlsController {

	/** EgovSndngMailDtlsService */
	@Resource(name = "sndngMailDtlsService")
	private EgovSndngMailDtlsService sndngMailDtlsService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 諛쒖넚硫붿씪 ?댁뿭??議고쉶?쒕떎
	 * @param searchVO ComDefaultVO
	 * @return String
	 * @exception Exception
	 */
	@IncludedInfo(name = "諛쒖넚硫붿씪?댁뿭", order = 361, gid = 40)
	@RequestMapping(value = "/cop/ems/selectSndngMailList.do")
	public String selectSndngMailList(@ModelAttribute("searchVO") ComDefaultVO searchVO, ModelMap model) throws Exception {

		// 諛쒖넚硫붿씪 ?댁뿭 議고쉶
		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<SndngMailVO> sndngMailList = sndngMailDtlsService.selectSndngMailList(searchVO);
		model.addAttribute("resultList", sndngMailList);

		int totCnt = sndngMailDtlsService.selectSndngMailListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/cop/ems/EgovMailDtls";
	}

	/**
	 * 諛쒖넚硫붿씪????젣?쒕떎.
	 * @param sndngMailVO SndngMailVO
	 * @return String
	 * @exception
	 */
	@RequestMapping(value = "/cop/ems/deleteSndngMailList.do")
	public String deleteSndngMailList(@ModelAttribute("sndngMailVO") SndngMailVO sndngMailVO, ModelMap model) throws Exception {

		if (sndngMailVO == null || sndngMailVO.getMssageId() == null || sndngMailVO.getMssageId().equals("")) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. 諛쒖넚硫붿씪????젣?쒕떎.
		sndngMailDtlsService.deleteSndngMailList(sndngMailVO);

		// 2. 諛쒖넚硫붿씪 紐⑸줉 ?섏씠吏 ?대룞
		return "redirect:/cop/ems/selectSndngMailList.do";
	}
}