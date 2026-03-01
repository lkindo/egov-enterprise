package egovframework.com.dam.per.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.dam.per.service.EgovKnoPersonalService;
import egovframework.com.dam.per.service.KnoPersonal;
import egovframework.com.dam.per.service.KnoPersonalVO;
import jakarta.annotation.Resource;


/**
 * 媛쒖슂
 * - 媛쒖씤吏?앹젙蹂댁뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 媛쒖씤吏?앹젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 媛쒖씤吏?앹젙蹂댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 12-8-2010 ?ㅽ썑 3:44:41
 */

@Service("KnoPersonalService")
public class EgovKnoPersonalServiceImpl extends EgovAbstractServiceImpl implements EgovKnoPersonalService {

	@Resource(name="KnoPersonalDAO")
	private KnoPersonalDAO knoPersonalDAO;

    /** ID Generation */
	@Resource(name="egovDamManageIdGnrService")
	private EgovIdGnrService idgenService;

	/**
	 * ?깅줉??媛쒖씤吏???뺣낫瑜?議고쉶 ?쒕떎.
	 * @param KnoPersonalVO - 媛쒖씤吏??VO
	 * @return String - 媛쒖씤吏?앹젙蹂?紐⑸줉
	 *
	 * @param KnoPersonalVO
	 */
	@Override
	public List<KnoPersonalVO> selectKnoPersonalList(KnoPersonalVO searchVO) throws Exception {
		return knoPersonalDAO.selectKnoPersonalList(searchVO);
	}

	/**
	 * 媛쒖씤吏??紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param KnoPersonalVO - 媛쒖씤吏??Vo
	 * @return int - 媛쒖씤吏???좏깉 移댁슫????
	 *
	 * @param KnoPersonalVO
	 */
	@Override
	public int selectKnoPersonalTotCnt(KnoPersonalVO searchVO) throws Exception {
		return knoPersonalDAO.selectKnoPersonalTotCnt(searchVO);
	}

	/**
	 * 媛쒖씤吏?앹젙蹂??곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * @param KnoPersonalVO - 媛쒖씤吏?앹젙蹂?VO
	 * @return String - 媛쒖씤吏??VO
	 *
	 * @param KnoPersonalVO
	 */
	@Override
	public KnoPersonal selectKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		KnoPersonal kpm = knoPersonalDAO.selectKnoPersonal(knoPersonal);
		return kpm;
	}

	/**
	 * 媛쒖씤吏???뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 *
	 * @param KnoNm
	 */
	@Override
	public void insertKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		egovLogger.debug(knoPersonal.toString());

		String knoId = idgenService.getNextStringId();
		knoPersonal.setKnoId(knoId);

		knoPersonalDAO.insertKnoPersonal(knoPersonal);
	}

	/**
	 * 湲??깅줉 ??媛쒖씤吏???뺣낫瑜??섏젙 ?쒕떎.
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 *
	 * @param KnoNm
	 */
	@Override
	public void updateKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		knoPersonalDAO.updateKnoPersonal(knoPersonal);
	}

	/**
	 * 湲??깅줉??媛쒖씤吏???뺣낫瑜???젣?쒕떎.
	 * @param KnoNm - 媛쒖씤吏?앹젙蹂?model
	 *
	 * @param KnoNm
	 */
	@Override
	public void deleteKnoPersonal(KnoPersonal knoPersonal) throws Exception {
		knoPersonalDAO.deleteKnoPersonal(knoPersonal);
	}

}
