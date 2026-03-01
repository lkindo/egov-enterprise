package egovframework.com.uss.ion.rmm.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.rmm.service.RoughMapDefaultVO;
import egovframework.com.uss.ion.rmm.service.RoughMapVO;

/**
 * 媛쒖슂
 * - 嫄대Ъ ?꾩튂?뺣낫?????DB?곸쓽 ?묎렐, 蹂寃쎌쓣 泥섎━?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 嫄대Ъ ?꾩튂?뺣낫??????깅줉, ?섏젙, ??젣 湲곕뒫???쒓났?쒕떎.
 * - 嫄대Ъ ?꾩튂?뺣낫??議고쉶湲곕뒫? 紐⑸줉, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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

@Repository("roughMapDAO")
public class EgovRoughMapDAO extends EgovComAbstractDAO {

    /**
     * ?쎈룄 紐⑸줉??議고쉶?쒕떎.
     * @param roughMapVO
     * @return List<RoughMapVO> 嫄대Ъ ?꾩튂?뺣낫 由ъ뒪??
     * @throws Exception
    */
	public List<EgovMap> selectRoughMapList(RoughMapDefaultVO searchVO) throws Exception {
        return selectList("RoughMapDAO.selectRoughMapList", searchVO);
    }

    /**
     * ?쎈룄 紐⑸줉??嫄댁닔瑜?議고쉶 ?쒕떎.
     * @param roughMapVO
     * @return int 嫄대Ъ ?꾩튂?뺣낫 紐⑸줉 嫄댁닔
     * @throws Exception
    */
    public int selectRoughMapListTotCnt(RoughMapDefaultVO searchVO){
        return (Integer)selectOne("RoughMapDAO.selectRoughMapListTotCnt", searchVO);
    }

    /**
     * ?쎈룄瑜?議고쉶?쒕떎.
     * @param roughMapVO
     * @return RoughMap
     * @throws Exception
    */
    public RoughMapVO selectRoughMap(RoughMapVO roughMapVO) throws Exception {
        return (RoughMapVO)selectOne("RoughMapDAO.selectRoughMapDetail", roughMapVO);
    }

    /**
     * ?쎈룄瑜?DB???깅줉?쒕떎.
     *
     * @param roughMap
     * @throws Exception
     */
    public void insertRoughMap(RoughMapVO roughMap) throws Exception {
        insert("RoughMapDAO.insertRoughMap", roughMap);
    }

    /**
     * ?쎈룄瑜?DB?먯꽌 ?섏젙?쒕떎.
     *
     * @param roughMap
     * @throws Exception
     */
    public void updateRoughMap(RoughMapVO roughMap) throws Exception {
            update("RoughMapDAO.updateRoughMap", roughMap);
    }

    /**
     * ?쎈룄瑜?DB?먯꽌 ??젣?쒕떎.
     *
     * @param roughMap
     * @throws Exception
     */
    public void deleteRoughMap(RoughMapVO roughMap) throws Exception {
            delete("RoughMapDAO.deleteRoughMap", roughMap);
    }
}
