package egovframework.com.uss.olp.qmc.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.qmc.service.QustnrManageVO;
/**
 * ?ㅻЦ愿由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
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
 *   2017.07.14  源?덉쁺          ?쒖??꾨젅?꾩썙??v3.7媛쒖꽑 (select->selectOne?섏젙)
 *
 * </pre>
 */
@Repository("qustnrManageDao")
public class QustnrManageDao extends EgovComAbstractDAO {

    /**
	 * ?ㅻЦ?쒗뵆由?紐⑸줉??議고쉶?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrTmplatManageList(QustnrManageVO qustnrManageVO) throws Exception{
		return selectList("QustnrManage.selectQustnrTmplatManage", qustnrManageVO);
	}

    /**
	 * ?ㅻЦ愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrManageList(ComDefaultVO searchVO) throws Exception{
		return selectList("QustnrManage.selectQustnrManage", searchVO);
	}

    /**
	 * ?ㅻЦ愿由щ? ?곸꽭議고쉶(Model) ?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
    public QustnrManageVO selectQustnrManageDetailModel(QustnrManageVO qustnrManageVO) throws Exception {
        return (QustnrManageVO) selectOne("QustnrManage.selectQustnrManageDetailModel", qustnrManageVO);
    }

    /**
	 * ?ㅻЦ愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectQustnrManageDetail(QustnrManageVO qustnrManageVO) throws Exception{
		return selectList("QustnrManage.selectQustnrManageDetail", qustnrManageVO);
	}

    /**
	 * ?ㅻЦ愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectQustnrManageListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("QustnrManage.selectQustnrManageCnt", searchVO);
	}

    /**
	 * ?ㅻЦ愿由щ?(?? ?깅줉?쒕떎.
	 * @param qqustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void insertQustnrManage(QustnrManageVO qustnrManageVO) throws Exception{
		insert("QustnrManage.insertQustnrManage", qustnrManageVO);
	}

    /**
	 * ?ㅻЦ愿由щ?(?? ?섏젙?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void updateQustnrManage(QustnrManageVO qustnrManageVO) throws Exception{
		insert("QustnrManage.updateQustnrManage", qustnrManageVO);
	}

    /**
	 * ?ㅻЦ愿由щ?(?? ??젣?쒕떎.
	 * @param qustnrManageVO - ?ㅻЦ愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void deleteQustnrManage(QustnrManageVO qustnrManageVO) throws Exception{
		//?ㅻЦ?묐떟????젣
		delete("QustnrManage.deleteQustnrRespondManage", qustnrManageVO);
		//?ㅻЦ議곗궗(?ㅻЦ寃곌낵) ??젣
		delete("QustnrManage.deleteQustnrRespondInfo", qustnrManageVO);
		//?ㅻЦ??ぉ ??젣
		delete("QustnrManage.deleteQustnrItemManage", qustnrManageVO);
		//?ㅻЦ臾명빆 ??젣
		delete("QustnrManage.deleteQustnrQestnManage", qustnrManageVO);

		//?ㅻЦ愿由???젣
		delete("QustnrManage.deleteQustnrManage", qustnrManageVO);
	}
}
