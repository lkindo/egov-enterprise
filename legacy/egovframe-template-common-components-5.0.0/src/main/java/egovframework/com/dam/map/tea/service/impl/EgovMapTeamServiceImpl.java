package egovframework.com.dam.map.tea.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import egovframework.com.dam.map.tea.service.EgovMapTeamService;
import egovframework.com.dam.map.tea.service.MapTeam;
import egovframework.com.dam.map.tea.service.MapTeamVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앸㏊(議곗쭅蹂??????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앸㏊(議곗쭅蹂???????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앸㏊(議곗쭅蹂???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 2010.07.22
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.07.22  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2025.06.16  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Service("MapTeamService")
public class EgovMapTeamServiceImpl extends EgovAbstractServiceImpl implements EgovMapTeamService {

	@Resource(name = "MapTeamDAO")
	private MapTeamDAO mapTeamDAO;

	/**
	 * ?깅줉??吏?앸㏊(議곗쭅蹂? 紐⑸줉??議고쉶 ?쒕떎.
	 * 
	 * @param mapTeamVO- 吏?앸㏊(議곗쭅蹂? VO
	 * @return String - 吏?앸㏊(議곗쭅蹂? 紐⑸줉
	 *
	 * @param MapTeamVO
	 */
	@Override
	public List<MapTeamVO> selectMapTeamList(MapTeamVO searchVO) throws Exception {
		return mapTeamDAO.selectMapTeamList(searchVO);
	}

	/**
	 * 吏?앸㏊(議곗쭅蹂? 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param MapTeamVO - 吏?앸㏊(議곗쭅蹂? Vo
	 * @return int - 吏?앸㏊(議곗쭅蹂? ?좏깉 移댁슫????
	 *
	 * @param MapTeamVO
	 */
	@Override
	public int selectMapTeamTotCnt(MapTeamVO searchVO) throws Exception {
		return mapTeamDAO.selectMapTeamTotCnt(searchVO);
	}

	/**
	 * 吏?앸㏊(議곗쭅蹂??곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param MapTeamVO - 吏?앸㏊(議곗쭅蹂? VO
	 * @return String - 吏?앸㏊(議곗쭅蹂? VO
	 *
	 * @param MapTeam
	 */
	@Override
	public MapTeam selectMapTeamDetail(MapTeam mapTeam) throws Exception {
		MapTeam mtm = mapTeamDAO.selectMapTeamDetail(mapTeam);
		return mtm;
	}

	/**
	 * 吏?앸㏊(議곗쭅蹂? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param siteUrl  - 吏?앸㏊(議곗쭅蹂? model
	 *
	 * @param orgnztNm
	 */
	@Override
	public void insertMapTeam(MapTeam mapTeam) throws Exception {
		try {
			mapTeamDAO.insertMapTeam(mapTeam);
		} catch (DuplicateKeyException e) {
			throw new DuplicateKeyException("?대? ?깅줉??議곗쭅ID?낅땲??", e);
		}
	}

	/**
	 * 湲??깅줉 ??吏?앸㏊(議곗쭅蹂? ?뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param siteUrl  - 吏?앸㏊(議곗쭅蹂? model
	 *
	 * @param orgnztNm
	 */
	@Override
	public void updateMapTeam(MapTeam mapTeam) throws Exception {
		mapTeamDAO.updateMapTeam(mapTeam);
	}

	/**
	 * 湲??깅줉??吏?앸㏊(議곗쭅蹂? ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param siteUrl  - 吏?앸㏊(議곗쭅蹂? model
	 *
	 * @param orgnztNm
	 */
	@Override
	public void deleteMapTeam(MapTeam mapTeam) throws Exception {
		mapTeamDAO.deleteMapTeam(mapTeam);
	}

}