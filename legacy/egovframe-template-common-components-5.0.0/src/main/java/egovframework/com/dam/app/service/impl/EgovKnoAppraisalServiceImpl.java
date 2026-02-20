package egovframework.com.dam.app.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.dam.app.service.EgovKnoAppraisalService;
import egovframework.com.dam.app.service.KnoAppraisal;
import egovframework.com.dam.app.service.KnoAppraisalVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앹젙蹂댄룊媛?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹젙蹂댄룊媛??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹젙蹂댄룊媛??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 12-8-2010 ?ㅽ썑 3:44:38
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.12.08  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2025.06.13  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Service("KnoAppraisalService")
public class EgovKnoAppraisalServiceImpl extends EgovAbstractServiceImpl implements EgovKnoAppraisalService {

	@Resource(name = "KnoAppraisalDAO")
	private KnoAppraisalDAO knoAppraisalDAO;

	/**
	 * ?깅줉??吏?앹젙蹂댄룊媛 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KnoAppraisalVO - 吏?앹젙蹂댄룊媛 VO
	 * @return String - 吏?앹젙蹂댄룊媛 VO
	 *
	 * @param KnoAppraisalVO
	 */
	@Override
	public List<EgovMap> selectKnoAppraisalList(KnoAppraisalVO searchVO) throws Exception {
		return knoAppraisalDAO.selectKnoAppraisalList(searchVO);
	}

	/**
	 * 吏?앹젙蹂댄룊媛 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param MapTeamVO - 吏?앹젙蹂댄룊媛 Vo
	 * @return int - 吏?앹젙蹂댄룊媛 ?좏깉 移댁슫????
	 *
	 * @param KnoAppraisalVO
	 */
	@Override
	public int selectKnoAppraisalTotCnt(KnoAppraisalVO searchVO) throws Exception {
		return knoAppraisalDAO.selectKnoAppraisalTotCnt(searchVO);
	}

	/**
	 * 吏?앹젙蹂댄룊媛 ?곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KnoAppraisalVO - 吏?앹젙蹂댄룊媛 VO
	 * @return String - 吏?앹젙蹂댄룊媛 VO
	 *
	 * @param KnoAppraisalVO
	 */
	@Override
	public KnoAppraisal selectKnoAppraisal(KnoAppraisal knoAppraisal) throws Exception {
		KnoAppraisal kal = knoAppraisalDAO.selectKnoAppraisal(knoAppraisal);
		return kal;
	}

	/**
	 * 吏?앹젙蹂댄룊媛 ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param knoAps - 吏?앹젙蹂댄룊媛 model
	 *
	 * @param knoAps
	 */
	@Override
	public void insertKnoAppraisal(KnoAppraisal knoAppraisal) throws Exception {
		knoAppraisalDAO.insertKnoAppraisal(knoAppraisal);
	}

	/**
	 * 湲??깅줉 ??吏?앹젙蹂댄룊媛 ?뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param AppraisalknoAps - 吏?앹젙蹂댄룊媛 model
	 *
	 * @param knoAps
	 */
	@Override
	public void updateKnoAppraisal(KnoAppraisal knoAppraisal) throws Exception {
		knoAppraisalDAO.updateKnoAppraisal(knoAppraisal);
	}

	/**
	 * 湲??깅줉??吏?앹젙蹂댄룊媛 ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param AppraisalknoAps - 吏?앹젙蹂댄룊媛 model
	 *
	 * @param knoAps
	 */
	@Override
	public void deleteKnoAppraisal(KnoAppraisal knoAppraisal) throws Exception {
		knoAppraisalDAO.deleteKnoAppraisal(knoAppraisal);
	}

}