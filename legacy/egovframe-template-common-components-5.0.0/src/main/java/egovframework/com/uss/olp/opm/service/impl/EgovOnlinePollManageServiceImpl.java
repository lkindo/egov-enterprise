package egovframework.com.uss.olp.opm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.opm.service.EgovOnlinePollManageService;
import egovframework.com.uss.olp.opm.service.OnlinePollItem;
import egovframework.com.uss.olp.opm.service.OnlinePollManage;
import jakarta.annotation.Resource;

/**
 * ?⑤씪?퇠OLL愿由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
@Service("egovOnlinePollManageService")
public class EgovOnlinePollManageServiceImpl extends EgovAbstractServiceImpl
        implements EgovOnlinePollManageService {


    @Resource(name = "onlinePollManageDao")
    private OnlinePollManageDao dao;

    @Resource(name = "egovOnlinePollManageIdGnrService")
    private EgovIdGnrService idgenService;

    @Resource(name = "egovOnlinePollItemIdGnrService")
    private EgovIdGnrService idgenOnlinePollItemService;

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? 紐⑸줉??議고쉶 ?쒕떎.
     * @param OnlinePoll ?뚯젙?뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public List<EgovMap> selectOnlinePollManageList(ComDefaultVO searchVO) throws Exception {
        return dao.selectOnlinePollManageList(searchVO);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 VO
     * @return int
     * @throws Exception
     */
    @Override
	public int selectOnlinePollManageListCnt(ComDefaultVO searchVO) throws Exception {
        return dao.selectOnlinePollManageListCnt(searchVO);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @return List
     * @throws Exception
     */
    @Override
	public OnlinePollManage selectOnlinePollManageDetail( OnlinePollManage onlinePollManage) throws Exception {
        return dao.selectOnlinePollManageDetail(onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?깅줉?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void insertOnlinePollManage(OnlinePollManage onlinePollManage)throws Exception {
        String sMakeId = idgenService.getNextStringId();
        onlinePollManage.setPollId(sMakeId);
        dao.insertOnlinePollManage(onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?섏젙?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void updateOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception {
        dao.updateOnlinePollManage(onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ??젣?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void deleteOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception {
        dao.deleteOnlinePollManage(onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL愿由щ?(?? ?듦퀎瑜?議고쉶 ?쒕떎.
     * @param onlinePollManage ?⑤씪?퇠OLL愿由??뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public List<OnlinePollManage> selectOnlinePollManageStatistics(OnlinePollManage onlinePollManage) throws Exception {
        return dao.selectOnlinePollManageStatistics(onlinePollManage);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? 議고쉶?쒕떎.
     * @param onlinePollItem  ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public List<EgovMap> selectOnlinePollItemList(OnlinePollItem onlinePollItem) throws Exception {
        return dao.selectOnlinePollItemList(onlinePollItem);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? ?깅줉?쒕떎.
     * @param onlinePollItem  ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void insertOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
        String sMakeId = idgenOnlinePollItemService.getNextStringId();
        onlinePollItem.setPollIemId(sMakeId);
        dao.insertOnlinePollItem(onlinePollItem);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? ?섏젙?쒕떎.
     * @param onlinePollItem  ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void updateOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
        dao.updateOnlinePollItem(onlinePollItem);
    }

    /**
     * ?⑤씪?퇠OLL??ぉ瑜??? ??젣?쒕떎.
     * @param onlinePollItem  ?⑤씪?퇠OLL??ぉ ?뺣낫媛 ?닿? VO
     * @throws Exception
     */
    @Override
	public void deleteOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
        dao.deleteOnlinePollItem(onlinePollItem);
    }
}
