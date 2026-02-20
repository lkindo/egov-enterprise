package egovframework.com.uss.olp.qtm.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.qtm.service.QustnrTmplatManageVO;

/**
 * ?ㅻЦ?쒗뵆由?Dao Class 援ы쁽
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
 *   2017.06.21  源?덉쁺          ?쒖??꾨젅?꾩썙??v3.7媛쒖꽑 (select->selectOne?쇰줈 ?섏젙)
 *
 * </pre>
 */
@Repository("qustnrTmplatManageDao")
public class QustnrTmplatManageDao extends EgovComAbstractDAO {

    /**
	 * ?쒗뵆由욱뙆?쇰챸??議고쉶?쒕떎.
	 * @param qustnrTmplatManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public Map<?,?> selectQustnrTmplatManageTmplatImagepathnm(QustnrTmplatManageVO qustnrTmplatManageVO){
		return (Map<?,?>)selectOne("QustnrTmplatManage.selectQustnrTmplatManageTmplatImagepathnm", qustnrTmplatManageVO);
	}


	/**
	 * ?ㅻЦ?쒗뵆由?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatManageList(ComDefaultVO searchVO){
		return selectList("QustnrTmplatManage.selectQustnrTmplatManage", searchVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param QustnrTmplatManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatManageDetail(QustnrTmplatManageVO qustnrTmplatManageVO){
		return selectList("QustnrTmplatManage.selectQustnrTmplatManageDetail", qustnrTmplatManageVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrTmplatManageListCnt(ComDefaultVO searchVO){
		return (Integer)selectOne("QustnrTmplatManage.selectQustnrTmplatManageCnt", searchVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? ?깅줉?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	public void insertQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO){
		insert("QustnrTmplatManage.insertQustnrTmplatManage", qustnrTmplatManageVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? ?섏젙?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	public void updateQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO){
		update("QustnrTmplatManage.updateQustnrTmplatManage", qustnrTmplatManageVO);
	}

    /**
	 * ?ㅻЦ?쒗뵆由용?(?? ??젣?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	public void deleteQustnrTmplatManage(QustnrTmplatManageVO qustnrTmplatManageVO){
		//?ㅻЦ?묐떟????젣
		delete("QustnrTmplatManage.deleteQustnrRespondManage", qustnrTmplatManageVO);
		//?ㅻЦ議곗궗(?ㅻЦ寃곌낵) ??젣
		delete("QustnrTmplatManage.deleteQustnrRespondInfo", qustnrTmplatManageVO);
		//?ㅻЦ??ぉ ??젣
		delete("QustnrTmplatManage.deleteQustnrItemManage", qustnrTmplatManageVO);
		//?ㅻЦ臾명빆 ??젣
		delete("QustnrTmplatManage.deleteQustnrQestnManage", qustnrTmplatManageVO);
		//?ㅻЦ愿由???젣
		delete("QustnrTmplatManage.deleteQustnrManage", qustnrTmplatManageVO);

		//?ㅻЦ?쒗뵆由우궘??
		delete("QustnrTmplatManage.deleteQustnrTmplatManage", qustnrTmplatManageVO);
	}
}
