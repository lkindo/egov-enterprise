package egovframework.com.cop.ems.service;

/**
 * ???? ??? ???? ??????????
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
public interface EgovSndngMailDetailService {

	/**
	 * ???? ???.
	 * @param vo SndngMailVO
	 * @return SndngMailVO
	 * @exception Exception
	 **/
	SndngMailVO selectSndngMail(SndngMailVO vo) throws Exception;

	/**
	 * ????????.
	 * @param vo SndngMailVO
	 * @exception
	 **/
	void deleteSndngMail(SndngMailVO vo) throws Exception;

	/**
	 * ???????????.
	 * @param vo SndngMailVO
	 * @exception
	 **/
	void deleteAtchmnFile(SndngMailVO vo) throws Exception;
}
