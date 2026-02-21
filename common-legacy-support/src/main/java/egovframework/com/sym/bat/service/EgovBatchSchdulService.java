package egovframework.com.sym.bat.service;

import java.util.List;

/**
 * ?????? ????Service Interface?????.
 *
 * @author ?
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?? 10:27:13
 * @see
 * <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.17   ?    ????
 * </pre>
 **/
public interface EgovBatchSchdulService {

	/**
	 * ?????? ?????.
	 *
	 * @param batchSchdul    ???????????odel
	 * @exception Exception Exception
	 **/
	public void deleteBatchSchdul(BatchSchdul batchSchdul) throws Exception;

	/**
	 * ?????????.
	 *
	 * @param batchSchdul    ?????????odel
	 * @exception Exception Exception
	 **/
	public void insertBatchSchdul(BatchSchdul batchSchdul) throws Exception;

	/**
	 * ?????? ?????.
	 * @return ??????
	 *
	 * @param batchSchdul    ?????????odel
	 * @exception Exception Exception
	 **/
	public BatchSchdul selectBatchSchdul(BatchSchdul batchSchdul) throws Exception;

	/**
	 * ??????????.
	 * @return ??????
	 *
	 * @param searchVO    ??VO
	 * @exception Exception Exception
	 **/
	public List<BatchSchdul> selectBatchSchdulList(BatchSchdul searchVO) throws Exception;

	/**
	 * ??????? ???? ???.
	 * @return ?
	 *
	 * @param searchVO    ???? ?? VO
	 * @exception Exception Exception
	 **/
	public int selectBatchSchdulListCnt(BatchSchdul searchVO) throws Exception;

	/**
	 * ??????????.
	 *
	 * @param batchSchdul    ??????????odel
	 * @exception Exception Exception
	 **/
	public void updateBatchSchdul(BatchSchdul batchSchdul) throws Exception;

	/**
	 * ??????.
	 * @param batchResult    ??????model
	 * @exception Exception Exception
	 **/
	public void insertBatchResult(BatchResult batchResult) throws Exception;

	/**
	 * ????????.
	 *
	 * @param batchResult    ???????model
	 * @exception Exception Exception
	 **/
	public void updateBatchResult(BatchResult batchResult) throws Exception;

}
