package egovframework.com.dam.spe.spe.service;

import java.util.List;

/**
 * 媛쒖슂
 * - 吏?앹쟾臾멸??????Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹쟾臾멸???????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹쟾臾멸???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:43
 */
public interface EgovKnoSpecialistService {

	/**
	 * ?깅줉??吏?앹쟾臾멸? ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param KnoSpecialistVO- 吏?앹쟾臾멸? VO
	 * @return String - 吏?앹쟾臾멸? 紐⑸줉
	 *
	 * @param KnoSpecialistVO
	 */
	List<KnoSpecialistVO> selectKnoSpecialistList(KnoSpecialistVO searchVO) throws Exception;

	/**
	 * 吏?앹쟾臾멸? 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param KnoSpecialistVO - 吏?앹쟾臾멸? Vo
	 * @return int - 吏?앹쟾臾멸? ?좏깉 移댁슫????
	 *
	 * @param KnoSpecialistVO
	 */
	int selectKnoSpecialistTotCnt(KnoSpecialistVO searchVO) throws Exception;

	/**
	 * 吏?앹쟾臾멸? ?곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param KonSpecialistVO - 吏?앹쟾臾멸? VO
	 * @return String - 吏?앹쟾臾멸? VO
	 *
	 * @param KonSpecialistVO
	 */
	KnoSpecialist selectKnoSpecialist(KnoSpecialist konSpecialist) throws Exception;

	/**
	 * 吏?앹쟾臾멸? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param speNm - 吏?앹쟾臾멸? model
	 *
	 * @param speNm
	 */
	void insertKnoSpecialist(KnoSpecialist konSpecialist) throws Exception;

	/**
	 * 湲??깅줉 ??吏?앹쟾臾멸? ?뺣낫瑜??섏젙 ?쒕떎.
	 * @param speNm - 吏?앹쟾臾멸? model
	 *
	 * @param speNm
	 */
	void updateKnoSpecialist(KnoSpecialist konSpecialist) throws Exception;

	/**
	 * 湲??깅줉??吏?앹쟾臾멸? ?뺣낫瑜???젣?쒕떎.
	 * @param siteUrl - 吏?앹쟾臾멸? model
	 *
	 * @param speNm
	 */
	void deleteKnoSpecialist(KnoSpecialist konSpecialist) throws Exception;

}
