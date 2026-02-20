package egovframework.com.uss.olp.opr.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.olp.opr.service.OnlinePollResult;

/**
 * ?⑤씪?퇠OLL寃곌낵瑜?泥섎━?섎뒗 Dao Class 援ы쁽
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
@Repository("onlinePollResultDao")
public class OnlinePollResultDao extends EgovComAbstractDAO {

    /**
     * ?⑤씪?퇠OLL寃곌낵瑜??? 紐⑸줉???쒕떎.
     * @param onlinePollResult  ?⑤씪?퇠OLL寃곌낵 ?뺣낫 ?닿? VO
     * @return List
     * @throws Exception
     */
    public List<?> selectOnlinePollResultList(OnlinePollResult onlinePollResult) throws Exception {
        return selectList("OnlinePollResult.selectOnlinePollResult", onlinePollResult);
    }

    /**
     * ?⑤씪?퇠OLL寃곌낵瑜??? ??젣 ?쒕떎.
     * @param onlinePollResult  ?⑤씪?퇠OLL寃곌낵 ?뺣낫媛 ?닿? VO
     * @return void
     * @throws Exception
     */
    public void deleteOnlinePollResult(OnlinePollResult onlinePollResult) throws Exception {
        delete("OnlinePollResult.deleteOnlinePollResult", onlinePollResult);
    }


}
