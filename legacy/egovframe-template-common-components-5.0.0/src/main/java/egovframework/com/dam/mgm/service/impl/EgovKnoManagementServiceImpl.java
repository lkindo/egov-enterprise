package egovframework.com.dam.mgm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.dam.mgm.service.EgovKnoManagementService;
import egovframework.com.dam.mgm.service.KnoManagement;
import egovframework.com.dam.mgm.service.KnoManagementVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앹젙蹂댁뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹젙蹂댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2025.06.17  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Service("KnoManagementService")
public class EgovKnoManagementServiceImpl extends EgovAbstractServiceImpl implements EgovKnoManagementService {

	@Resource(name = "KnoManagementDAO")
	private KnoManagementDAO knoManagementDAO;

	/**
	 * ?깅줉??吏?앹젙蹂?紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO 吏?앹젙蹂?議고쉶 議곌굔 VO
	 * @return 吏?앹젙蹂?紐⑸줉(List<EgovMap>)
	 * @throws Exception 議고쉶 議곌굔???좏슚?섏? ?딄굅???곗씠???묎렐 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@Override
	public List<EgovMap> selectKnoManagementList(KnoManagementVO searchVO) throws Exception {
		return knoManagementDAO.selectKnoManagementList(searchVO);
	}

	/**
	 * 吏?앹젙蹂?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO 吏?앹젙蹂?議고쉶 議곌굔 VO
	 * @return 珥?媛쒖닔
	 * @throws Exception 議고쉶 議곌굔???좏슚?섏? ?딄굅???곗씠???묎렐 以??ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@Override
	public int selectKnoManagementTotCnt(KnoManagementVO searchVO) throws Exception {
		return knoManagementDAO.selectKnoManagementTotCnt(searchVO);
	}

	/**
	 * 吏?앹젙蹂??곸꽭 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param knoManagement 議고쉶??吏?앹젙蹂??앸퀎 ?뺣낫媛 ?닿릿 紐⑤뜽
	 * @return 吏?앹젙蹂??곸꽭 紐⑤뜽
	 * @throws Exception ?앸퀎?먭? ?녾굅???대떦 吏?앹젙蹂닿? 議댁옱?섏? ?딄굅???곗씠???묎렐 ?ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@Override
	public KnoManagement selectKnoManagement(KnoManagement knoManagement) throws Exception {
		KnoManagement kmt = knoManagementDAO.selectKnoManagement(knoManagement);
		return kmt;
	}

	/**
	 * 吏?앹젙蹂??뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param knoManagement ?깅줉??吏?앹젙蹂?紐⑤뜽
	 * @throws Exception ?꾩닔 媛??꾨씫, 沅뚰븳 ?놁쓬, ?먮뒗 ?곗씠???묎렐 ?ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@Override
	public void insertKnoManagement(KnoManagement knoManagement) throws Exception {
		knoManagementDAO.insertKnoManagement(knoManagement);
	}

	/**
	 * 湲??깅줉??吏?앹젙蹂??뺣낫瑜??섏젙?쒕떎.
	 * @param knoManagement ?섏젙??吏?앹젙蹂?紐⑤뜽
	 * @throws Exception ??곸씠 議댁옱?섏? ?딄굅??沅뚰븳 ?놁쓬, ?먮뒗 ?곗씠???묎렐 ?ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@Override
	public void updateKnoManagement(KnoManagement knoManagement) throws Exception {
		knoManagementDAO.updateKnoManagement(knoManagement);
	}

	/**
	 * 湲??깅줉??吏?앹젙蹂??뺣낫瑜???젣?쒕떎.
	 * @param knoManagement ??젣??吏?앹젙蹂?紐⑤뜽
	 * @throws Exception ??곸씠 議댁옱?섏? ?딄굅??沅뚰븳 ?놁쓬, ?먮뒗 ?곗씠???묎렐 ?ㅻ쪟媛 諛쒖깮??寃쎌슦
	 */
	@Override
	public void deleteKnoManagement(KnoManagement knoManagement) throws Exception {
		knoManagementDAO.deleteKnoManagement(knoManagement);
	}

}