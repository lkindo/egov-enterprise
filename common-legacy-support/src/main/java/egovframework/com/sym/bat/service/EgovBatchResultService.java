package egovframework.com.sym.bat.service;

import java.util.List;

/**
 * ??? ????Service Interface?????.
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
public interface EgovBatchResultService {

	/**
	 * ??? ?????.
	 *
	 * @param batchResult    ????????model
	 * @exception Exception Exception
	 **/
	public void deleteBatchResult(BatchResult batchResult) throws Exception;

	/**
	 * ??? ?????.
	 * @return ??
	 *
	 * @param batchResult    ??????model
	 * @exception Exception Exception
	 **/
	public BatchResult selectBatchResult(BatchResult batchResult) throws Exception;

	/**
	 * ? ?????.
	 * @return ??
	 *
	 * @param searchVO    ??VO
	 * @exception Exception Exception
	 **/
	public List<BatchResult> selectBatchResultList(BatchResult searchVO) throws Exception;

	/**
	 * ??????? ???? ???.
	 * @return ?
	 *
	 * @param searchVO    ???? ?? VO
	 * @exception Exception Exception
	 **/
	public int selectBatchResultListCnt(BatchResult searchVO) throws Exception;

}
