package egovframework.com.uss.ion.rsn.service.impl;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.rsn.service.RssInfo;
/**
 * RSS?쒕퉬?ㅻ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
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
@Repository("rssInfoDao")
public class RssDao extends EgovComAbstractDAO {

    /**
     * RSS?쒕퉬???뚯씠釉붿쓣 議고쉶 ?쒕떎.
     * @param param -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List -議고쉶?쒕ぉ濡앹씠?닿릿List
     * @throws Exception
     */
    public List<?> selectRssTagServiceTable(Map<?, ?> param) throws Exception {
    	return selectList("RssTagService.selectRssTagServiceTable",param);
    }

    /**
     * RSS?쒕퉬?ㅻ?(?? 紐⑸줉???쒕떎.
     * @param rssInfo -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List
     * @throws Exception
     */
    public List<?> selectRssTagServiceList(RssInfo rssInfo) throws Exception {
    	return selectList("RssTagService.selectRssTagService",rssInfo);
    }

    /**
     * RSS?쒕퉬?ㅻ?(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param rssInfo -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int -議고쉶?쒓굔?섍??닿릿Integer
     * @throws Exception
     */
    public int selectRssTagServiceListCnt(RssInfo rssInfo) throws Exception {
    	return (Integer)selectOne("RssTagService.selectRssTagServiceCnt", rssInfo);
    }

    /**
     * RSS?쒕퉬?ㅻ?(?? ?곸꽭議고쉶 ?쒕떎.
     * @param rssInfo -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return Map -議고쉶?쒖젙蹂닿??닿릿Map
     * @throws Exception
     */
    public Map<?, ?> selectRssTagServiceDetail(RssInfo rssInfo) throws Exception {
    	return (Map<?, ?>)selectOne("RssTagService.selectRssTagServiceDetail", rssInfo);
    }



}
