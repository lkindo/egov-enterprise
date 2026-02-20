package egovframework.com.uss.olp.opp.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.opp.service.OnlinePollPartcptn;

/**
 * ?⑤씪?퇠OLL李몄뿬瑜?泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.10.27  ?쒖???         ?⑤씪??POLL 以묐났 ?ы몴 諛⑹? 湲곕뒫 異붽?
 *
 * </pre>
 */
@Repository("onlinePollPartcptnDao")
public class OnlinePollPartcptnDao extends EgovComAbstractDAO {

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? 紐⑸줉???쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectOnlinePollManageList(ComDefaultVO searchVO) throws Exception {
        return selectList("OnlinePollPartcptn.selectOnlinePollManageList", searchVO);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return int
     * @throws Exception
     */
    public int selectOnlinePollManageListCnt(ComDefaultVO searchVO) throws Exception {
        return (Integer)selectOne("OnlinePollPartcptn.selectOnlinePollManageListCnt", searchVO);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param onlinePollPartcptn  ?⑤씪?퇠OLL ?뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectOnlinePollManageDetail(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        return selectList("OnlinePollPartcptn.selectOnlinePollManageDetail", onlinePollPartcptn);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? ?곸꽭議고쉶 ?쒕떎.
     * @param onlinePollPartcptn  ?⑤씪?퇠OLL ?뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectOnlinePollItemDetail(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        return selectList("OnlinePollPartcptn.selectOnlinePollItem", onlinePollPartcptn);
    }


    /**
     * ?⑤씪?퇠OLL李몄뿬瑜??? ?깅줉?쒕떎.
     * @param qonlinePollPartcptn  ?⑤씪?퇠OLL ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void insertOnlinePollResult(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        insert("OnlinePollPartcptn.insertOnlinePollResult", onlinePollPartcptn);
    }

    /**
     * ?⑤씪?퇠OLL?듦퀎瑜??? ?깅줉?쒕떎.
     * @param qonlinePollPartcptn  ?⑤씪?퇠OLL ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public List<EgovMap> selectOnlinePollManageStatistics(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        return selectList("OnlinePollPartcptn.selectOnlinePollPartcptnStatistics", onlinePollPartcptn);
    }

    /**
     * ?⑤씪?퇠OLL李몄뿬 ?щ?瑜?議고쉶?쒕떎.
     * @param onlinePollPartcptn ?뚯젙?뺣낫媛 ?닿? VO
     * @return int
     * @throws Exception
     */
    public int selectOnlinePollResult( OnlinePollPartcptn onlinePollPartcptn) throws Exception{
    	return (Integer)selectOne("OnlinePollPartcptn.selectOnlinePollResult", onlinePollPartcptn);
    }



}
