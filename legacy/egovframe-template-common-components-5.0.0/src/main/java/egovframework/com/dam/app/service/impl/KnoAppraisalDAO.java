package egovframework.com.dam.app.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.dam.app.service.KnoAppraisal;
import egovframework.com.dam.app.service.KnoAppraisalVO;

/**
 * 媛쒖슂
 * - 吏?앹젙蹂댄룊媛?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹젙蹂댄룊媛??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹젙蹂댄룊媛??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:47
 */

@Repository("KnoAppraisalDAO")
public class KnoAppraisalDAO extends EgovComAbstractDAO {

	/**
	 * ?깅줉??吏?앹젙蹂댄룊媛 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param KnoAppraisalVO - 吏?앹젙蹂댄룊媛 VO
	 * @return String - 吏?앹젙蹂댄룊媛 VO
	 *
	 * @param KnoAppraisalVO
	 */
	public List<EgovMap> selectKnoAppraisalList(KnoAppraisalVO searchVO) throws Exception {
		return  selectList("KnoAppraisalDAO.selectKnoAppraisalList", searchVO);
	}

	/**
	 * 吏?앹젙蹂댄룊媛 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param MapTeamVO - 吏?앹젙蹂댄룊媛 Vo
	 * @return int - 吏?앹젙蹂댄룊媛 ?좏깉 移댁슫????
	 *
	 * @param KnoAppraisalVO
	 */
	public int selectKnoAppraisalTotCnt(KnoAppraisalVO searchVO) throws Exception {
		return  (Integer)selectOne("KnoAppraisalDAO.selectKnoAppraisalTotCnt", searchVO);
	}

	/**
	 * 吏?앹젙蹂댄룊媛 ?곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param KnoAppraisalVO - 吏?앹젙蹂댄룊媛 VO
	 * @return String - 吏?앹젙蹂댄룊媛 VO
	 *
	 * @param KnoAppraisalVO
	 */
	public KnoAppraisal selectKnoAppraisal(KnoAppraisal knoAppraisal) throws Exception {
		return (KnoAppraisal)selectOne("KnoAppraisalDAO.selectKnoAppraisal", knoAppraisal);
	}

	/**
	 * 吏?앹젙蹂댄룊媛 ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param knoAps - 吏?앹젙蹂댄룊媛 model
	 *
	 * @param knoAps
	 */
	public void insertKnoAppraisal(KnoAppraisal knoAppraisal) throws Exception {
		insert("KnoAppraisalDAO.insertKnoAppraisal", knoAppraisal);
	}

	/**
	 * 湲??깅줉 ??吏?앹젙蹂댄룊媛 ?뺣낫瑜??섏젙 ?쒕떎.
	 * @param AppraisalknoAps - 吏?앹젙蹂댄룊媛 model
	 *
	 * @param knoAps
	 */
	public void updateKnoAppraisal(KnoAppraisal knoAppraisal) throws Exception {
		update("KnoAppraisalDAO.updateKnoAppraisal", knoAppraisal);
	}

	/**
	 * 湲??깅줉??吏?앹젙蹂댄룊媛 ?뺣낫瑜???젣?쒕떎.
	 * @param AppraisalknoAps - 吏?앹젙蹂댄룊媛 model
	 *
	 * @param knoAps
	 */
	public void deleteKnoAppraisal(KnoAppraisal knoAppraisal) throws Exception {
		delete("KnoAppraisalDAO.deleteKnoAppraisal", knoAppraisal);
	}

}