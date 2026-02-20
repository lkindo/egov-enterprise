package egovframework.com.uss.olp.opm.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.opm.service.OnlinePollItem;
import egovframework.com.uss.olp.opm.service.OnlinePollManage;

/**
 * ?⑤씪?퇠OLL愿由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("onlinePollManageDao")
public class OnlinePollManageDao extends EgovComAbstractDAO {

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? 紐⑸줉???쒕떎.
     * @param onlinePollVO  ?⑤씪?퇠OLL愿由??뺣낫 ?닿? VO
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectOnlinePollManageList(ComDefaultVO searchVO) throws Exception {
        return selectList("OnlinePollManage.selectOnlinePollManage", searchVO);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    public OnlinePollManage selectOnlinePollManageDetail(OnlinePollManage onlinePollManage) throws Exception {
        return (OnlinePollManage)selectOne("OnlinePollManage.selectOnlinePollManageDetail", onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @return int
     * @throws Exception
     */
    public int selectOnlinePollManageListCnt(ComDefaultVO searchVO) throws Exception {
        return (Integer)selectOne("OnlinePollManage.selectOnlinePollManageCnt", searchVO);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?깅줉?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void insertOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception {
        insert("OnlinePollManage.insertOnlinePollManage", onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?섏젙?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void updateOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception {
        update("OnlinePollManage.updateOnlinePollManage", onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ??젣?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void deleteOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception {
        //?⑤씪?퇠OLL 寃곌낵 ?뺣낫 ??젣
        delete("OnlinePollManage.deleteOnlinePollResultAll", onlinePollManage);
        //?⑤씪?퇠OLL ??ぉ ?뺣낫 ??젣
        delete("OnlinePollManage.deleteOnlinePollItemAll", onlinePollManage);
        //?⑤씪?퇠OLL 愿由??뺣낫 ??젣
        delete("OnlinePollManage.deleteOnlinePollManage", onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?듦퀎瑜?議고쉶 ?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public List<OnlinePollManage> selectOnlinePollManageStatistics(OnlinePollManage onlinePollManage) throws Exception {
        return selectList("OnlinePollManage.selectOnlinePollManageDetail", onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? 議고쉶?쒕떎.
     * @param onlinePollItem  ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public List<EgovMap> selectOnlinePollItemList(OnlinePollItem onlinePollItem) throws Exception {
        return selectList("OnlinePollManage.selectOnlinePollItem", onlinePollItem);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? ?깅줉?쒕떎.
     * @param onlinePollItem  ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void insertOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
        insert("OnlinePollManage.insertOnlinePollItem", onlinePollItem);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? ?섏젙?쒕떎.
     * @param onlinePollItem  ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void updateOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
        update("OnlinePollManage.updateOnlinePollIteme", onlinePollItem);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? ??젣?쒕떎.
     * @param onlinePollItem  ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void deleteOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
        //?⑤씪?퇠OLL 寃곌낵 ??젣
        delete("OnlinePollManage.deleteOnlinePollResultIemid", onlinePollItem);
        //?⑤씪?퇠OLL ??ぉ ??젣
        delete("OnlinePollManage.deleteOnlinePollItem", onlinePollItem);
    }
}
