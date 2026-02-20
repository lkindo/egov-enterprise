package egovframework.com.dam.per.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.dam.per.service.KnoPersonal;
import egovframework.com.dam.per.service.KnoPersonalVO;

/**
 * 媛쒖슂
 * - 媛쒖씤吏?앹젙蹂댁뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 媛쒖씤吏?앹젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 媛쒖씤吏?앹젙蹂댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:50
 */

@Repository("KnoPersonalDAO")
public class KnoPersonalDAO extends EgovComAbstractDAO {

	/**
	 * ?깅줉??媛쒖씤吏???뺣낫瑜?議고쉶 ?쒕떎.
	 * @param KnoPersonalVO - 媛쒖씤吏??VO
	 * @return String - 媛쒖씤吏?앹젙蹂?紐⑸줉
	 *
	 * @param KnoPersonalVO
	 */
	public List<KnoPersonalVO> selectKnoPersonalList(KnoPersonalVO searchVO) throws Exception {
		return selectList("KnoPersonalDAO.selectKnoPersonalList", searchVO);
	}

	/**
	 * 媛쒖씤吏??紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param KnoPersonalVO - 媛쒖씤吏??Vo
	 * @return int - 媛쒖씤吏???좏깉 移댁슫????
	 *
	 * @param KnoPersonalVO
	 */
	public int selectKnoPersonalTotCnt(KnoPersonalVO searchVO) throws Exception {
		return selectOne("KnoPersonalDAO.selectKnoPersonalTotCnt", searchVO);
	}

	/**
	 * 媛쒖씤吏?앹젙蹂??곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param KnoPersonalVO - 媛쒖씤吏?앹젙蹂?VO
	 * @return String - 媛쒖씤吏??VO
	 *
	 * @param KnoPersonalVO
	 */
	public KnoPersonal selectKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		return selectOne("KnoPersonalDAO.selectKnoPersonal", knoPersonal);
	}

	/**
	 * 媛쒖씤吏???뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 *
	 * @param KnoNm
	 */
	public void insertKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		insert("KnoPersonalDAO.insertKnoPersonal", knoPersonal);
	}

	/**
	 * 湲??깅줉 ??媛쒖씤吏???뺣낫瑜??섏젙 ?쒕떎.
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 *
	 * @param KnoNm
	 */
	public void updateKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		update("KnoPersonalDAO.updateKnoPersonal", knoPersonal);
	}

	/**
	 * 湲??깅줉??媛쒖씤吏???뺣낫瑜???젣?쒕떎.
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 *
	 * @param KnoNm
	 */
	public void deleteKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		delete("KnoPersonalDAO.deleteKnoPersonal", knoPersonal);
	}

}