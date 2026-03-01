package egovframework.com.sym.bat.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.bat.service.BatchOpert;
import egovframework.com.sym.bat.service.EgovBatchOpertService;
import jakarta.annotation.Resource;

/**
 * 諛곗튂?묒뾽愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("egovBatchOpertService")
public class EgovBatchOpertServiceImpl extends EgovAbstractServiceImpl implements EgovBatchOpertService {

	/**
	 * 諛곗튂?묒뾽DAO
	 */
	@Resource(name = "batchOpertDao")
	private BatchOpertDao dao;

	/**
	 * 諛곗튂?묒뾽????젣?쒕떎.
	 * @param batchOpert    ??젣???諛곗튂?묒뾽model
	 * @exception Exception Exception
	 */
	@Override
	public void deleteBatchOpert(BatchOpert batchOpert) throws Exception {
		dao.deleteBatchOpert(batchOpert);
	}

	/**
	 * 諛곗튂?묒뾽???깅줉?쒕떎.
	 * @param batchOpert    ?깅줉???諛곗튂?묒뾽model
	 * @exception Exception Exception
	 */
	@Override
	public void insertBatchOpert(BatchOpert batchOpert) throws Exception {
		dao.insertBatchOpert(batchOpert);
	}

	/**
	 * 諛곗튂?묒뾽???곸꽭議고쉶 ?쒕떎.
	 * @return 諛곗튂?묒뾽?뺣낫
	 *
	 * @param batchOpert 議고쉶???諛곗튂?묒뾽model
	 * @exception Exception Exception
	 */
	@Override
	public BatchOpert selectBatchOpert(BatchOpert batchOpert) throws Exception {
		return dao.selectBatchOpert(batchOpert);
	}

	/**
	 * 諛곗튂?묒뾽??紐⑸줉??議고쉶 ?쒕떎.
	 * @return 諛곗튂?묒뾽紐⑸줉
	 *
	 * @param searchVO 	議고쉶?뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<BatchOpert> selectBatchOpertList(BatchOpert searchVO) throws Exception {
		List<BatchOpert> result = dao.selectBatchOpertList(searchVO);
		return result;
	}

	/**
	 * 諛곗튂?묒뾽 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectBatchOpertListCnt(BatchOpert searchVO) throws Exception {
		int cnt = dao.selectBatchOpertListCnt(searchVO);
		return cnt;
	}

	/**
	 * 諛곗튂?묒뾽?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param batchOpert    ?섏젙???諛곗튂?묒뾽model
	 * @exception Exception Exception
	 */
	@Override
	public void updateBatchOpert(BatchOpert batchOpert) throws Exception {
		dao.updateBatchOpert(batchOpert);
	}

}
