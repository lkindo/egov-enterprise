package egovframework.com.sym.ccm.cde.service;

import java.util.List;

import egovframework.com.cmm.service.CmmnDetailCode;

/**
*
* ???????????????????????? ???
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

public interface EgovCcmCmmnDetailCodeManageService {
	/**
	 * ????????????.
	 * @param searchVO
	 * @return int(?????????
	 **/
	int selectCmmnDetailCodeListTotCnt(CmmnDetailCodeVO searchVO) throws Exception;
	
	/**
	 * ??????????.
	 * @param searchVO
	 * @return List(??????
	 * @throws Exception
	 **/
	List<CmmnDetailCodeVO> selectCmmnDetailCodeList(CmmnDetailCodeVO searchVO) throws Exception;

	/**
	 * ??????????????.
	 * @param cmmnDetailCodeVO
	 * @return CmmnDetailCode(?????
	 * @throws Exception
	 **/
	CmmnDetailCode selectCmmnDetailCodeDetail(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception;

	/**
	 * ??????????.
	 * @param cmmnDetailCodeVO
	 * @throws Exception
	 **/
	void deleteCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception;

	/**
	 * ????????.
	 * @param cmmnDetailCodeVO
	 * @throws Exception
	 **/
	void insertCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception;

	/**
	 * ?????????.
	 * @param cmmnDetailCodeVO
	 * @throws Exception
	 **/
	void updateCmmnDetailCode(CmmnDetailCodeVO cmmnDetailCodeVO) throws Exception;

}
