package egovframework.com.uss.ion.rmm.service;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

/**
 * 媛쒖슂
 * - ?꾩튂?뺣낫?곌퀎?????Service Interface瑜??뺤쓽?쒕떎.
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

public interface EgovRoughMapService {

    /**
     * 嫄대Ъ???꾩튂?뺣낫 紐⑸줉??議고쉶?섎뒗 Service interface 硫붿꽌??
     * @param roughMapVO
     * @return Map<String, Object> 二쇰?嫄대Ъ ?꾩튂?뺣낫 由ъ뒪??
     * @throws Exception
    */
    List<EgovMap> selectRoughMapList(RoughMapDefaultVO searchVO) throws Exception;

    /**
     * 湲 珥?媛쒖닔瑜?議고쉶?쒕떎
     * @param searchVO
     * @return 珥?媛쒖닔
     */
    int selectRoughMapListTotCnt(RoughMapDefaultVO searchVO);

    /**
     * 嫄대Ъ???꾩튂?뺣낫瑜??곸꽭議고쉶?섎뒗 Service interface 硫붿꽌??
     * @param roughMapVO
     * @return RoughMap 二쇰?嫄대Ъ ?꾩튂?뺣낫
     * @throws Exception
    */
    RoughMapVO selectRoughMapDetail(RoughMapVO roughMapVO) throws Exception;

    /**
     * 嫄대Ъ???꾩튂?뺣낫瑜??깅줉?섎뒗 Service interface 硫붿꽌??
     * @param roughMap
     * @throws Exception
    */
    void insertRoughMap(RoughMapVO roughMap) throws Exception;

    /**
     * 嫄대Ъ???꾩튂?뺣낫瑜??섏젙?섎뒗 Service interface 硫붿꽌??
     * @param roughMap
     * @throws Exception
    */
    void updateRoughMap(RoughMapVO roughMap) throws Exception;

    /**
     * 嫄대Ъ???꾩튂?뺣낫瑜???젣?섎뒗 Service interface 硫붿꽌??
     * @param roughMap
     * @throws Exception
    */
    void deleteRoughMap(RoughMapVO roughMap) throws Exception;

}
