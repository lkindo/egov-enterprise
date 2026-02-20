package egovframework.com.sym.bat.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.bat.service.BatchResult;
import egovframework.com.sym.bat.service.EgovBatchResultService;
import jakarta.annotation.Resource;

/**
 * 諛곗튂寃곌낵愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("egovBatchResultService")
public class EgovBatchResultServiceImpl extends EgovAbstractServiceImpl implements EgovBatchResultService {

	/**
	 * 諛곗튂寃곌낵DAO
	 */
	@Resource(name = "batchResultDao")
	private BatchResultDao dao;

	/**
	 * 諛곗튂寃곌낵????젣?쒕떎.
	 * @param batchResult    ??젣???諛곗튂寃곌낵model
	 * @exception Exception Exception
	 */
	@Override
	public void deleteBatchResult(BatchResult batchResult) throws Exception {
		dao.deleteBatchResult(batchResult);
	}

	/**
	 * 諛곗튂寃곌낵???곸꽭議고쉶 ?쒕떎.
	 * @return 諛곗튂寃곌낵?뺣낫
	 *
	 * @param batchResult 議고쉶???諛곗튂寃곌낵model
	 * @exception Exception Exception
	 */
	@Override
	public BatchResult selectBatchResult(BatchResult batchResult) throws Exception {
		return dao.selectBatchResult(batchResult);
	}

	/**
	 * 諛곗튂寃곌낵??紐⑸줉??議고쉶 ?쒕떎.
	 * @return 諛곗튂寃곌낵紐⑸줉
	 *
	 * @param searchVO 	議고쉶?뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<BatchResult> selectBatchResultList(BatchResult searchVO) throws Exception {
		List<BatchResult> result = dao.selectBatchResultList(searchVO);
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
	public int selectBatchResultListCnt(BatchResult searchVO) throws Exception {
		int cnt = dao.selectBatchResultListCnt(searchVO);
		return cnt;
	}

}