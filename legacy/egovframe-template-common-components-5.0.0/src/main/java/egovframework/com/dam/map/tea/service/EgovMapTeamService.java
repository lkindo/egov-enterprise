package egovframework.com.dam.map.tea.service;

import java.util.List;

/**
 * 媛쒖슂
 * - 吏?앸㏊(議곗쭅蹂??????Service Interface瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앸㏊(議곗쭅蹂???????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앸㏊(議곗쭅蹂???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 22-7-2010 ?ㅼ쟾 10:57:37
 */
public interface EgovMapTeamService {

	/**
	 * ?깅줉??吏?앸㏊(議곗쭅蹂? 紐⑸줉??議고쉶 ?쒕떎.
	 * @param mapTeamVO- 吏?앸㏊(議곗쭅蹂? VO
	 * @return String - 吏?앸㏊(議곗쭅蹂? 紐⑸줉
	 *
	 * @param MapTeamVO
	 */
	List<MapTeamVO> selectMapTeamList(MapTeamVO searchVO) throws Exception;

	/**
	 * 吏?앸㏊(議곗쭅蹂? 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param MapTeamVO - 吏?앸㏊(議곗쭅蹂? Vo
	 * @return int - 吏?앸㏊(議곗쭅蹂? ?좏깉 移댁슫????
	 *
	 * @param MapTeamVO
	 */
	int selectMapTeamTotCnt(MapTeamVO searchVO) throws Exception;

	/**
	 * 吏?앸㏊(議곗쭅蹂??곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param MapTeamVO - 吏?앸㏊(議곗쭅蹂? VO
	 * @return String - 吏?앸㏊(議곗쭅蹂? VO
	 *
	 * @param MapTeamVO
	 */
	MapTeam selectMapTeamDetail(MapTeam mapTeam) throws Exception;

	/**
	 * 吏?앸㏊(議곗쭅蹂? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param siteUrl - 吏?앸㏊(議곗쭅蹂? model
	 *
	 * @param orgnztNm
	 */
	void insertMapTeam(MapTeam mapTeam) throws Exception;

	/**
	 * 湲??깅줉 ??吏?앸㏊(議곗쭅蹂? ?뺣낫瑜??섏젙 ?쒕떎.
	 * @param siteUrl - 吏?앸㏊(議곗쭅蹂? model
	 *
	 * @param orgnztNm
	 */
	void updateMapTeam(MapTeam mapTeam) throws Exception;

	/**
	 * 湲??깅줉??吏?앸㏊(議곗쭅蹂? ?뺣낫瑜???젣?쒕떎.
	 * @param siteUrl - 吏?앸㏊(議곗쭅蹂? model
	 *
	 * @param orgnztNm
	 */
	void deleteMapTeam(MapTeam mapTeam) throws Exception;

}
