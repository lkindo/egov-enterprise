package egovframework.com.utl.sys.trm.service;
import java.util.List;

/**
 * ??????? ????Service Interface?????.
 *
 * @author ?
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?? 10:27:13
 * @see
 * <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.21   ?    ????
 * </pre>
 **/
public interface EgovTrsmrcvMntrngService {

	/**
	 * ??????? ?????.
	 *
	 * @param trsmrcvMntrng    ????????????odel
	 * @exception Exception Exception
	 **/
	public void deleteTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng)
	  throws Exception;

	/**
	 * ??????????.
	 *
	 * @param trsmrcvMntrng    ??????????odel
	 * @exception Exception Exception
	 **/
	public void insertTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng)
	  throws Exception;

	/**
	 * ?????? ???.
	 *
	 * @param trsmrcvMntrngLog    ???????????del
	 * @exception Exception Exception
	 **/
	public void insertTrsmrcvMntrngLog(TrsmrcvMntrngLog trsmrcvMntrngLog)
	  throws Exception;

	/**
	 * ??????? ?????.
	 * @return ???????
	 *
	 * @param trsmrcvMntrng    ??????????odel
	 * @exception Exception Exception
	 **/
	public TrsmrcvMntrng selectTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng)
	  throws Exception;

	/**
	 * ??????  ?????.
	 * @return ??????
	 *
	 * @param trsmrcvMntrngLog    ???????????del
	 * @exception Exception Exception
	 **/
	public TrsmrcvMntrngLog selectTrsmrcvMntrngLog(TrsmrcvMntrngLog trsmrcvMntrngLog)
	  throws Exception;

	/**
	 * ???????????.
	 * @return ???????
	 *
	 * @param searchVO    ??VO
	 * @exception Exception Exception
	 **/
	public List<TrsmrcvMntrng> selectTrsmrcvMntrngList(TrsmrcvMntrng searchVO)
	  throws Exception;

	/**
	 * ???????? ???? ???.
	 * @return ?
	 *
	 * @param searchVO    ???? ?? VO
	 * @exception Exception Exception
	 **/
	public int selectTrsmrcvMntrngListCnt(TrsmrcvMntrng searchVO)
	  throws Exception;

	/**
	 * ???????????.
	 * @return ??????
	 *
	 * @param searchVO    ??VO
	 * @exception Exception Exception
	 **/
	public List<TrsmrcvMntrngLog> selectTrsmrcvMntrngLogList(TrsmrcvMntrngLog searchVO)
	  throws Exception;

	/**
	 * ???????? ???? ???.
	 * @return ?
	 *
	 * @param searchVO    ???? ?? VO
	 * @exception Exception Exception
	 **/
	public int selectTrsmrcvMntrngLogListCnt(TrsmrcvMntrngLog searchVO)
	  throws Exception;

	/**
	 * ???????????.
	 *
	 * @param trsmrcvMntrng    ???????????odel
	 * @exception Exception Exception
	 **/
	public void updateTrsmrcvMntrng(TrsmrcvMntrng trsmrcvMntrng)
	  throws Exception;

	/**
	 * ?? ?????.
	 * @return ???
	 *
	 * @param searchVO    ??VO
	 * @exception Exception Exception
	 **/
	public List<CntcVO> selectCntcList(CntcVO searchVO)
	  throws Exception;
	/**
	 * ?? ?? ???? ???.
	 * @return ?
	 *
	 * @param searchVO    ???? ?? VO
	 * @exception Exception Exception
	 **/
	public int selectCntcListCnt(CntcVO searchVO)
	  throws Exception;

}
