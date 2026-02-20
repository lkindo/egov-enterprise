package egovframework.com.uss.ion.tir.service.impl;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import jakarta.annotation.Resource;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.tir.service.EgovTwitterTrnsmitService;
import twitter4j.BooleanResponse;
import twitter4j.CreateTweetResponse;
import twitter4j.Twitter;
import twitter4j.TwitterFactory;
import twitter4j.TwitterV2;
import twitter4j.TwitterV2ExKt;
import twitter4j.UsersResponse;
import twitter4j.auth.AccessToken;
//import twitter4j.conf.Configuration;
//import twitter4j.conf.ConfigurationBuilder;
/**
 * ?몄쐞?곗닔?좎쓣 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *   2024.10.29	LeeBaekHaeng	誘몄궗??import ?뺣━
 *
 * </pre>
 */
@Service("egovTwitterTrnsmitService")
public class EgovTwitterTrnsmitServiceImpl extends EgovAbstractServiceImpl
        implements EgovTwitterTrnsmitService {

	/* ?몄쐞??DAO */
    @Resource(name = "twitterDao")
    private EgovTwitterDao dao;

    /**
	 * ?몄쐞?곕? ?≪떊?섎떎.
	 * @param sTwitterId 	-?몄쐞???꾩씠??
	 * @param sTwitterPw 	-?몄쐞??鍮꾨?踰덊샇
	 * @param sTwitterText 	-?몄쐞???깅줉 硫붿꽭吏
	 */
	@Override
	public CreateTweetResponse twitterTrnsmitRegist(Map<?, ?> map, String sTwitterText) throws Exception{

		String sCONSUMER_KEY = (String)map.get("sCONSUMER_KEY");
		String sCONSUMER_SECRET = (String)map.get("sCONSUMER_SECRET");
		//?몄쐞??媛앹껜?좎뼵
		Twitter twitter = new TwitterFactory().getInstance();
		//CONSUMER KEY, CONSUMER SECRET ?ㅼ젙
		twitter.setOAuthConsumer(sCONSUMER_KEY, sCONSUMER_SECRET);
    	//?묒꽌???좏겙 ???ㅼ젙
    	AccessToken accessToken = new AccessToken((String)map.get("atoken"), (String)map.get("astoken"));
    	//?묒꽌???좏겙 ?ㅼ젙
    	twitter.setOAuthAccessToken(accessToken);
    	
        //?몄쐞?? 湲 寃뚯떆
    	final TwitterV2 v2 = TwitterV2ExKt.getV2(twitter);
    	final CreateTweetResponse tweets = v2.createTweet(null, null, null, null, null, null, null, null, null, null, null, sTwitterText);
    	
        return tweets;

	}
	
	/**
	 * ?몄쐞??怨꾩젙 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param map - ?몄쬆 ?뺣낫媛 ?닿릿 Map
	 */
	@Override
	public Map<?, ?> twitterUserAccount(Map<?, ?> map) throws Exception {
		
		// ?좎??뺣낫
		String sCONSUMER_KEY = (String)map.get("sCONSUMER_KEY");
		String sCONSUMER_SECRET = (String)map.get("sCONSUMER_SECRET");
		//?몄쐞??媛앹껜?좎뼵
		Twitter twitter = new TwitterFactory().getInstance();
		//CONSUMER KEY, CONSUMER SECRET ?ㅼ젙
		twitter.setOAuthConsumer(sCONSUMER_KEY, sCONSUMER_SECRET);
    	//?묒꽌???좏겙 ???ㅼ젙
    	AccessToken accessToken = new AccessToken((String)map.get("atoken"), (String)map.get("astoken"));
    	//?묒꽌???좏겙 ?ㅼ젙
    	twitter.setOAuthAccessToken(accessToken);
    	
    	final TwitterV2 v2 = TwitterV2ExKt.getV2(twitter);
    	
    	final UsersResponse users = v2.getMe("pinned_tweet_id", "author_id", "created_at,profile_image_url");
    	
    	Long userId = users.getUsers().get(0).getId();
    	String userName = users.getUsers().get(0).getName();
    	String userScreenName = users.getUsers().get(0).getScreenName();
    	Date userCreate_at = users.getUsers().get(0).getCreatedAt();
    	String userProfile_url = users.getUsers().get(0).getProfileImageUrl();
    	
    	Map<String, Object> userResult = new HashMap<String, Object>();
    	userResult.put("userId", userId);
    	userResult.put("userName", userName);
    	userResult.put("userScreenName", userScreenName);
    	userResult.put("userCreate_At", userCreate_at);
    	userResult.put("userProfile_url", userProfile_url);
    	
		return userResult;
	}

	/**
	 * ?몄쐵 ?댁슜??젣
	 * 
	 */
	@Override
	public boolean twitterDelete(Map<?, ?> map, String tID) throws Exception {

				String sCONSUMER_KEY = (String)map.get("sCONSUMER_KEY");
				String sCONSUMER_SECRET = (String)map.get("sCONSUMER_SECRET");
				//?몄쐞??媛앹껜?좎뼵
				Twitter twitter = new TwitterFactory().getInstance();
				//CONSUMER KEY, CONSUMER SECRET ?ㅼ젙
				twitter.setOAuthConsumer(sCONSUMER_KEY, sCONSUMER_SECRET);
		    	//?묒꽌???좏겙 ???ㅼ젙
		    	AccessToken accessToken = new AccessToken((String)map.get("atoken"), (String)map.get("astoken"));
		    	//?묒꽌???좏겙 ?ㅼ젙
		    	twitter.setOAuthAccessToken(accessToken);
		    	
		    	final TwitterV2 v2 = TwitterV2ExKt.getV2(twitter);
		    	final BooleanResponse deleteResult = v2.deleteTweet(Long.parseLong(tID));

		    	return deleteResult.getResult();
		
	}

    /**
     * ?몄쐞??怨꾩젙??嫄댁닔瑜?議고쉶 ?쒕떎.
     * @param param -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return Map - 議고쉶 ?뺣낫媛 ?닿릿 Map
     * @throws Exception
     */
    @Override
	public Map<?, ?> selectTwitterAccount(Map<?, ?> param) throws Exception {
    	return dao.selectTwitterAccount(param);
    }

    /**
     * ?몄쐞??怨꾩젙??嫄댁닔瑜?議고쉶 ?쒕떎.
     * @param param -議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int - 議고쉶 ?뺣낫媛 ?닿릿 Integer
     * @throws Exception
     */
    @Override
	public int selectTwitterAccountCheck(Map<?, ?> param) throws Exception {
    	return dao.selectTwitterAccountCheck(param);
    }

	/**
	 * ?몄쐞??怨꾩젙???좉퇋濡??깅줉?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	@Override
	public void insertTwitterAccount(Map<?, ?> param) throws Exception {
		dao.insertTwitterAccount(param);
	}

	/**
	 * ?몄쐞??怨꾩젙???섏젙?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	@Override
	public void updtTwitterAccount(Map<?, ?> param) throws Exception {
		dao.updtTwitterAccount(param);
	}

	/**
	 * ?몄쐞??怨꾩젙????젣?쒕떎.
	 * @param param - 議고쉶???뺣낫媛 ?닿릿 Map
	 */
	@Override
	public void deleteTwitterAccount(Map<?, ?> param) throws Exception {
        dao.deleteTwitterAccount(param);
	}

}
