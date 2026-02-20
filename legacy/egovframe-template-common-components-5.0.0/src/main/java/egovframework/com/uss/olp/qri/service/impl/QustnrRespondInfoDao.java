package egovframework.com.uss.olp.qri.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.qri.service.QustnrRespondInfoVO;
/**
 * ?ㅻЦ議곗궗 Dao Class 援ы쁽
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
 *   2017.07.24  源?덉쁺          ?쒖??꾨젅?꾩썙??v3.7 媛쒖꽑(select->selectOne?섏젙)
 *
 * </pre>
 */
@Repository("qustnrRespondInfoDao")
public class QustnrRespondInfoDao extends EgovComAbstractDAO {


    /**
	 * ?ㅻЦ?쒗뵆由우쓣 議고쉶?쒕떎.
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectQustnrTmplatManage(Map<?, ?> map) throws Exception{
		return selectList("QustnrRespondInfo.selectQustnrTmplatManages", map);
	}

	/**
	 * 媛앷????듦퀎瑜?議고쉶 議고쉶?쒕떎.
	 *
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrRespondInfoManageStatistics1(Map<?, ?> map) throws Exception {
		return selectList("QustnrRespondInfo.selectQustnrRespondInfoManageStatistics1", map);
	}

	/**
     * 二쇨????듦퀎瑜?議고쉶 議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageStatistics2(Map<?, ?> map) throws Exception {
        return selectList("QustnrRespondInfo.selectQustnrRespondInfoManageStatistics2", map);
    }

    /**
	 * ?뚯썝?뺣낫瑜?議고쉶?쒕떎.
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	public Map<?, ?> selectQustnrRespondInfoManageEmplyrinfo(Map<?, ?> map) throws Exception{
		return (Map<?, ?>)selectOne("QustnrRespondInfo.selectQustnrRespondInfoManageEmplyrinfo", map);
	}

    /**
     * ?ㅻЦ?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageComtnqestnrinfo(Map<?, ?> map) throws Exception {
        return selectList("QustnrRespondInfo.selectQustnrRespondInfoManageComtnqestnrinfo", map);
    }

    /**
     * 臾명빆?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageComtnqustnrqesitm(Map<?, ?> map) throws Exception {
        return selectList("QustnrRespondInfo.selectQustnrRespondInfoManageComtnqustnrqesitm", map);
    }

    /**
     * ??ぉ?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageComtnqustnriem(Map<?, ?> map) throws Exception {
        return selectList("QustnrRespondInfo.selectQustnrRespondInfoManageComtnqustnriem", map);
    }

    /**
     * ?ㅻЦ議곗궗(?ㅻЦ?깅줉)瑜??? 紐⑸줉??議고쉶?쒕떎.
     *
     * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoManageList(ComDefaultVO searchVO){
        return selectList("QustnrRespondInfo.selectQustnrRespondInfoManage", searchVO);
    }

    /**
	 * ?ㅻЦ議곗궗(?ㅻЦ?깅줉)瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrRespondInfoManageListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("QustnrRespondInfo.selectQustnrRespondInfoManageCnt", searchVO);
	}

    /**
     * ?묐떟?먭껐怨??ㅻЦ議곗궗) 紐⑸줉??議고쉶?쒕떎.
     *
     * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoList(ComDefaultVO searchVO) throws Exception {
        return selectList("QustnrRespondInfo.selectQustnrRespondInfo", searchVO);
    }

    /**
     * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?곸꽭議고쉶 ?쒕떎.
     *
     * @param qustnrRespondInfoVO - ?묐떟?먭껐怨??ㅻЦ議곗궗) ?뺣낫 ?닿? VO
     * @throws Exception
     */
    public List<EgovMap> selectQustnrRespondInfoDetail(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception {
        return selectList("QustnrRespondInfo.selectQustnrRespondInfoDetail", qustnrRespondInfoVO);
    }

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
 	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrRespondInfoListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("QustnrRespondInfo.selectQustnrRespondInfoCnt", searchVO);
	}

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?깅줉?쒕떎.
	 * @param qqustnrRespondInfoVO - ?묐떟?먭껐怨??ㅻЦ議곗궗) ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void insertQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception{
		insert("QustnrRespondInfo.insertQustnrRespondInfo", qustnrRespondInfoVO);
	}

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ?섏젙?쒕떎.
	 * @param qustnrRespondInfoVO - ?묐떟?먭껐怨??ㅻЦ議곗궗) ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void updateQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception{
		insert("QustnrRespondInfo.updateQustnrRespondInfo", qustnrRespondInfoVO);
	}

    /**
	 * ?묐떟?먭껐怨??ㅻЦ議곗궗)瑜??? ??젣?쒕떎.
	 * @param qustnrRespondInfoVO - ?묐떟?먭껐怨??ㅻЦ議곗궗) ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void deleteQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception{
		insert("QustnrRespondInfo.deleteQustnrRespondInfo", qustnrRespondInfoVO);
	}

    /**
     * ?ㅻЦ?쒗뵆由??붿씠?몃━?ㅽ듃瑜?議고쉶?쒕떎.
     *
     * @param map - 議고쉶???뺣낫媛 ?닿릿 map
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectQustnrTmplatWhiteList() throws Exception {
        return selectList("QustnrRespondInfo.selectQustnrTmplatWhiteList");
    }
}
