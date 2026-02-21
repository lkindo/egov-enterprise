package egovframework.com.uss.sam.cpy.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 *
 * ???????????? ?????????
 * 
 * @author ???????? ??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????         ????      ????
 *  -----------    --------    ---------------------------
 *   2009.04.01     ??      ????
 *
 *      </pre>
 **/
public interface EgovCpyrhtPrtcPolicyService {

	/**
	 * ??????? ?????.
	 * 
	 * @param vo
	 * @return ???
	 * @exception Exception
	 **/
	CpyrhtPrtcPolicyVO selectCpyrhtPrtcPolicyDetail(CpyrhtPrtcPolicyVO vo) throws Exception;

	/**
	 * ???????  ?????.
	 * 
	 * @param searchVO
	 * @return  ?
	 * @exception Exception
	 **/
	List<EgovMap> selectCpyrhtPrtcPolicyList(CpyrhtPrtcPolicyDefaultVO searchVO) throws Exception;

	/**
	 * ???????  ???????.
	 * 
	 * @param searchVO
	 * @return  ????
	 **/
	int selectCpyrhtPrtcPolicyListTotCnt(CpyrhtPrtcPolicyDefaultVO searchVO);

	/**
	 * ??????? ?????.
	 * 
	 * @param vo
	 * @exception Exception
	 **/
	void insertCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception;

	/**
	 * ??????? ??????.
	 * 
	 * @param vo
	 * @exception Exception
	 **/
	void updateCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception;

	/**
	 * ??????? ???????.
	 * 
	 * @param vo
	 * @exception Exception
	 **/
	void deleteCpyrhtPrtcPolicyCn(CpyrhtPrtcPolicyVO vo) throws Exception;

}
