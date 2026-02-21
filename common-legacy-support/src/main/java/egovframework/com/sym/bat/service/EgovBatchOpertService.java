package egovframework.com.sym.bat.service;

import java.util.List;

/**
 * ???? ????Service Interface?????.
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
public interface EgovBatchOpertService {

	/**
	 * ???? ?????.
	 *
	 * @param batchOpert    ?????????model
	 * @exception Exception Exception
	 **/
	public void deleteBatchOpert(BatchOpert batchOpert) throws Exception;

	/**
	 * ???????.
	 *
	 * @param batchOpert    ???????model
	 * @exception Exception Exception
	 **/
	public void insertBatchOpert(BatchOpert batchOpert) throws Exception;

	/**
	 * ???? ?????.
	 * @return ???
	 *
	 * @param batchOpert    ???????model
	 * @exception Exception Exception
	 **/
	public BatchOpert selectBatchOpert(BatchOpert batchOpert) throws Exception;

	/**
	 * ?? ?????.
	 * @return ???
	 *
	 * @param searchVO    ??VO
	 * @exception Exception Exception
	 **/
	public List<BatchOpert> selectBatchOpertList(BatchOpert searchVO) throws Exception;

	/**
	 * ?? ?? ???? ???.
	 * @return ?
	 *
	 * @param searchVO    ???? ?? VO
	 * @exception Exception Exception
	 **/
	public int selectBatchOpertListCnt(BatchOpert searchVO) throws Exception;

	/**
	 * ????????.
	 *
	 * @param batchOpert    ????????model
	 * @exception Exception Exception
	 **/
	public void updateBatchOpert(BatchOpert batchOpert) throws Exception;

}
