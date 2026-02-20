package egovframework.com.sym.bat.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.bat.service.BatchSchdul;
import egovframework.com.sym.bat.service.BatchSchdulDfk;

/**
 * 諛곗튂?ㅼ?以꾧?由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Repository("batchSchdulDao")
public class BatchSchdulDao extends EgovComAbstractDAO {

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ??젣?쒕떎.
	 *
	 * @param batchSchdul    ??젣??諛곗튂?ㅼ?以?VO
	 * @exception Exception Exception
	 */
	public void deleteBatchSchdul(BatchSchdul batchSchdul)
	  throws Exception{
		// slave ?뚯씠釉???젣
		delete("BatchSchdulDao.deleteBatchSchdulDfk", batchSchdul.getBatchSchdulId());
		// master ?뚯씠釉???젣
		delete("BatchSchdulDao.deleteBatchSchdul", batchSchdul);
	}

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ?깅줉?쒕떎.
	 *
	 * @param batchSchdul ??ν븷 諛곗튂?ㅼ?以?VO
	 * @exception Exception Exception
	 */
	public void insertBatchSchdul(BatchSchdul batchSchdul)
	  throws Exception{
		// master ?뚯씠釉??몄꽌??
		insert("BatchSchdulDao.insertBatchSchdul", batchSchdul);
		// slave ?뚯씠釉??몄꽌??
		if (batchSchdul.getExecutSchdulDfkSes() != null && batchSchdul.getExecutSchdulDfkSes().length != 0) {
			String batchSchdulId = batchSchdul.getBatchSchdulId();
			String [] dfkSes = batchSchdul.getExecutSchdulDfkSes();
			for (String element : dfkSes) {
				BatchSchdulDfk batchSchdulDfk = new BatchSchdulDfk();
				batchSchdulDfk.setBatchSchdulId(batchSchdulId);
				batchSchdulDfk.setExecutSchdulDfkSe(element);
				insert("BatchSchdulDao.insertBatchSchdulDfk", batchSchdulDfk);
			}
		}
	}

	/**
	 * 諛곗튂?ㅼ?以꾩젙蹂대? ?곸꽭議고쉶 ?쒕떎.
	 * @return 諛곗튂?ㅼ?以꾩젙蹂?
	 *
	 * @param batchSchdul    議고쉶??KEY媛 ?덈뒗 諛곗튂?ㅼ?以?VO
	 * @exception Exception Exception
	 */
	public BatchSchdul selectBatchSchdul(BatchSchdul batchSchdul)
	  throws Exception{
		BatchSchdul result = (BatchSchdul)selectOne("BatchSchdulDao.selectBatchSchdul", batchSchdul);
		// ?ㅼ?以꾩슂?쇱젙蹂대? 媛?몄삩??
		List<BatchSchdulDfk> dfkSeList = selectList("BatchSchdulDao.selectBatchSchdulDfkList", result.getBatchSchdulId());
		String [] dfkSes = new String [dfkSeList.size()];
		for (int j = 0; j < dfkSeList.size(); j++) {
			dfkSes[j] = dfkSeList.get(j).getExecutSchdulDfkSe();
		}
		result.setExecutSchdulDfkSes(dfkSes);
		// ?붾㈃?쒖떆???ㅽ뻾?ㅼ?以??띿꽦??留뚮뱺??
		result.makeExecutSchdul(dfkSeList);

		return result ;
	}

	/**
	 * 諛곗튂?ㅼ?以꾩젙蹂대ぉ濡앹쓣  議고쉶?쒕떎.
	 * @return 諛곗튂?ㅼ?以꾨ぉ濡?
	 *
	 * @param searchVO    議고쉶議곌굔????λ맂 VO
	 * @exception Exception Exception
	 */
	public List<BatchSchdul> selectBatchSchdulList(BatchSchdul searchVO)
	  throws Exception{
		List<BatchSchdul> resultList = selectList("BatchSchdulDao.selectBatchSchdulList", searchVO);

		for (BatchSchdul result : resultList) {
			// ?ㅼ?以꾩슂?쇱젙蹂대? 媛?몄삩??
			List<BatchSchdulDfk> dfkSeList = selectList("BatchSchdulDao.selectBatchSchdulDfkList", result.getBatchSchdulId());
			String [] dfkSes = new String [dfkSeList.size()];
			for (int j = 0; j < dfkSeList.size(); j++) {
				dfkSes[j] = dfkSeList.get(j).getExecutSchdulDfkSe();
			}
			result.setExecutSchdulDfkSes(dfkSes);
			// ?붾㈃?쒖떆???ㅽ뻾?ㅼ?以??띿꽦??留뚮뱺??
			result.makeExecutSchdul(dfkSeList);
		}
		return resultList;
	}

	/**
	 * 諛곗튂?ㅼ?以?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectBatchSchdulListCnt(BatchSchdul searchVO)
	  throws Exception{
		return (Integer)selectOne("BatchSchdulDao.selectBatchSchdulListCnt", searchVO);
	}

	/**
	 * 諛곗튂?ㅼ?以꾩젙蹂대? ?섏젙?쒕떎.
	 *
	 * @param batchSchdul    ?섏젙???諛곗튂?ㅼ?以?VO
	 * @exception Exception Exception
	 */
	public void updateBatchSchdul(BatchSchdul batchSchdul)
	  throws Exception{
		update("BatchSchdulDao.updateBatchSchdul", batchSchdul);
		// slave ?뚯씠釉???젣
		delete("BatchSchdulDao.deleteBatchSchdulDfk", batchSchdul.getBatchSchdulId());
		// slave ?뚯씠釉??몄꽌??
		if (batchSchdul.getExecutSchdulDfkSes() != null && batchSchdul.getExecutSchdulDfkSes().length != 0) {
			String batchSchdulId = batchSchdul.getBatchSchdulId();
			String [] dfkSes = batchSchdul.getExecutSchdulDfkSes();
			for (String element : dfkSes) {
				BatchSchdulDfk batchSchdulDfk = new BatchSchdulDfk();
				batchSchdulDfk.setBatchSchdulId(batchSchdulId);
				batchSchdulDfk.setExecutSchdulDfkSe(element);
				insert("BatchSchdulDao.insertBatchSchdulDfk", batchSchdulDfk);
			}
		}
	}

}