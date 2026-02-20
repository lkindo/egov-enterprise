package egovframework.com.sym.ccm.cca.service;

import java.util.List;

/**
*
* ?????????????????????? ???
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

public interface EgovCcmCmmnCodeManageService {

	/**
	 * ???????????.
	 * 
	 * @param searchVO
	 * @return int(????????
	 * @throws Exception 
	 **/
	int selectCmmnCodeListTotCnt(CmmnCodeVO searchVO) throws Exception;
	
	/**
	 * ?? ?????.
	 * 
	 * @param searchVO
	 * @return List(?????
	 * @throws Exception
	 **/
	List<CmmnCodeVO> selectCmmnCodeList(CmmnCodeVO searchVO) throws Exception;

	/**
	 * ?? ?????????.
	 * @param cmmnCode
	 * @return CmmnCode(??)
	 * @throws Exception
	 **/
	CmmnCodeVO selectCmmnCodeDetail(CmmnCodeVO cmmnCodeVO) throws Exception;

	/**
	 * ????????.
	 * @param cmmnCodeVO
	 * @throws Exception
	 **/
	void updateCmmnCode(CmmnCodeVO cmmnCodeVO) throws Exception;

	/**
	 * ???????.
	 * @param cmmnCode
	 * @throws Exception
	 **/
	void insertCmmnCode(CmmnCode cmmnCode) throws Exception;

	/**
	 * ?????????.
	 * @param cmmnCode
	 * @throws Exception
	 **/
	void deleteCmmnCode(CmmnCode cmmnCode) throws Exception;

}
