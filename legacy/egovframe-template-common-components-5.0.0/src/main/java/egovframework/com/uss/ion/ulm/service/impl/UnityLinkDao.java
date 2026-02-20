package egovframework.com.uss.ion.ulm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.ulm.service.UnityLink;

/**
 * ?듯빀留곹겕愿由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
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
@Repository("onlineUnityLinkDao")
public class UnityLinkDao extends EgovComAbstractDAO {

    /**
     * ?듯빀留곹겕愿由?硫붿씤 ?덊뵆 紐⑸줉??議고쉶?쒕떎.
     * @param popupManageVO - ?앹뾽李?Vo
     * @return List - ?앹뾽李?紐⑸줉
     *
     * @param popupManageVO
     */
    public List<?> selectUnityLinkSample(UnityLink unityLink) throws Exception {
        return selectList("UnityLink.selectUnityLinkSample", unityLink);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? 紐⑸줉???쒕떎.
     * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
     * @return List
     * @throws Exception
     */
    public List<?> selectUnityLinkList(ComDefaultVO searchVO) throws Exception {
        return selectList("UnityLink.selectUnityLink", searchVO);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return int
     * @throws Exception
     */
    public int selectUnityLinkListCnt(ComDefaultVO searchVO) throws Exception {
        return (Integer)selectOne("UnityLink.selectUnityLinkCnt", searchVO);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param unityLink  ?듯빀留곹겕愿由??뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    public UnityLink selectUnityLinkDetail(UnityLink unityLink) throws Exception {
        return (UnityLink)selectOne("UnityLink.selectUnityLinkDetail", unityLink);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? ?깅줉?쒕떎.
     * @param unityLink  ?듯빀留곹겕愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void insertUnityLink(UnityLink unityLink) throws Exception {
        insert("UnityLink.insertUnityLink", unityLink);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? ?섏젙?쒕떎.
     * @param unityLink  ?듯빀留곹겕愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void updateUnityLink(UnityLink unityLink) throws Exception {
        update("UnityLink.updateUnityLink", unityLink);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? ??젣?쒕떎.
     * @param unityLink  ?듯빀留곹겕愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    public void deleteUnityLink(UnityLink unityLink) throws Exception {
        delete("UnityLink.deleteUnityLink", unityLink);
    }

}
