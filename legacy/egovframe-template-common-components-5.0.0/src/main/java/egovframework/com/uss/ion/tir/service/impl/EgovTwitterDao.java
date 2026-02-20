package egovframework.com.uss.ion.tir.service.impl;

import java.util.Map;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
/**
 * RSS?쒓렇愿由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.10.04
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.10.04  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("twitterDao")
public class EgovTwitterDao extends EgovComAbstractDAO {

    /**
     * ?몄쐞??怨꾩젙??議고쉶 ?쒕떎.
     * @param param -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return Map - 議고쉶 ?뺣낫媛 ?닿릿 Map
     * @throws Exception
     */
    public Map<?, ?> selectTwitterAccount(Map<?, ?> param) throws Exception {
    	return (Map<?, ?>)selectOne("Twitter.selectTwitterAccount",param);
    }


    /**
     * ?몄쐞??怨꾩젙??嫄댁닔瑜?議고쉶 ?쒕떎.
     * @param param -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int - 議고쉶 ?뺣낫媛 ?닿릿 Integer
     * @throws Exception
     */
    public int selectTwitterAccountCheck(Map<?, ?> param) throws Exception {
    	return (Integer)selectOne("Twitter.selectTwitterAccountCheck",param);
    }

	/**
	 * ?몄쐞??怨꾩젙???좉퇋濡??깅줉?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	public void insertTwitterAccount(Map<?, ?> param) throws Exception {
		insert("Twitter.insertTwitterAccount", param);
	}

	/**
	 * ?몄쐞??怨꾩젙???섏젙?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	public void updtTwitterAccount(Map<?, ?> param) throws Exception {
		update("Twitter.updateTwitterAccount", param);
	}

	/**
	 * ?몄쐞??怨꾩젙????젣?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	public void deleteTwitterAccount(Map<?, ?> param) throws Exception {
        delete("Twitter.deleteTwitterAccount",param);
	}
}
