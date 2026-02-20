package egovframework.com.uss.ion.tir.service;

import java.util.Map;

import twitter4j.CreateTweetResponse;
/**
 * ?몄쐞?곗넚?좎쓣 泥섎━?섎뒗 Service Class 援ы쁽
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
 *   2024.10.29	LeeBaekHaeng	誘몄궗??import ?뺣━
 *
 * </pre>
 */
public interface EgovTwitterTrnsmitService {


    /**
	 * ?몄쐞?곕? ?≪떊?섎떎.
	 * @param sTwitterId 	-?몄쐞???꾩씠??
	 * @param sTwitterPw 	-?몄쐞??鍮꾨?踰덊샇
	 * @param sTwitterText 	-?몄쐞???깅줉 硫붿꽭吏
	 */
	public CreateTweetResponse twitterTrnsmitRegist(Map<?, ?> map, String sTwitterText) throws Exception;

    /**
     * ?몄쐞??怨꾩젙??嫄댁닔瑜?議고쉶 ?쒕떎.
     * @param param -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return Map - 議고쉶 ?뺣낫媛 ?닿릿 Map
     * @throws Exception
     */
    public Map<?, ?> selectTwitterAccount(Map<?, ?> param) throws Exception;

	/**
     * ?몄쐞??怨꾩젙??嫄댁닔瑜?議고쉶 ?쒕떎.
     * @param param -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int - 議고쉶 ?뺣낫媛 ?닿릿 Integer
     * @throws Exception
     */
    public int selectTwitterAccountCheck(Map<?, ?> param) throws Exception;

	/**
	 * ?몄쐞??怨꾩젙???좉퇋濡??깅줉?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	public void insertTwitterAccount(Map<?, ?> param) throws Exception;

	/**
	 * ?몄쐞??怨꾩젙???섏젙?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	public void updtTwitterAccount(Map<?, ?> param) throws Exception;

	/**
	 * ?몄쐞??怨꾩젙????젣?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	public void deleteTwitterAccount(Map<?, ?> param) throws Exception;
	
	/**
	 * ?몄쐞??怨꾩젙??議고쉶?쒕떎.
	 * @param map - ?몄쬆 ?뺣낫媛 ?닿릿 Map
	 * 	 */
	public Map<?, ?> twitterUserAccount(Map<?, ?> map) throws Exception;
	
	/**
	 *	?꾩넚???몄쐵????젣?쒕떎. 
	 * @param map - ?몄쬆 ?뺣낫媛 ?닿릿 Map
	 **/
	public boolean twitterDelete(Map<?, ?> map, String tID) throws Exception;

}
