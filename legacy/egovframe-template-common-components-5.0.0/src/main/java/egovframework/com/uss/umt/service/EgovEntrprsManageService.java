package egovframework.com.uss.umt.service;

import java.util.List;

/**
 * 湲곗뾽?뚯썝愿由ъ뿉 愿???명꽣?섏씠?ㅽ겢?섏뒪瑜??뺤쓽?쒕떎.
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
public interface EgovEntrprsManageService {

	/**
	 * 湲곗뾽?뚯썝??湲곕낯?뺣낫瑜??붾㈃?먯꽌 ?낅젰?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?곗씠?곕쿋?댁뒪?????
	 * @param entrprsManageVO 湲곗뾽?뚯썝?깅줉?뺣낫
	 * @return result ?깅줉寃곌낵
	 * @throws Exception
	 */
	public String insertEntrprsmber(EntrprsManageVO entrprsManageVO) throws Exception;

	/**
	 * 湲??깅줉???ъ슜??以?寃?됱“嫄댁뿉 留욌뒗湲곗뾽?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param entrprsmberId 議고쉶???湲곗뾽?뚯썝?꾩씠??
	 * @return entrprsManageVO 湲곗뾽?뚯썝?뺣낫
	 * @throws Exception
	 */
	public EntrprsManageVO selectEntrprsmber(String entrprsmberId) throws Exception;

	/**
	 * ?붾㈃??議고쉶??湲곗뾽?뚯썝??湲곕낯?뺣낫瑜??섏젙?섏뿬 ??ぉ???뺥빀?깆쓣 泥댄겕?섍퀬 ?섏젙???곗씠?곕? ?곗씠?곕쿋?댁뒪??諛섏쁺
	 * @param entrprsManageVO 湲곗뾽?뚯썝?섏젙?뺣낫
	 * @throws Exception
	 */
	public void updateEntrprsmber(EntrprsManageVO entrprsManageVO) throws Exception;

	/**
	 * ?붾㈃??議고쉶??湲곗뾽?뚯썝???뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ??젣
	 * @param checkedIdForDel ??젣??곴린?낇쉶?먯븘?대뵒
	 * @throws Exception
	 */
	public void deleteEntrprsmber(String checkedIdForDel) throws Exception;

	/**
	 * 湲곗뾽?뚯썝???쎄??뺣낫 議고쉶
	 * @param stplatId 湲곗뾽?뚯썝?쎄??꾩씠??
	 * @return stplatList 湲곗뾽?뚯썝?쎄??뺣낫
	 * @throws Exception
	 */
	public List<StplatVO> selectStplat(String stplatId) throws Exception;

	/**
	 * 湲곗뾽?뚯썝?뷀샇?섏젙
	 * @param entrprsManageVO 湲곗뾽?뚯썝?섏젙?뺣낫(鍮꾨?踰덊샇)
	 * @throws Exception
	 */
	public void updatePassword(EntrprsManageVO entrprsManageVO) throws Exception;

	/**
	 * 湲곗뾽?뚯썝??鍮꾨?踰덊샇瑜?湲곗뼲?섏? 紐삵븷 ??鍮꾨?踰덊샇瑜?李얠쓣 ???덈룄濡???
	 * @param passVO 湲곗뾽?뚯썝?뷀샇 議고쉶議곌굔?뺣낫
	 * @return entrprsManageVO 湲곗뾽?뚯썝?뷀샇?뺣낫
	 * @throws Exception
	 */
	public EntrprsManageVO selectPassword(EntrprsManageVO passVO) throws Exception;

	/**
	 * 湲??깅줉?쒓린???뚯썝 以?寃?됱“嫄댁뿉 留욌뒗 ?뚯썝?ㅼ쓽 ?뺣낫瑜??곗씠?곕쿋?댁뒪?먯꽌 ?쎌뼱? ?붾㈃??異쒕젰
	 * @param userSearchVO 寃?됱“嫄?
	 * @return List<EntrprsManageVO> 湲곗뾽?뚯썝紐⑸줉?뺣낫
	 * @throws Exception
	 */
	public List<EntrprsManageVO> selectEntrprsMberList(UserDefaultVO userSearchVO) throws Exception;

    /**
     * 湲곗뾽?뚯썝 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param userSearchVO 寃?됱“嫄?
     * @return ?ъ슜??珥?媛쒖닔(int)
     * @throws Exception
     */
    public int selectEntrprsMberListTotCnt(UserDefaultVO userSearchVO) throws Exception;


    /**
     * 濡쒓렇?몄씤利앹젣???댁젣 
     * @param entrprsManageVO 湲곗뾽?뚯썝?뺣낫
     * @return void
     * @throws Exception
     */
    public void updateLockIncorrect(EntrprsManageVO entrprsManageVO) throws Exception;
}