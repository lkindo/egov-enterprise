package egovframework.com.uss.ion.rss.service;

import java.util.List;
import java.util.Map;
/**
 * RSS?쒓렇愿由щ? 泥섎━?섎뒗 Service Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
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
public interface EgovRssTagManageService {

    /**
     * JDBC ?뚯씠釉?紐⑸줉?꾩“?뚰븳??
     * @return List
     * @throws Exception
     */
    public List<?> selectRssTagManageTableList() throws Exception;

    /**
     * JDBC ?뚯씠釉?而щ읆 紐⑸줉??議고쉶?쒕떎.
     * @param map - 而щ읆議고쉶?뺣낫
     * @return List
     * @throws Exception
     */
    public List<?> selectRssTagManageTableColumnList(Map<?, ?> map) throws Exception;

    /**
	 * RSS?쒓렇愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param rssManage -議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public List<?> selectRssTagManageList(RssManage rssManage) throws Exception;

    /**
     * RSS?쒓렇愿由щ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param rssManage  -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public int selectRssTagManageListCnt(RssManage rssManage) throws Exception;

     /**
	 * RSS?쒓렇愿由щ?(?? ?곸꽭議고쉶 ?쒕떎.
	 * @param rssManage -RSS?쒓렇愿由??뺣낫 ?닿? 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	public RssManage selectRssTagManageDetail(RssManage rssManage) throws Exception;

     /**
	 * RSS?쒓렇愿由щ?(?? ?깅줉?쒕떎.
	 * @param rssManage -RSS?쒓렇愿由??뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void  insertRssTagManage(RssManage rssManage) throws Exception;

     /**
	 * RSS?쒓렇愿由щ?(?? ?섏젙?쒕떎.
	 * @param rssManage -RSS?쒓렇愿由??뺣낫 ?닿? 媛앹껜
	 * @throws Exception
	 */
	void  updateRssTagManage(RssManage rssManage) throws Exception;

	/**
	 * RSS?쒓렇愿由щ?(?? ??젣?쒕떎.
	 * @param rssManage -RSS?쒓렇愿由??뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  deleteRssTagManage(RssManage rssManage) throws Exception;

}
