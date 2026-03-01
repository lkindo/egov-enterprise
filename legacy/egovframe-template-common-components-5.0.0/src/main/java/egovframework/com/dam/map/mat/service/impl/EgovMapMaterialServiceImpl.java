package egovframework.com.dam.map.mat.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.dam.map.mat.service.EgovMapMaterialService;
import egovframework.com.dam.map.mat.service.MapMaterial;
import egovframework.com.dam.map.mat.service.MapMaterialVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앸㏊(吏?앹쑀???????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앸㏊(吏?앹쑀????????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앸㏊(吏?앹쑀????議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 2010.08.12
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.12  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2025.06.14  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Service("MapMaterialService")
public class EgovMapMaterialServiceImpl extends EgovAbstractServiceImpl implements EgovMapMaterialService {

	@Resource(name = "MapMaterialDAO")
	private MapMaterialDAO mapMaterialDAO;

	/**
	 * ?깅줉??吏?앸㏊(吏?앹쑀?? ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param mapMaterialVO- 吏?앸㏊(吏?앹쑀?? VO
	 * @return String - 吏?앸㏊(吏?앹쑀??紐⑸줉
	 *
	 * @param MapMaterialVO
	 */
	@Override
	public List<MapMaterialVO> selectMapMaterialList(MapMaterialVO searchVO) throws Exception {
		return mapMaterialDAO.selectMapMaterialList(searchVO);
	}

	/**
	 * 吏?앸㏊(吏?앹쑀?? 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param MapMaterialVO - 吏?앸㏊(吏?앹쑀?? Vo
	 * @return int - 吏?앸㏊(吏?앹쑀?? ?좏깉 移댁슫????
	 *
	 * @param MapMaterialVO
	 */
	@Override
	public int selectMapMaterialTotCnt(MapMaterialVO searchVO) throws Exception {
		return mapMaterialDAO.selectMapMaterialTotCnt(searchVO);
	}

	/**
	 * 吏?앸㏊(吏?앹쑀???곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param MapMaterialVO - 吏?앸㏊(吏?앹쑀?? VO
	 * @return String - 吏?앸㏊(吏?앹쑀??VO
	 *
	 * @param MapMaterialVO
	 */
	@Override
	public MapMaterial selectMapMaterial(MapMaterial mapMaterial) throws Exception {
		MapMaterial mtm = mapMaterialDAO.selectMapMaterial(mapMaterial);
		return mtm;
	}

	/**
	 * 吏?앸㏊(吏?앹쑀?? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param konTypeNm     - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	@Override
	public void insertMapMaterial(MapMaterial mapMaterial) throws Exception {
		mapMaterialDAO.insertMapMaterial(mapMaterial);
	}

	/**
	 * 湲??깅줉 ??吏?앸㏊(吏?앹쑀??留??뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param konTypeNm     - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	@Override
	public void updateMapMaterial(MapMaterial mapMaterial) throws Exception {
		mapMaterialDAO.updateMapMaterial(mapMaterial);
	}

	/**
	 * 湲??깅줉??吏?앸㏊(吏?앹쑀?? ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param konTypeNm     - 吏?앸㏊(吏?앹쑀?? model
	 *
	 * @param MapMaterialVO
	 */
	@Override
	public void deleteMapMaterial(MapMaterial mapMaterial) throws Exception {
		mapMaterialDAO.deleteMapMaterial(mapMaterial);
	}

	/**
	 * 吏?앹쑀?뺤퐫??以묐났 ?щ? 泥댄겕(?꾩튂 : 1260.吏?앸㏊愿由??좏삎) > ?깅줉)
	 * 
	 * @param knoTypeCd
	 * @return 以묐났?щ?
	 * @throws Exception
	 */
	@Override
	public int knoTypeCdCheck(String knoTypeCd) throws Exception {
		return mapMaterialDAO.knoTypeCdCheck(knoTypeCd);
	}
}
