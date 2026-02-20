package egovframework.com.uss.olp.opr.service;

import java.util.List;
/**
 * ?⑤씪?퇠OLL寃곌낵瑜?泥섎━?섎뒗 Service Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovOnlinePollResultService {


    /**
     * ?⑤씪?퇠OLL寃곌낵瑜??? 紐⑸줉???쒕떎.
     * @param onlinePollResult  ?⑤씪?퇠OLL寃곌낵 ?뺣낫 ?닿? VO
     * @return List
     * @throws Exception
     */
    public List<?> selectOnlinePollResultList(OnlinePollResult onlinePollResult) throws Exception ;

    /**
     * ?⑤씪?퇠OLL寃곌낵瑜??? ??젣 ?쒕떎.
     * @param onlinePollResult  ?⑤씪?퇠OLL寃곌낵 ?뺣낫媛 ?닿? VO
     * @return void
     * @throws Exception
     */
    public void deleteOnlinePollResult(OnlinePollResult onlinePollResult) throws Exception ;
}
