/**
 *
 **/
package egovframework.com.cmm.web;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import egovframework.com.cmm.ComDefaultVO;
import jakarta.annotation.Resource;

/**
 * EgovComAbstractController.java ?????
 *
 * @author ????
 * @since 2022.05.04
 * @version 4.1.0
 * @see
 * 
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2022.05.04  ????         ????
 *
 *      </pre>
 **/
public abstract class EgovComAbstractController {

	@Resource(name = "propertiesService")
	private EgovPropertyService egovPropertyService;

	public PaginationInfo builderPaginationInfo(ComDefaultVO comDefaultVO) {
		if (comDefaultVO.getPageUnit() == 10) {
			comDefaultVO.setPageUnit(egovPropertyService.getInt("pageUnit"));
		}
		if (comDefaultVO.getPageSize() == 10) {
			comDefaultVO.setPageSize(egovPropertyService.getInt("pageSize"));
		}

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(comDefaultVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(comDefaultVO.getPageUnit());
		paginationInfo.setPageSize(comDefaultVO.getPageSize());

		comDefaultVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		comDefaultVO.setLastIndex(paginationInfo.getLastRecordIndex());
		comDefaultVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		return paginationInfo;
	}

}
