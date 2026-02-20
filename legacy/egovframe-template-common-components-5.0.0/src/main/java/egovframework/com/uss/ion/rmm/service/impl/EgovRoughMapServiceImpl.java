package egovframework.com.uss.ion.rmm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.uss.ion.rmm.service.EgovRoughMapService;
import egovframework.com.uss.ion.rmm.service.RoughMapDefaultVO;
import egovframework.com.uss.ion.rmm.service.RoughMapVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?꾩튂?뺣낫?곌퀎?????Service Interface瑜?援ы쁽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 嫄대Ъ???꾩튂?뺣낫??????깅줉, ?섏젙, ??젣, ?곸꽭議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 嫄대Ъ???꾩튂?뺣낫??議고쉶湲곕뒫? 紐⑸줉, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 *
 * @author ?μ갔??
 * @since 2014.08.27
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??		?섏젙??	?섏젙?댁슜
 *  -----------		------		---------
 *   2014.08.27		?μ갔??	理쒖큹 ?앹꽦
 *
 * </pre>
 */

@Service("EgovRoughMapService")
public class EgovRoughMapServiceImpl extends EgovAbstractServiceImpl implements EgovRoughMapService {

    /** RoughMapDAO */
    @Resource(name="roughMapDAO")
    private EgovRoughMapDAO roughMapDAO;

    /** ID Generation */
    @Resource(name="egovRoughMapIdGnrService")
    private EgovIdGnrService idgenService;

    /**
     * 嫄대Ъ???꾩튂?뺣낫 紐⑸줉??議고쉶?쒕떎.
     * @param roughMapVO
     * @return Map<String, Object> 嫄대Ъ ?꾩튂?뺣낫 議고쉶寃곌낵 由ъ뒪?? 議고쉶嫄댁닔
     * @throws Exception
    */
    @Override
	public List<EgovMap> selectRoughMapList(RoughMapDefaultVO searchVO) throws Exception {
    	return roughMapDAO.selectRoughMapList(searchVO);
    }

	@Override
	public int selectRoughMapListTotCnt(RoughMapDefaultVO searchVO) {
		return roughMapDAO.selectRoughMapListTotCnt(searchVO);
	}

    /**
     * 嫄대Ъ???꾩튂?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param roughMapVO
     * @return Geolocation 嫄대Ъ???꾩튂?뺣낫
     * @throws Exception
    */
    @Override
	public RoughMapVO selectRoughMapDetail(RoughMapVO roughMapVO) throws Exception {
        return roughMapDAO.selectRoughMap(roughMapVO);
    }

    /**
     * 嫄대Ъ???꾩튂?뺣낫瑜?DB???깅줉?쒕떎.
     * @param roughMap
     * @throws Exception
    */
    @Override
	public void insertRoughMap(RoughMapVO roughMap) throws Exception {
    	String roughMapId = idgenService.getNextStringId();

        roughMap.setRoughMapId(roughMapId);
        roughMapDAO.insertRoughMap(roughMap);
    }

    /**
     * 嫄대Ъ???꾩튂?뺣낫瑜??섏젙?쒕떎.
     * @param roughMap
     * @throws Exception
    */
    @Override
	public void updateRoughMap(RoughMapVO roughMap) throws Exception {
        roughMapDAO.updateRoughMap(roughMap);
    }

    /**
     * 嫄대Ъ???꾩튂?뺣낫瑜???젣?쒕떎.
     * @param roughMap
     * @throws Exception
    */
    @Override
	public void deleteRoughMap(RoughMapVO roughMap) throws Exception {
        roughMapDAO.deleteRoughMap(roughMap);
    }
}
