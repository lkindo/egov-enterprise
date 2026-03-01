package egovframework.com.dam.spe.spe.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.dam.spe.spe.service.EgovKnoSpecialistService;
import egovframework.com.dam.spe.spe.service.KnoSpecialist;
import egovframework.com.dam.spe.spe.service.KnoSpecialistVO;
import jakarta.annotation.Resource;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앹쟾臾멸??????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹쟾臾멸???????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹쟾臾멸???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2025.06.18  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(?꾨뱶 紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Service("KnoSpecialistService")
public class EgovKnoSpecialistServiceImpl extends EgovAbstractServiceImpl implements EgovKnoSpecialistService {

	@Resource(name = "KnoSpecialistDAO")
	private KnoSpecialistDAO knoSpecialistDAO;

	/**
	 * ?깅줉??吏?앹쟾臾멸? ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KnoSpecialistVO- 吏?앹쟾臾멸? VO
	 * @return String - 吏?앹쟾臾멸? 紐⑸줉
	 *
	 * @param KnoSpecialistVO
	 */
	@Override
	public List<KnoSpecialistVO> selectKnoSpecialistList(KnoSpecialistVO searchVO) throws Exception {
		return knoSpecialistDAO.selectKnoSpecialistList(searchVO);
	}

	/**
	 * 吏?앹쟾臾멸? 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * 
	 * @param KnoSpecialistVO - 吏?앹쟾臾멸? Vo
	 * @return int - 吏?앹쟾臾멸? ?좏깉 移댁슫????
	 *
	 * @param KnoSpecialistVO
	 */
	@Override
	public int selectKnoSpecialistTotCnt(KnoSpecialistVO searchVO) throws Exception {
		return knoSpecialistDAO.selectKnoSpecialistTotCnt(searchVO);
	}

	/**
	 * 吏?앹쟾臾멸? ?곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KonSpecialistVO - 吏?앹쟾臾멸? VO
	 * @return String - 吏?앹쟾臾멸? VO
	 *
	 * @param KonSpecialistVO
	 */
	@Override
	public KnoSpecialist selectKnoSpecialist(KnoSpecialist knoSpecialist) throws Exception {
		KnoSpecialist ksl = knoSpecialistDAO.selectKnoSpecialist(knoSpecialist);
		return ksl;
	}

	/**
	 * 吏?앹쟾臾멸? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param speNm - 吏?앹쟾臾멸? model
	 *
	 * @param speNm
	 */
	@Override
	public void insertKnoSpecialist(KnoSpecialist knoSpecialist) throws Exception {
		knoSpecialistDAO.insertKnoSpecialist(knoSpecialist);
	}

	/**
	 * 湲??깅줉 ??吏?앹쟾臾멸? ?뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param speNm - 吏?앹쟾臾멸? model
	 *
	 * @param speNm
	 */
	@Override
	public void updateKnoSpecialist(KnoSpecialist knoSpecialist) throws Exception {
		knoSpecialistDAO.updateKnoSpecialist(knoSpecialist);
	}

	/**
	 * 湲??깅줉??吏?앹쟾臾멸? ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param siteUrl - 吏?앹쟾臾멸? model
	 *
	 * @param speNm
	 */
	@Override
	public void deleteKnoSpecialist(KnoSpecialist knoSpecialist) throws Exception {
		knoSpecialistDAO.deleteKnoSpecialist(knoSpecialist);
	}

}
