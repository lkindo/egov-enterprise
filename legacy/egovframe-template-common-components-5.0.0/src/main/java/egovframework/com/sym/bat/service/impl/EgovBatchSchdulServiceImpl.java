package egovframework.com.sym.bat.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.bat.service.BatchResult;
import egovframework.com.sym.bat.service.BatchSchdul;
import egovframework.com.sym.bat.service.EgovBatchSchdulService;
import jakarta.annotation.Resource;

/**
 * 諛곗튂?ㅼ?以꾧?由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("egovBatchSchdulService")
public class EgovBatchSchdulServiceImpl extends EgovAbstractServiceImpl implements EgovBatchSchdulService {

	/**
	 * 諛곗튂?ㅼ?以껪AO
	 */
	@Resource(name = "batchSchdulDao")
	private BatchSchdulDao batchSchdulDao;

	/**
	 * 諛곗튂寃곌낵DAO
	 */
	@Resource(name = "batchResultDao")
	private BatchResultDao batchResultDao;

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ??젣?쒕떎.
	 * @param batchSchdul    ??젣???諛곗튂?ㅼ?以꼖odel
	 * @exception Exception Exception
	 */
	@Override
	public void deleteBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		batchSchdulDao.deleteBatchSchdul(batchSchdul);
	}

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ?깅줉?쒕떎.
	 * @param batchSchdul    ?깅줉???諛곗튂?ㅼ?以꼖odel
	 * @exception Exception Exception
	 */
	@Override
	public void insertBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		batchSchdulDao.insertBatchSchdul(batchSchdul);
	}

	/**
	 * 諛곗튂?ㅼ?以꾩쓣 ?곸꽭議고쉶 ?쒕떎.
	 * @return 諛곗튂?ㅼ?以꾩젙蹂?
	 *
	 * @param batchSchdul 議고쉶???諛곗튂?ㅼ?以꼖odel
	 * @exception Exception Exception
	 */
	@Override
	public BatchSchdul selectBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		return batchSchdulDao.selectBatchSchdul(batchSchdul);
	}

	/**
	 * 諛곗튂?ㅼ?以꾩쓽 紐⑸줉??議고쉶 ?쒕떎.
	 * @return 諛곗튂?ㅼ?以꾨ぉ濡?
	 *
	 * @param searchVO 	議고쉶?뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<BatchSchdul> selectBatchSchdulList(BatchSchdul searchVO) throws Exception {
		List<BatchSchdul> result = batchSchdulDao.selectBatchSchdulList(searchVO);
		return result;
	}

	/**
	 * 諛곗튂?ㅼ?以?紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectBatchSchdulListCnt(BatchSchdul searchVO) throws Exception {
		int cnt = batchSchdulDao.selectBatchSchdulListCnt(searchVO);
		return cnt;
	}

	/**
	 * 諛곗튂?ㅼ?以꾩젙蹂대? ?섏젙?쒕떎.
	 *
	 * @param batchSchdul    ?섏젙???諛곗튂?ㅼ?以꼖odel
	 * @exception Exception Exception
	 */
	@Override
	public void updateBatchSchdul(BatchSchdul batchSchdul) throws Exception {
		batchSchdulDao.updateBatchSchdul(batchSchdul);
	}

	/**
	 * 諛곗튂寃곌낵瑜??깅줉?쒕떎.
	 * @param batchResult    ?깅줉???諛곗튂寃곌낵model
	 * @exception Exception Exception
	 */
	@Override
	public void insertBatchResult(BatchResult batchResult) throws Exception {
		batchResultDao.insertBatchResult(batchResult);
	}

	/**
	 * 諛곗튂寃곌낵?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param batchResult    ?섏젙???諛곗튂寃곌낵model
	 * @exception Exception Exception
	 */
	@Override
	public void updateBatchResult(BatchResult batchResult) throws Exception {
		batchResultDao.updateBatchResult(batchResult);
	}

}
