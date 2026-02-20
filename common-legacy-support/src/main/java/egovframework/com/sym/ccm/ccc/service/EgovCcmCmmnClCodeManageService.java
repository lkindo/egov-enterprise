package egovframework.com.sym.ccm.ccc.service;

import java.util.List;

/**
 *
 * ??????????????????????? ???
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ????         ????
 *
 * </pre>
 **/


public interface EgovCcmCmmnClCodeManageService {

	/**
	 * ???????????.
	 * 
	 * @param searchVO
	 * @return int(????????
	 **/
	int selectCmmnClCodeListTotCnt(CmmnClCodeVO searchVO) throws Exception;

	/**
	 * ?????????.
	 * @param searchVO
	 * @return List(?????
	 * @throws Exception
	 **/
	List<CmmnClCodeVO> selectCmmnClCodeList(CmmnClCodeVO searchVO) throws Exception;

	 /**
	  *  ?????????????.
	  * @param cmmnClCode
	  * @return CmmnClCode(????
	  *  @throws Exception
	  **/
	CmmnClCode selectCmmnClCodeDetail(CmmnClCodeVO cmmnClCodeVO) throws Exception;

	/**
	 * ???????.
	 * @param cmmnClCodeVO
	 * @throws Exception
	 **/
	void insertCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception;
	
	/**
	 * ?????????.
	 * @param cmmnClCodeVO
	 * @throws Exception
	 **/
	void deleteCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception;
	
	/**
	 * ????????.
	 * @param cmmnClCodeVO
	 * @throws Exception
	 **/
	void updateCmmnClCode(CmmnClCodeVO cmmnClCodeVO) throws Exception;

}
