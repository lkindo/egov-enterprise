package egovframework.com.uss.olp.qqm.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?ㅻЦ臾명빆??泥섎━?섎뒗 Service Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovQustnrQestnManageService {

	/**
	 * ?ㅻЦ議곗궗 ?묐떟?먮떟蹂?댁슜寃곌낵/湲고??듬??댁슜寃곌낵 ?듦퀎瑜?議고쉶?쒕떎.
	 * 
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrManageStatistics2(Map<?, ?> map) throws Exception;

    /**
	 * ?ㅻЦ議곗궗 ?듦퀎瑜?議고쉶?쒕떎.
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	public List<?> selectQustnrManageStatistics(Map<?, ?> map) throws Exception;

    /**
	 * ?ㅻЦ吏?뺣낫 ?ㅻЦ?쒕ぉ??議고쉶?쒕떎.
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	public Map<?, ?> selectQustnrManageQestnrSj(Map<?, ?> map) throws Exception;

    /**
	 * ?ㅻЦ臾명빆 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectQustnrQestnManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?ㅻЦ臾명빆瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param qustnrQestnManageVO - ?ㅻЦ臾명빆 ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrQestnManageDetail(QustnrQestnManageVO qustnrQestnManageVO) throws Exception;

    /**
	 * ?ㅻЦ臾명빆瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrQestnManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?ㅻЦ臾명빆瑜??? ?깅줉?쒕떎.
	 * @param qustnrQestnManageVO - ?ㅻЦ臾명빆 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  insertQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception;

    /**
	 * ?ㅻЦ臾명빆瑜??? ?섏젙?쒕떎.
	 * @param qustnrQestnManageVO - ?ㅻЦ臾명빆 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  updateQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception;

    /**
	 * ?ㅻЦ臾명빆瑜??? ??젣?쒕떎.
	 * @param qustnrQestnManageVO - ?ㅻЦ臾명빆 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  deleteQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception;


}
