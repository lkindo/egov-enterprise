package egovframework.com.uss.ion.rss.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.rss.service.EgovRssTagManageService;
import egovframework.com.uss.ion.rss.service.RssManage;
import jakarta.annotation.Resource;
/**
 * RSS?쒓렇愿由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
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
@Service("egovRssManageService")
public class EgovRssTagManageServiceImpl extends EgovAbstractServiceImpl
        implements EgovRssTagManageService {

	/* RSS愿由?DAO */
    @Resource(name = "rssManageDao")
    private RssTagManageDao dao;

    /* RSS ID Generator Service */
    @Resource(name = "egovRssTagManageIdGnrService")
    private EgovIdGnrService idgenService;

    /**
     * JDBC ?뚯씠釉?紐⑸줉?꾩“?뚰븳??
     * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
     * @throws Exception
     */
    @Override
	public List<?> selectRssTagManageTableList() throws Exception {
    	return dao.selectRssTagManageTableList();
    }
    /**
     * JDBC ?뚯씠釉?而щ읆 紐⑸줉??議고쉶?쒕떎.
     * @param map - 而щ읆議고쉶?뺣낫
     * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
     * @throws Exception
     */
    @SuppressWarnings({ "unchecked", "rawtypes" })
	@Override
	public List<?> selectRssTagManageTableColumnList(Map map) throws Exception {
    	return dao.selectRssTagManageTableColumnList(map);
    }
    /**
     * RSS?쒓렇愿由щ?(?? 紐⑸줉??議고쉶 ?쒕떎.
     * @param rssManage -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
     * @throws Exception
     */
    @Override
	public List<?> selectRssTagManageList(RssManage rssManage) throws Exception {
    	return dao.selectRssTagManageList(rssManage);
    }

    /**
     * RSS?쒓렇愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    @Override
	public int selectRssTagManageListCnt(RssManage rssManage) throws Exception {
        return dao.selectRssTagManageListCnt(rssManage);
    }

    /**
     * RSS?쒓렇愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param searchVO -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
     * @throws Exception
     */
    @Override
	public RssManage selectRssTagManageDetail(RssManage rssManage) throws Exception {
        return dao.selectRssTagManageDetail(rssManage);
    }

    /**
     * RSS?쒓렇愿由щ?(?? ?깅줉?쒕떎.
     * @param rssManage -RSS?쒓렇愿由??뺣낫媛 ?닿릿 媛앹껜
     * @throws Exception
     */
    @Override
	public void insertRssTagManage(RssManage rssManage)throws Exception {

    	rssManage.setRssId(idgenService.getNextStringId());

    	dao.insertRssTagManage(rssManage);
    }

    /**
     * RSS?쒓렇愿由щ?(?? ?섏젙?쒕떎.
     * @param rssManage -RSS?쒓렇愿由??뺣낫媛 ?닿릿 媛앹껜
     * @throws Exception
     */
    @Override
	public void updateRssTagManage(RssManage rssManage) throws Exception {
    	dao.updateRssTagManage(rssManage);
    }

    /**
     * RSS?쒓렇愿由щ?(?? ??젣?쒕떎.
     * @param rssManage -RSS?쒓렇愿由??뺣낫媛 ?닿릿 媛앹껜
     * @throws Exception
     */
    @Override
	public void deleteRssTagManage(RssManage rssManage) throws Exception {
    	dao.deleteRssTagManage(rssManage);
    }

}
