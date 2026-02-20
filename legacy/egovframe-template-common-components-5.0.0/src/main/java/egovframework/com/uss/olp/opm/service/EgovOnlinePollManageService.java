package egovframework.com.uss.olp.opm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?⑤씪?퇠OLL愿由щ? 泥섎━?섎뒗 Service Class 援ы쁽
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
public interface EgovOnlinePollManageService {


    /**
    * ?⑤씪?퇠OLL愿由?紐⑸줉??議고쉶?쒕떎.
    * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
    * @return List
    * @throws Exception
    */
    public List<EgovMap> selectOnlinePollManageList(ComDefaultVO searchVO) throws Exception;

    /**
    * ?⑤씪?퇠OLL愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
    * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫 ?닿? VO
    * @return List
    * @throws Exception
    */
    public OnlinePollManage selectOnlinePollManageDetail(OnlinePollManage onlinePollManage) throws Exception;

    /**
    * ?⑤씪?퇠OLL愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
    * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
    * @return int
    * @throws Exception
    */
    public int selectOnlinePollManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
    * ?⑤씪?퇠OLL愿由щ?(?? ?깅줉?쒕떎.
    * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫 ?닿? VO
    * @throws Exception
    */
    void  insertOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception;

    /**
    * ?⑤씪?퇠OLL愿由щ?(?? ?섏젙?쒕떎.
    * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫 ?닿? VO
    * @throws Exception
    */
    void  updateOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception;

    /**
    * ?⑤씪?퇠OLL愿由щ?(?? ??젣?쒕떎.
    * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫 ?닿? VO
    * @throws Exception
    */
    void  deleteOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception;

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?듦퀎瑜?議고쉶 ?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫 ?닿? VO
     * @throws Exception
     */
    public List<?> selectOnlinePollManageStatistics(OnlinePollManage onlinePollManage) throws Exception;

    /**
    * ?⑤씪?퇠OLL??ぉ瑜??? 議고쉶?쒕떎.
    * @param onlinePollItem ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
    * @throws Exception
    */
    public List<EgovMap> selectOnlinePollItemList(OnlinePollItem onlinePollItem) throws Exception;

    /**
    * ?⑤씪?퇠OLL??ぉ瑜??? ?깅줉?쒕떎.
    * @param onlinePollItem ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
    * @throws Exception
    */
    public void insertOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception;

    /**
    * ?⑤씪?퇠OLL??ぉ瑜??? ?섏젙?쒕떎.
    * @param onlinePollItem ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
    * @throws Exception
    */
    public void updateOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception;


    /**
    * ?⑤씪?퇠OLL??ぉ瑜??? ??젣?쒕떎.
    * @param onlinePollItem ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
    * @throws Exception
    */
    public void deleteOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception;
}
