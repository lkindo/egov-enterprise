package egovframework.com.sym.prm.service;

import java.util.List;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ???? ?????????????????? ???.
 * @author ?? ?? ??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ?? ??         ????
 *
 * </pre>
 **/

public interface EgovProgrmManageService {
	/**
	 * ?????????
	 * @param vo ComDefaultVO
	 * @return ProgrmManageVO
	 * @exception Exception
	 **/
	ProgrmManageVO selectProgrm(ProgrmManageVO vo) throws Exception;
	
	/**
     * ???????
     * 
     * @param vo ComDefaultVO
     * @return List
     * @exception Exception
     **/
    List<ProgrmManageVO> selectProgrmList(ComDefaultVO vo) throws Exception;
    
	/**
	 * ??? ???? ???.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 **/
	int selectProgrmListTotCnt(ComDefaultVO vo) throws Exception;
	/**
	 * ???????
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 **/
	void insertProgrm(ProgrmManageVO vo) throws Exception;

	/**
	 * ????????
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 **/
	void updateProgrm(ProgrmManageVO vo) throws Exception;

	/**
	 * ??????????
	 * @param vo ProgrmManageVO
	 * @exception Exception
	 **/
	void deleteProgrm(ProgrmManageVO vo) throws Exception;

	/**
	 * ?????? ????????
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 **/
	int selectProgrmNMTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * ??????????
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO  ????????
	 * @exception Exception
	 **/
	ProgrmManageDtlVO selectProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?????????
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 **/
	List<ProgrmManageDtlVO> selectProgrmChangeRequstList(ComDefaultVO vo) throws Exception;
	/**
	 * ??????????? ???.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 **/
	int selectProgrmChangeRequstListTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * ????????
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 **/
	void insertProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?????????
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 **/
	void updateProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ???????????
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 **/
	void deleteProgrmChangeRequst(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ???????AX ?????
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO
	 * @exception Exception
	 **/
	ProgrmManageDtlVO selectProgrmChangeRequstNo(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ??????????
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 **/
	List<?> selectChangeRequstProcessList(ComDefaultVO vo) throws Exception;

	/**
	 * ???????????? ???.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception Exception
	 **/
	int selectChangeRequstProcessListTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * ??????? ??
	 * @param vo ProgrmManageDtlVO
	 * @exception Exception
	 **/
	void updateProgrmChangeRequstProcess(ProgrmManageDtlVO vo) throws Exception;

	/**
	 * ?????????????????? ????
	 * @param checkedProgrmFileNmForDel String
	 * @exception Exception
	 **/
	void deleteProgrmManageList(String checkedProgrmFileNmForDel) throws Exception;

	/**
	 * ???????Email ?????
	 * @param vo ProgrmManageDtlVO
	 * @return ProgrmManageDtlVO  ????????
	 * @exception Exception
	 **/
	ProgrmManageDtlVO selectRqesterEmail(ProgrmManageDtlVO vo) throws Exception;

}
