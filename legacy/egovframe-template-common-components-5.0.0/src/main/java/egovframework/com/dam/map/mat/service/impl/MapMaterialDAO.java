package egovframework.com.dam.map.mat.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.dam.map.mat.service.MapMaterial;
import egovframework.com.dam.map.mat.service.MapMaterialVO;

/**
 * 媛쒖슂
 * - 吏?앸㏊(吏?앹쑀???????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앸㏊(吏?앹쑀????????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앸㏊(吏?앹쑀????議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:52
 */

@Repository("MapMaterialDAO")
public class MapMaterialDAO extends EgovComAbstractDAO {

	/**
	 * ?깅줉??吏?앸㏊(吏?앹쑀?? ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param mapMaterialVO- 吏?앸㏊(吏?앹쑀?? VO
	 * @return String - 吏?앸㏊(吏?앹쑀??紐⑸줉
	 *
	 * @param MapMaterialVO
	 */
	public List<MapMaterialVO> selectMapMaterialList(MapMaterialVO searchVO) throws Exception {
		return  selectList("MapMaterialDAO.selectMapMaterialList", searchVO);
	}

	/**
	 * 吏?앸㏊(吏?앹쑀?? 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param MapMaterialVO - 吏?앸㏊(吏?앹쑀?? Vo
	 * @return int - 吏?앸㏊(吏?앹쑀?? ?좏깉 移댁슫????
	 *
	 * @param MapMaterialVO
	 */
	public int selectMapMaterialTotCnt(MapMaterialVO searchVO) throws Exception {
		return  (Integer)selectOne("MapMaterialDAO.selectMapMaterialTotCnt", searchVO);
	}

	/**
	 * 吏?앸㏊(吏?앹쑀???곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param MapMaterialVO - 吏?앸㏊(吏?앹쑀?? VO
	 * @return String - 吏?앸㏊(吏?앹쑀??VO
	 *
	 * @param MapMaterialVO
	 */
	public MapMaterial selectMapMaterial(MapMaterial mapMaterial) throws Exception {
		return (MapMaterial)selectOne("MapMaterialDAO.selectMapMaterial", mapMaterial);
	}

	/**
	 * 吏?앸㏊(吏?앹쑀?? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	public void insertMapMaterial(MapMaterial mapMaterial) throws Exception {
		insert("MapMaterialDAO.insertMapMaterial", mapMaterial);
	}

	/**
	 * 湲??깅줉 ??吏?앸㏊(吏?앹쑀??留??뺣낫瑜??섏젙 ?쒕떎.
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	public void updateMapMaterial(MapMaterial mapMaterial) throws Exception {
		update("MapMaterialDAO.updateMapMaterial", mapMaterial);
	}

	/**
	 * 湲??깅줉??吏?앸㏊(吏?앹쑀?? ?뺣낫瑜???젣?쒕떎.
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	public void deleteMapMaterial(MapMaterial mapMaterial) throws Exception {
		delete("MapMaterialDAO.deleteMapMaterial", mapMaterial);
	}

	/**
	 * 吏?앹쑀?뺤퐫??以묐났 ?щ? 泥댄겕(?꾩튂 : 1260.吏?앸㏊愿由??좏삎) > ?깅줉)
	 * @param knoTypeCd
	 * @return 以묐났 ?щ?
	 * @throws Exception
	 */
	public int knoTypeCdCheck(String knoTypeCd) throws Exception {
		return (Integer)selectOne("MapMaterialDAO.selectKnoTypeCdCheck", knoTypeCd);
	}
}
