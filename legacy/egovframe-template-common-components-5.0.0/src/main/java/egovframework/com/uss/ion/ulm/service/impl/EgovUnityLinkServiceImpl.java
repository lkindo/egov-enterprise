package egovframework.com.uss.ion.ulm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.ion.ulm.service.EgovUnityLinkService;
import egovframework.com.uss.ion.ulm.service.UnityLink;
import jakarta.annotation.Resource;

/**
 * ?듯빀留곹겕愿由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
@Service("egovUnityLinkService")
public class EgovUnityLinkServiceImpl extends EgovAbstractServiceImpl
        implements EgovUnityLinkService {

    @Resource(name = "onlineUnityLinkDao")
    private UnityLinkDao dao;

    @Resource(name = "egovUnityLinkIdGnrService")
    private EgovIdGnrService idgenService;

    /**
     *?듯빀留곹겕愿由?硫붿씤 ?덊뵆 紐⑸줉??議고쉶?쒕떎.
     * @param unityLink  ?듯빀留곹겕愿由??뺣낫 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public List<?> selectUnityLinkSample(UnityLink unityLink) throws Exception {
        return dao.selectUnityLinkSample(unityLink);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? 紐⑸줉??議고쉶 ?쒕떎.
     * @param searchVO 議고쉶???뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public List<?> selectUnityLinkList(ComDefaultVO searchVO) throws Exception {
        return dao.selectUnityLinkList(searchVO);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return int
     * @throws Exception
     */
    @Override
	public int selectUnityLinkListCnt(ComDefaultVO searchVO) throws Exception {
        return dao.selectUnityLinkListCnt(searchVO);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param unityLink 議고쉶???뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public UnityLink selectUnityLinkDetail(UnityLink unityLink) throws Exception {
        return dao.selectUnityLinkDetail(unityLink);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? ?깅줉?쒕떎.
     * @param unityLink 議고쉶???뺣낫媛 ?닿릿 VO
     * @throws Exception
     */
    @Override
	public void insertUnityLink(UnityLink unityLink)throws Exception {
        String sMakeId = idgenService.getNextStringId();
        unityLink.setUnityLinkId(sMakeId);
        dao.insertUnityLink(unityLink);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? ?섏젙?쒕떎.
     * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
     * @throws Exception
     */
    @Override
	public void updateUnityLink(UnityLink unityLink) throws Exception {
        dao.updateUnityLink(unityLink);
    }

    /**
     * ?듯빀留곹겕愿由щ?(?? ??젣?쒕떎.
     * @param searchVO 議고쉶???뺣낫媛 ?닿릿 VO
     * @throws Exception
     */
    @Override
	public void deleteUnityLink(UnityLink unityLink) throws Exception {
        dao.deleteUnityLink(unityLink);
    }

}
