package egovframework.com.uss.sam.ipm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ????????? Service Class ?
 * 
 * @author ?????????
 * @since 2009.07.03
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????         ????      ????
 *  -----------    --------    ---------------------------
 *   2009.07.03     ???      ????
 *
 *      </pre>
 **/
public interface EgovIndvdlInfoPolicyService {

	/**
	 * ???? ?????.
	 *
	 * @param searchVO ???? ?? VO
	 * @return List
	 * @throws Exception
	 **/
	public List<EgovMap> selectIndvdlInfoPolicyList(ComDefaultVO searchVO) throws Exception;

	/**
	 * ???????? ?? ???? ???.
	 * 
	 * @param searchVO ???? ?? VO
	 * @return int
	 * @throws Exception
	 **/
	public int selectIndvdlInfoPolicyListCnt(ComDefaultVO searchVO) throws Exception;

	/**
	 * ???????? ?????.
	 * 
	 * @param indvdlInfoPolicy ???? ? ??? VO
	 * @return List
	 * @throws Exception
	 **/
	public IndvdlInfoPolicy selectIndvdlInfoPolicyDetail(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception;

	/**
	 * ???????? ???.
	 * 
	 * @param indvdlInfoPolicy ???? ? ??? VO
	 * @throws Exception
	 **/
	void insertIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception;

	/**
	 * ???????? ????.
	 * 
	 * @param indvdlInfoPolicy ???? ? ??? VO
	 * @throws Exception
	 **/
	void updateIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception;

	/**
	 * ???????? ?????.
	 * 
	 * @param indvdlInfoPolicy ???? ? ??? VO
	 * @throws Exception
	 **/
	void deleteIndvdlInfoPolicy(IndvdlInfoPolicy indvdlInfoPolicy) throws Exception;

}
