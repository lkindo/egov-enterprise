package egovframework.com.dam.map.mat.service;

import java.util.List;

/**
 * 媛쒖슂
 * - 吏?앸㏊(吏?앹쑀???????Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앸㏊(吏?앹쑀????????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앸㏊(吏?앹쑀????議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:44
 */
public interface EgovMapMaterialService {

	/**
	 * ?깅줉??吏?앸㏊(吏?앹쑀?? ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param mapMaterialVO- 吏?앸㏊(吏?앹쑀?? VO
	 * @return String - 吏?앸㏊(吏?앹쑀??紐⑸줉
	 *
	 * @param MapMaterialVO
	 */
	List<MapMaterialVO> selectMapMaterialList(MapMaterialVO searchVO) throws Exception;

	/**
	 * 吏?앸㏊(吏?앹쑀?? 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param MapMaterialVO - 吏?앸㏊(吏?앹쑀?? Vo
	 * @return int - 吏?앸㏊(吏?앹쑀?? ?좏깉 移댁슫????
	 *
	 * @param MapMaterialVO
	 */
	int selectMapMaterialTotCnt(MapMaterialVO searchVO) throws Exception;

	/**
	 * 吏?앸㏊(吏?앹쑀???곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param MapMaterialVO - 吏?앸㏊(吏?앹쑀?? VO
	 * @return String - 吏?앸㏊(吏?앹쑀??VO
	 *
	 * @param MapMaterialVO
	 */
	MapMaterial selectMapMaterial(MapMaterial mapMaterial) throws Exception;

	/**
	 * 吏?앸㏊(吏?앹쑀?? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	void insertMapMaterial(MapMaterial mapMaterial) throws Exception;

	/**
	 * 湲??깅줉 ??吏?앸㏊(吏?앹쑀??留??뺣낫瑜??섏젙 ?쒕떎.
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	void updateMapMaterial(MapMaterial mapMaterial) throws Exception;

	/**
	 * 湲??깅줉??吏?앸㏊(吏?앹쑀?? ?뺣낫瑜???젣?쒕떎.
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	void deleteMapMaterial(MapMaterial mapMaterial) throws Exception;

	/**
	 * 吏?앹쑀?뺤퐫??以묐났 ?щ? 泥댄겕(?꾩튂 : 1260.吏?앸㏊愿由??좏삎) > ?깅줉)
	 * @param knoTypeCd
	 * @return 以묐났 ?щ?
	 * @throws Exception
	 */
	int knoTypeCdCheck(String knoTypeCd) throws Exception;
}