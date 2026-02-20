package egovframework.com.cop.smt.lsm.service;

import java.util.List;
import java.util.Map;

/**
 * 媛쒖슂
 * - 媛꾨??쇱젙?????Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 媛꾨??쇱젙??????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 媛꾨??쇱젙??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:05
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public interface EgovLeaderSchdulService {
	
	/**
	 * ?ъ슜??紐⑸줉??議고쉶?쒕떎.
	 * @param EmplyrVO
	 * @return  Map<String, Object>
	 * 
	 * @param emplyrVO
	 */
	public Map<String, Object> selectEmplyrList(EmplyrVO emplyrVO) throws Exception;
	
	/**
	 * ?붾퀎 媛꾨??쇱젙 紐⑸줉??議고쉶?쒕떎.
	 * @param LeaderSchdulVO
	 * @return  List
	 * 
	 * @param leaderSchdulVo
	 */
	public List<LeaderSchdulVO> selectLeaderSchdulList(LeaderSchdulVO leaderSchdulVo) throws Exception;

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param LeaderSchdulVO
	 * @return  LeaderSchdulVO
	 * 
	 * @param leaderSchdulVO
	 */
	public LeaderSchdulVO selectLeaderSchdul(LeaderSchdulVO leaderSchdulVO) throws Exception;

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??섏젙?쒕떎.
	 * @param LeaderSchdul
	 * 
	 * @param leaderSchdul
	 */
	public void updateLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜??깅줉?쒕떎.
	 * @param LeaderSchdul
	 * 
	 * @param leaderSchdul
	 */
	public void insertLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;

	/**
	 * 媛꾨??쇱젙 ?뺣낫瑜???젣?쒕떎.
	 * @param LeaderSchdul
	 * 
	 * @param leaderSchdul
	 */
	public void deleteLeaderSchdul(LeaderSchdul leaderSchdul) throws Exception;
	
	/**
	 * 媛꾨??곹깭 紐⑸줉??議고쉶?쒕떎.
	 * @param LeaderSttusVO - 媛꾨??곹깭 VO
	 * @return  Map<String, Object>
	 * 
	 * @param leaderSttusVO
	 */
	public Map<String, Object> selectLeaderSttusList(LeaderSttusVO leaderSttusVO) throws Exception;
	
	/**
	 * 媛꾨??곹깭 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param LeaderSttusVO - 媛꾨??곹깭 VO
	 * @return  LeaderSttusVO
	 * 
	 * @param leaderSttusVO
	 */
	public LeaderSttusVO selectLeaderSttus(LeaderSttusVO leaderSttusVO) throws Exception;

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜??섏젙?쒕떎.
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	public void updateLeaderSttus(LeaderSttus leaderSttus) throws Exception;

	/**
	 * 媛꾨??곹깭 ?뺣낫瑜??깅줉?쒕떎.
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	public void insertLeaderSttus(LeaderSttus leaderSttus) throws Exception;
	
	/**
	 * 媛꾨??곹깭瑜??깅줉?섍린 ?꾪븳 以묐났 議고쉶瑜??섑뻾?쒕떎.
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * @return  int 
	 * 
	 * @param leaderSttus
	 */
	public int selectLeaderSttusCheck(LeaderSttus leaderSttus) throws Exception;
	
	/**
	 * 媛꾨??곹깭 ?뺣낫瑜???젣?쒕떎.
	 * @param LeaderSttus - 媛꾨??곹깭 model
	 * 
	 * @param leaderSttus
	 */
	public void deleteLeaderSttus(LeaderSttus leaderSttus) throws Exception;
}