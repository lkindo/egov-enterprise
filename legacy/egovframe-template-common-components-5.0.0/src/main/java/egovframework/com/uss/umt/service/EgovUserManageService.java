package egovframework.com.uss.umt.service;
import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 * ?ъ슜?먭?由ъ뿉 愿???명꽣?섏씠?ㅽ겢?섏뒪瑜??뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? 議곗옱??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  議곗옱??         理쒖큹 ?앹꽦
 *   2017.07.21  ?λ룞??			濡쒓렇?몄씤利앹젣???묒뾽
 *
 * </pre>
 */
public interface EgovUserManageService  {

	/**
	 * ?낅젰???ъ슜?먯븘?대뵒??以묐났?щ?瑜?泥댄겕?섏뿬 ?ъ슜媛?μ뿬遺瑜??뺤씤
	 * @param checkId 以묐났?щ? ?뺤씤????꾩씠??
	 * @return ?ъ슜媛?μ뿬遺(?꾩씠???ъ슜?뚯닔 int)
	 * @throws Exception
	 */
	public int checkIdDplct(String checkId) throws Exception;

	/**
	 * ?붾㈃??議고쉶???ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param checkedIdForDel ??젣????낅Т?ъ슜?먯븘?대뵒
	 * @throws Exception
	 */
	public void deleteUser(String checkedIdForDel) throws Exception;

	/**
	 * @param userManageVO ?낅Т?ъ슜???깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	public String insertUser(UserManageVO userManageVO) throws Exception;

	/**
	 * 湲??깅줉???ъ슜??以?寃?됱“嫄댁뿉 留욌뒗 ?ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param emplyrId ?곸꽭議고쉶????낅Т?ъ슜???꾩씠??
	 * @return userManageVO ?낅Т?ъ슜???곸꽭?뺣낫
	 * @throws Exception
	 */
	public UserManageVO selectUser(String emplyrId) throws Exception;

	/**
	 * 湲??깅줉???뱀젙 ?ъ슜?먯쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param userSearchVO 寃?됱“嫄?
	 * @return List<UserManageVO> ?낅Т?ъ슜??紐⑸줉?뺣낫
	 * @throws Exception
	 */
	public List<EgovMap> selectUserList(UserDefaultVO userSearchVO) throws Exception;

	/**
	 * 湲??깅줉???뱀젙 ?ъ슜?먮ぉ濡앹쓽 ?꾩껜?섎? ?뺤씤
	 * @param userSearchVO 寃?됱“嫄?
	 * @return 珥앹궗?⑹옄媛쒖닔(int)
	 * @throws Exception
	 */
	public int selectUserListTotCnt(UserDefaultVO userSearchVO) throws Exception;

	/**
	 * ?붾㈃??議고쉶???ъ슜?먯쓽 湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫
	 * @throws Exception
	 */
	public void updateUser(UserManageVO userManageVO) throws Exception;

	/**
	 * ?ъ슜?먯젙蹂??섏젙???덉뒪?좊━ ?뺣낫瑜?異붽?
	 * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	public String insertUserHistory(UserManageVO userManageVO) throws Exception;

	/**
	 * ?낅Т?ъ슜???뷀샇 ?섏젙
	 * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫(鍮꾨?踰덊샇)
	 * @throws Exception
	 */
	public void updatePassword(UserManageVO userManageVO) throws Exception;

	/**
	 * ?ъ슜?먭? 鍮꾨?踰덊샇瑜?湲곗뼲?섏? 紐삵븷 ??鍮꾨?踰덊샇瑜?李얠쓣 ???덈룄濡???
	 * @param passVO ?낅Т?ъ슜???뷀샇 議고쉶議곌굔?뺣낫
	 * @return userManageVO ?낅Т?ъ슜???뷀샇?뺣낫
	 * @throws Exception
	 */
	public UserManageVO selectPassword(UserManageVO passVO) throws Exception;
	

	/**
	 * 濡쒓렇?몄씤利앹젣???댁젣 
	 * @param userManageVO ?낅Т?ъ슜???섏젙?뺣낫
	 * @return void
	 * @throws Exception
	 */
	public void updateLockIncorrect(UserManageVO userManageVO) throws Exception;


}