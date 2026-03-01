package egovframework.com.sym.bat.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.bat.service.BatchOpert;

/**
 * 諛곗튂?묒뾽愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.17   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
@Repository("batchOpertDao")
public class BatchOpertDao extends EgovComAbstractDAO {

	/**
	 * 諛곗튂?묒뾽????젣?쒕떎.
	 *
	 * @param batchOpert    ??젣??諛곗튂?묒뾽 VO
	 * @exception Exception Exception
	 */
	public void deleteBatchOpert(BatchOpert batchOpert) throws Exception {
		delete("BatchOpertDao.deleteBatchOpert", batchOpert);
	}

	/**
	 * 諛곗튂?묒뾽???깅줉?쒕떎.
	 *
	 * @param batchOpert ??ν븷 諛곗튂?묒뾽 VO
	 * @exception Exception Exception
	 */
	public void insertBatchOpert(BatchOpert batchOpert) throws Exception {
		insert("BatchOpertDao.insertBatchOpert", batchOpert);
	}

	/**
	 * 諛곗튂?묒뾽?뺣낫瑜??곸꽭議고쉶 ?쒕떎.
	 * @return 諛곗튂?묒뾽?뺣낫
	 *
	 * @param batchOpert    議고쉶??KEY媛 ?덈뒗 諛곗튂?묒뾽 VO
	 * @exception Exception Exception
	 */
	public BatchOpert selectBatchOpert(BatchOpert batchOpert) throws Exception {
		return selectOne("BatchOpertDao.selectBatchOpert", batchOpert);
	}

	/**
	 * 諛곗튂?묒뾽?뺣낫紐⑸줉?? 議고쉶?쒕떎.
	 * @return 諛곗튂?묒뾽紐⑸줉
	 *
	 * @param searchVO    議고쉶議곌굔????λ맂 VO
	 * @exception Exception Exception
	 */
	public List<BatchOpert> selectBatchOpertList(BatchOpert searchVO) throws Exception {
		return selectList("BatchOpertDao.selectBatchOpertList", searchVO);
	}

	/**
	 * 諛곗튂?묒뾽 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectBatchOpertListCnt(BatchOpert searchVO) throws Exception {
		return (Integer) selectOne("BatchOpertDao.selectBatchOpertListCnt", searchVO);
	}

	/**
	 * 諛곗튂?묒뾽?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param batchOpert    ?섏젙???諛곗튂?묒뾽 VO
	 * @exception Exception Exception
	 */
	public void updateBatchOpert(BatchOpert batchOpert) throws Exception {
		update("BatchOpertDao.updateBatchOpert", batchOpert);
	}

}
