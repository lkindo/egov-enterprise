package egovframework.com.dam.mgm.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.dam.mgm.service.KnoManagement;
import egovframework.com.dam.mgm.service.KnoManagementVO;

/**
 * 媛쒖슂
 * - 吏?앹젙蹂댁뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹젙蹂댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:48
 */
@Repository("KnoManagementDAO")
public class KnoManagementDAO extends EgovComAbstractDAO {

	/**
	 * ?깅줉??吏?앹젙蹂?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO 吏?앹젙蹂?議고쉶 議곌굔 VO
	 * @return 吏?앹젙蹂?紐⑸줉(List<EgovMap>)
	 * @throws Exception ?곗씠???묎렐 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	public List<EgovMap> selectKnoManagementList(KnoManagementVO searchVO) throws Exception {
		return selectList("KnoManagementDAO.selectKnoManagementList", searchVO);
	}

	/**
	 * 吏?앹젙蹂?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO 吏?앹젙蹂?議고쉶 議곌굔 VO
	 * @return 珥?媛쒖닔
	 * @throws Exception ?곗씠???묎렐 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	public int selectKnoManagementTotCnt(KnoManagementVO searchVO) throws Exception {
		return selectOne("KnoManagementDAO.selectKnoManagementTotCnt", searchVO);
	}

	/**
	 * 吏?앹젙蹂??곸꽭 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param knoManagement 議고쉶??吏?앹젙蹂??앸퀎 ?뺣낫媛 ?닿릿 紐⑤뜽
	 * @return 吏?앹젙蹂??곸꽭 紐⑤뜽
	 * @throws Exception ?앸퀎?먭? ?녾굅???대떦 吏?앹젙蹂닿? 議댁옱?섏? ?딄굅???곗씠???묎렐 ?ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	public KnoManagement selectKnoManagement(KnoManagement knoManagement) throws Exception {
		return selectOne("KnoManagementDAO.selectKnoManagement", knoManagement);
	}

	/**
	 * 吏?앹젙蹂??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param knoManagement ?깅줉??吏?앹젙蹂?紐⑤뜽
	 * @throws Exception ?곗씠???묎렐 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	public void insertKnoManagement(KnoManagement knoManagement) throws Exception {
		insert("KnoManagementDAO.insertKnoManagement", knoManagement);
	}

	/**
	 * 湲??깅줉??吏?앹젙蹂??뺣낫瑜??섏젙?쒕떎.
	 * @param knoManagement ?섏젙??吏?앹젙蹂?紐⑤뜽
	 * @throws Exception ??곸씠 議댁옱?섏? ?딄굅???곗씠???묎렐 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	public void updateKnoManagement(KnoManagement knoManagement) throws Exception {
		update("KnoManagementDAO.updateKnoManagement", knoManagement);
	}

	/**
	 * 湲??깅줉??吏?앹젙蹂??뺣낫瑜???젣?쒕떎.
	 * @param knoManagement ??젣??吏?앹젙蹂?紐⑤뜽
	 * @throws Exception ??곸씠 議댁옱?섏? ?딄굅???곗씠???묎렐 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	public void deleteKnoManagement(KnoManagement knoManagement) throws Exception {
		delete("KnoManagementDAO.deleteKnoManagement", knoManagement);
	}

}