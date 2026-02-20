package egovframework.com.uss.ion.bnt.service;

import java.io.InputStream;
import java.util.List;

/**
 * 媛쒖슂
 * - ?뱀쭅愿由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뱀쭅愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?뱀쭅愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public interface EgovBndtManageService {

	/**
	 * ?뱀쭅愿由??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???뱀쭅愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return List - ?뱀쭅愿由?紐⑸줉
	 */
	public List<BndtManageVO> selectBndtManageList(BndtManageVO bndtManageVO) throws Exception;

	/**
	 * ?뱀쭅愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return int - ?뱀쭅愿由?移댁슫????
	 */
	public int selectBndtManageListTotCnt(BndtManageVO bndtManageVO) throws Exception ;

	/**
	 * ?깅줉???뱀쭅愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return BndtManageVO - ?뱀쭅愿由?VO
	 */
	public BndtManageVO selectBndtManage(BndtManageVO bndtManageVO) throws Exception;

	/**
	 * ?뱀쭅愿由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	public void insertBndtManage(BndtManage bndtManage) throws Exception;

	/**
	 * 湲??깅줉???뱀쭅愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	public void updtBndtManage(BndtManage bndtManage) throws Exception;

	/**
	 * 湲??깅줉???뱀쭅愿由??뺣낫瑜???젣?쒕떎.
	 * @param bndtManage - ?뱀쭅愿由?model
	 */
	public void deleteBndtManage(BndtManage bndtManage) throws Exception;

    /**
	 * ?뱀쭅?쇱? 媛쒖닔瑜?議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectBndtDiaryTotCnt(BndtManage bndtManage) throws Exception;

    /***** ?뱀쭅 泥댄겕愿由?*****/
	/**
	 * ?뱀쭅泥댄겕愿由??뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???뱀쭅泥댄겕愿由?紐⑸줉??議고쉶?쒕떎.
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return List - ?뱀쭅泥댄겕愿由?紐⑸줉
	 */
	public List<BndtCeckManageVO> selectBndtCeckManageList(BndtCeckManageVO bndtCeckManageVO) throws Exception;

	/**
	 * ?뱀쭅泥댄겕愿由?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return int - ?뱀쭅泥댄겕愿由?移댁슫????
	 */
	public int selectBndtCeckManageListTotCnt(BndtCeckManageVO bndtCeckManageVO) throws Exception ;

	/**
	 * ?깅줉???뱀쭅泥댄겕愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return BndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 */
	public BndtCeckManageVO selectBndtCeckManage(BndtCeckManageVO bndtCeckManageVO) throws Exception;

	/**
	 * ?뱀쭅泥댄겕愿由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	public void insertBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception;

	/**
	 * 湲??깅줉???뱀쭅泥댄겕愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	public void updtBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception;

	/**
	 * 湲??깅줉???뱀쭅泥댄겕愿由??뺣낫瑜???젣?쒕떎.
	 * @param bndtCeckManage - ?뱀쭅泥댄겕愿由?model
	 */
	public void deleteBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception;


    /**
	 * ?뱀쭅泥댄겕 以묐났?щ? 議고쉶?쒕떎.
	 * @param bndtCeckManageVO - ?뱀쭅泥댄겕愿由?VO
	 * @return int
	 * @exception Exception
	 */
	public int selectBndtCeckManageDplctAt(BndtCeckManage bndtCeckManage) throws Exception ;


    /***** ?뱀쭅 ?쇱? *****/

	/**
	 * ?깅줉???뱀쭅?쇱?愿由ъ쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bndtDiaryVO - ?뱀쭅?쇱?愿由?VO
	 * @return BndtDiaryVO - ?뱀쭅?쇱?愿由?VO
	 */
	public List<BndtDiaryVO> selectBndtDiary(BndtDiaryVO bndtDiaryVO) throws Exception;

	/**
	 * ?뱀쭅?쇱?愿由??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param bndtDiary - ?뱀쭅?쇱?愿由?model
	 */
	public void insertBndtDiary(BndtDiary bndtDiary, String diaryForInsert) throws Exception;

	/**
	 * 湲??깅줉???뱀쭅?쇱?愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param bndtDiary - ?뱀쭅?쇱?愿由?model
	 */
	public void updtBndtDiary(BndtDiary bndtDiary, String diaryForUpdt) throws Exception;

	/**
	 * 湲??깅줉???뱀쭅?쇱?愿由??뺣낫瑜???젣?쒕떎.
	 * @param bndtDiary - ?뱀쭅?쇱?愿由?model
	 */
	public void deleteBndtDiary(BndtDiary bndtDiary) throws Exception;

	/**
	 * ?뱀쭅??excel?앹꽦
	 * @param  inputStream InputStream
	 * @return  String
	 * @exception Exception
	 */
	public List<BndtManageVO> selectBndtManageBnde(InputStream inputStream) throws Exception;

	/**
	 * ?뱀쭅??excel?앹꽦 (Xlsx?ъ슜??
	 * @param  inputStream InputStream
	 * @return  String
	 * @exception Exception
	 */
	public List<BndtManageVO> selectBndtManageBndeX(InputStream inputStream) throws Exception;
	
	/**
	 * ?뱀쭅?뺣낫瑜??쇨큵?깅줉泥섎━?쒕떎.
	 * @param bndtManageVO     - ?뱀쭅愿由?VO
	 * @param String           - ?뱀쭅?먯젙蹂?
	 */
	public void insertBndtManageBnde(BndtManageVO bndtManageVO, String checkedBndtManageForInsert) throws Exception;

    /**
	 * ?뱀쭅愿由??깅줉嫄댁닔 議고쉶?쒕떎.
	 * @param bndtManageVO - ?뱀쭅愿由?VO
	 * @return int
	 * @exception Exception
	 */
    public int selectBndtManageMonthCnt(BndtManageVO bndtManageVO) throws Exception;
}