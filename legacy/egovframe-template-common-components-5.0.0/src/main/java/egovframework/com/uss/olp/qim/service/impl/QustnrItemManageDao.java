package egovframework.com.uss.olp.qim.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.qim.service.QustnrItemManageVO;
/**
 * ?ㅻЦ??ぉ愿由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
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
 *   2017.07.18  源?덉쁺          ?쒖??꾨젅?꾩썙??v3.7 媛쒖꽑(select->selectOne?섏젙)
 *
 * </pre>
 */
@Repository("qustnrItemManageDao")
public class QustnrItemManageDao extends EgovComAbstractDAO {


    /**
	 * ?ㅻЦ?쒗뵆由???瑜? 紐⑸줉??議고쉶?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatManageList(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		return selectList("QustnrItemManage.selectQustnrTmplatManage", qustnrItemManageVO);
	}

    /**
	 * ?ㅻЦ??ぉ 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrItemManageList(ComDefaultVO searchVO) throws Exception{
		return selectList("QustnrItemManage.selectQustnrItemManage", searchVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrItemManageDetail(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		return selectList("QustnrItemManage.selectQustnrItemManageDetail", qustnrItemManageVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrItemManageListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("QustnrItemManage.selectQustnrItemManageCnt", searchVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? ?깅줉?쒕떎.
	 * @param qqustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void insertQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		insert("QustnrItemManage.insertQustnrItemManage", qustnrItemManageVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? ?섏젙?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void updateQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		insert("QustnrItemManage.updateQustnrItemManage", qustnrItemManageVO);
	}

    /**
	 * ?ㅻЦ??ぉ瑜??? ??젣?쒕떎.
	 * @param qustnrItemManageVO - ?ㅻЦ??ぉ ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void deleteQustnrItemManage(QustnrItemManageVO qustnrItemManageVO) throws Exception{
		//?ㅻЦ議곗궗(?ㅻЦ寃곌낵) ??젣
		delete("QustnrItemManage.deleteQustnrRespondInfo", qustnrItemManageVO);

		//?ㅻЦ??ぉ ??젣
		insert("QustnrItemManage.deleteQustnrItemManage", qustnrItemManageVO);

	}
}
