package egovframework.com.uss.olp.qqm.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.qqm.service.QustnrQestnManageVO;

/**
 * ?ㅻЦ臾명빆??泥섎━?섎뒗 Dao Class 援ы쁽
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
 *   2017.07.17  源?덉쁺          ?쒖??꾨젅?꾩썙??v3.7 媛쒖꽑(select->selectOne?섏젙)
 *
 * </pre>
 */
@Repository("qustnrQestnManageDao")
public class QustnrQestnManageDao extends EgovComAbstractDAO {

    /**
	 * ?ㅻЦ議곗궗 ?묐떟?먮떟蹂?댁슜寃곌낵/湲고??듬??댁슜寃곌낵 ?듦퀎瑜?議고쉶?쒕떎.
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrManageStatistics2(Map<?, ?> map) throws Exception{
		return selectList("QustnrQestnManage.selectQustnrManageStatistics2", map);
	}

    /**
	 * ?ㅻЦ議곗궗 ?듦퀎瑜?議고쉶?쒕떎.
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	public List<?> selectQustnrManageStatistics(Map<?, ?> map) throws Exception{
		return selectList("QustnrQestnManage.selectQustnrManageStatistics", map);
	}

    /**
	 * ?ㅻЦ吏?뺣낫 ?ㅻЦ?쒕ぉ??議고쉶?쒕떎.
	 * @param Map - ?ㅻЦ吏 ?뺣낫媛 ?닿? Parameter
	 * @return Map
	 * @throws Exception
	 */
	public Map<?, ?> selectQustnrManageQestnrSj(Map<?, ?> map) throws Exception{
		return (Map<?, ?>)selectOne("QustnrQestnManage.selectQustnrManageQestnrSj", map);
	}


    /**
	 * ?ㅻЦ臾명빆 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectQustnrQestnManageList(ComDefaultVO searchVO) throws Exception{
		return selectList("QustnrQestnManage.selectQustnrQestnManage", searchVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param qustnrQestnManageVO - ?ㅻЦ臾명빆 ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrQestnManageDetail(QustnrQestnManageVO qustnrQestnManageVO) throws Exception{
		return selectList("QustnrQestnManage.selectQustnrQestnManageDetail", qustnrQestnManageVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrQestnManageListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("QustnrQestnManage.selectQustnrQestnManageCnt", searchVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? ?깅줉?쒕떎.
	 * @param qqustnrQestnManageVO - ?ㅻЦ臾명빆 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void insertQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception{
		insert("QustnrQestnManage.insertQustnrQestnManage", qustnrQestnManageVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? ?섏젙?쒕떎.
	 * @param qustnrQestnManageVO - ?ㅻЦ臾명빆 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void updateQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception{
		insert("QustnrQestnManage.updateQustnrQestnManage", qustnrQestnManageVO);
	}

    /**
	 * ?ㅻЦ臾명빆瑜??? ??젣?쒕떎.
	 * @param qustnrQestnManageVO - ?ㅻЦ臾명빆 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void deleteQustnrQestnManage(QustnrQestnManageVO qustnrQestnManageVO) throws Exception{

		//?ㅻЦ議곗궗(?ㅻЦ寃곌낵) ??젣
		delete("QustnrQestnManage.deleteQustnrRespondInfo", qustnrQestnManageVO);
		//?ㅻЦ??ぉ ??젣
		delete("QustnrQestnManage.deleteQustnrItemManage", qustnrQestnManageVO);

		//?ㅻЦ臾명빆
		delete("QustnrQestnManage.deleteQustnrQestnManage", qustnrQestnManageVO);
	}
}
