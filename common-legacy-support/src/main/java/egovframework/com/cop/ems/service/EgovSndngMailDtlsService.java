package egovframework.com.cop.ems.service;

import java.util.List;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ? ??????? ???? ??????????
 * @author ???????? ???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2009.03.12  ???         ????
 *
 *  </pre>
 **/
public interface EgovSndngMailDtlsService {

	/**
	 * ? ?????.
	 * @param vo ComDefaultVO
	 * @return List
	 * @exception Exception
	 **/
	List<SndngMailVO> selectSndngMailList(ComDefaultVO vo) throws Exception;

	/**
	 * ? ???? ???.
	 * @param vo ComDefaultVO
	 * @return int
	 * @exception
	 **/
	int selectSndngMailListTotCnt(ComDefaultVO vo) throws Exception;

	/**
	 * ????????.
	 * @param vo SndngMailVO
	 * @exception
	 **/
	void deleteSndngMailList(SndngMailVO vo) throws Exception;
}
