package egovframework.com.uss.ion.pwm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 * 媛쒖슂
 * - ?앹뾽李쎌뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?앹뾽李쎌뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?앹뾽李쎌쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶, ?앹뾽?ъ슜??蹂닿린濡?援щ텇?쒕떎.
 * @author ?댁갹??
 * @version 1.0
 * @created 05-8-2009 ?ㅽ썑 2:19:58
 */
public interface EgovPopupManageService {

	/**
	 * 湲??깅줉???앹뾽李쎌젙蹂대? ??젣?쒕떎.
	 * @param popupManage - ?앹뾽李?model
	 * @return boolean - 諛섏쁺?깃났 ?щ?
	 *
	 * @param popupManage
	 */
	public void deletePopup(PopupManageVO popupManageVO) throws Exception;

	/**
	 * ?앹뾽李쎌젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param popupManage - ?앹뾽李?model
	 * @return boolean - 諛섏쁺?깃났 ?щ?
	 *
	 * @param popupManage
	 */
	public void insertPopup(PopupManageVO popupManageVO) throws Exception;

	/**
	 * 湲??깅줉???앹뾽李쎌젙蹂대? ?섏젙?쒕떎.
	 * @param popupManage - ?앹뾽李?model
	 * @return boolean - 諛섏쁺?깃났 ?щ?
	 *
	 * @param popupManage
	 */
	public void updatePopup(PopupManageVO popupManageVO) throws Exception;

	/**
	 * ?앹뾽李쎌쓣 ?ъ슜???붾㈃?먯꽌 蹂쇱닔 ?덈뒗 ?뺣낫?ㅼ쓣 議고쉶?쒕떎.
	 * @param popupManageVO - ?앹뾽李?Vo
	 * @return popupManageVO - ?앹뾽李?Vo
	 *
	 * @param popupManageVO
	 */
	public PopupManageVO selectPopup(PopupManageVO popupManageVO) throws Exception;

	/**
	 * ?앹뾽李쎌쓽 痍⑥빟?먯쓣 愿由ы븯湲??꾪빐 ?깅줉???앹뾽李??붿씠?몃━?ㅽ듃瑜?議고쉶?쒕떎.
	 * @param popupManageVO - ?앹뾽李?Vo
	 * @return List - ?앹뾽李??붿씠?몃━?ㅽ듃 紐⑸줉
	 *
	 * @param popupManageVO
	 */
	public List<EgovMap> selectPopupWhiteList() throws Exception;
	
	/**
	 * ?앹뾽李쎈? 愿由ы븯湲??꾪빐 ?깅줉???앹뾽李쎈ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param popupManageVO - ?앹뾽李?Vo
	 * @return List - ?앹뾽李?紐⑸줉
	 *
	 * @param popupManageVO
	 */
	public List<EgovMap> selectPopupList(PopupManageVO popupManageVO) throws Exception;

	/**
	 * ?앹뾽李쎈? 愿由ы븯湲??꾪빐 ?깅줉???앹뾽李쎈ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param popupManageVO - ?앹뾽李?Vo
	 * @return List - ?앹뾽李?紐⑸줉
	 *
	 * @param popupManageVO
	 */
	public int selectPopupListCount(PopupManageVO popupManageVO) throws Exception;

	/**
	 * ?앹뾽李쎌쓣 ?ъ슜?섍린 ?꾪빐 ?앹뾽李쎈ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param popupManageVO - ?앹뾽李?Vo
	 * @return List - ?앹뾽李?紐⑸줉
	 *
	 * @param popupManageVO
	 */
	public List<EgovMap> selectPopupMainList(PopupManageVO popupManageVO) throws Exception;

}