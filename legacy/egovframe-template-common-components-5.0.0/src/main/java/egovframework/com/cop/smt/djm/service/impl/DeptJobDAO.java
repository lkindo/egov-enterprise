package egovframework.com.cop.smt.djm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.smt.djm.service.ChargerVO;
import egovframework.com.cop.smt.djm.service.DeptJob;
import egovframework.com.cop.smt.djm.service.DeptJobBx;
import egovframework.com.cop.smt.djm.service.DeptJobBxVO;
import egovframework.com.cop.smt.djm.service.DeptJobVO;
import egovframework.com.cop.smt.djm.service.DeptVO;

/**
 * 媛쒖슂 - 遺?쒖뾽臾댁뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜 - 遺?쒖뾽臾댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎. - 遺?쒖뾽臾댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * 
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:05
 * 
 *          <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 *          </pre>
 */
@Repository("DeptJobDAO")
public class DeptJobDAO extends EgovComAbstractDAO {

    /**
     * 二쇱뼱吏?議곌굔??留욌뒗 ?대떦?먮? 遺덈윭?⑤떎.
     * 
     * @param chargerVO
     * @return List
     */
    public List<ChargerVO> selectChargerList(ChargerVO chargerVO) {
        return selectList("DeptJobDAO.selectChargerList", chargerVO);
    }

    /**
     * ?대떦??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param chargerVO
     * @return int
     */
    public int selectChargerListCnt(ChargerVO chargerVO) {
        return selectOne("DeptJobDAO.selectChargerListCnt", chargerVO);
    }

    /**
     * 二쇱뼱吏?議곌굔??留욌뒗 遺?쒕? 遺덈윭?⑤떎.
     * 
     * @param deptVO
     * @return List
     */
    public List<DeptVO> selectDeptList(DeptVO deptVO) {
        return selectList("DeptJobDAO.selectDeptList", deptVO);
    }

    /**
     * 遺??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param deptVO
     * @return int
     */
    public int selectDeptListCnt(DeptVO deptVO) {
        return selectOne("DeptJobDAO.selectDeptListCnt", deptVO);
    }

    /**
     * 二쇱뼱吏?議곌굔??留욌뒗 遺?쒕? 遺덈윭?⑤떎.
     * 
     * @param orgnztId
     * @return String
     */
    public String selectDept(String orgnztId) {
        return selectOne("DeptJobDAO.selectDept", orgnztId);
    }

    /**
     * 二쇱뼱吏?議곌굔???곕Ⅸ 遺?쒖뾽臾댄븿 紐⑸줉??遺덈윭?⑤떎.
     * 
     * @param deptJobBxVO
     * @return List
     */
    public List<DeptJobBxVO> selectDeptJobBxList(DeptJobBxVO deptJobBxVO) {
        return selectList("DeptJobDAO.selectDeptJobBxList", deptJobBxVO);
    }

    /**
     * 二쇱뼱吏?議곌굔???곕Ⅸ 遺?쒖뾽臾댄븿 紐⑸줉 ?꾩껜瑜?遺덈윭?⑤떎.
     * 
     * @return List
     */
    public List<DeptJobBxVO> selectDeptJobBxListAll() {
        return selectList("DeptJobDAO.selectDeptJobBxListAll");
    }

    /**
     * 遺?쒖뾽臾댄븿 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param DeptJobBxVO
     * @return int
     * 
     * @param deptJobBxVO
     */
    public int selectDeptJobBxListCnt(DeptJobBxVO deptJobBxVO) {
        return selectOne("DeptJobDAO.selectDeptJobBxListCnt", deptJobBxVO);
    }

    /**
     * 二쇱뼱吏?議곌굔??留욌뒗 遺?쒖뾽臾댄븿??遺덈윭?⑤떎.
     * 
     * @param deptJobBxVO
     * @return DeptJobBxVO
     */
    public DeptJobBxVO selectDeptJobBx(DeptJobBxVO deptJobBxVO) {
        return selectOne("DeptJobDAO.selectDeptJobBx", deptJobBxVO);
    }

    /**
     * 遺?쒖뾽臾댄븿 ?뺣낫瑜??섏젙?쒕떎.
     * 
     * @param deptJobBxVO
     * @return int
     */
    public int updateDeptJobBx(DeptJobBx deptJobBx) {
        return update("DeptJobDAO.updateDeptJobBx", deptJobBx);
    }

    /**
     * 遺?쒖뾽臾댄븿???쒖떆?쒖꽌媛 以묐났?섎뒗吏瑜?議고쉶?쒕떎.
     * 
     * @param deptJobBxVO
     * @return int
     */
    public int selectDeptJobBxOrdr(DeptJobBxVO deptJobBxVO) {
        return selectOne("DeptJobDAO.selectDeptJobBxOrdr", deptJobBxVO);
    }

    /**
     * 遺?쒖뾽臾댄븿 ?뺣낫???쒖떆?쒖꽌瑜??섏젙?쒕떎. (?쒖떆?쒖꽌 利앷?)
     * 
     * @param deptJobBx
     * @return int
     */
    public int updateDeptJobBxOrdrUp(DeptJobBx deptJobBx) {
        return update("DeptJobDAO.updateDeptJobBxOrdrUp", deptJobBx);
    }

    /**
     * 遺?쒖뾽臾댄븿 ?뺣낫???쒖떆?쒖꽌瑜??섏젙?쒕떎. (?쒖떆?쒖꽌 媛먯냼)
     * 
     * @param deptJobBx
     * @return int
     */
    public int updateDeptJobBxOrdrDown(DeptJobBx deptJobBx) {
        return update("DeptJobDAO.updateDeptJobBxOrdrDown", deptJobBx);
    }

    /**
     * 遺?쒖뾽臾댄븿 ?뺣낫???쒖떆?쒖꽌瑜??섏젙?쒕떎.
     * 
     * @param deptJobBx
     * @return int
     */
    public int updateDeptJobBxOrdr(DeptJobBx deptJobBx) {
        return update("DeptJobDAO.updateDeptJobBxOrdr", deptJobBx);
    }

    /**
     * 二쇱뼱吏?議곌굔??留뚯”?섎뒗 ?꾩껜 遺?쒖뾽臾댄븿 ?뺣낫???쒖떆?쒖꽌瑜??섏젙?쒕떎.
     * 
     * @param deptJobBxVO
     * @return int
     */
    public int updateDeptJobBxOrdrAll(DeptJobBxVO deptJobBxVO) {
        return update("DeptJobDAO.updateDeptJobBxOrdrAll", deptJobBxVO);
    }

    /**
     * ?깅줉??遺?쒖뾽臾댄븿???쒖떆?쒖꽌瑜?議고쉶?쒕떎.
     * 
     * @param deptId
     * @return int
     */
    public int selectMaxDeptJobBxOrdr(String deptId) {
        return selectOne("DeptJobDAO.selectMaxDeptJobBxOrdr", deptId);
    }

    /**
     * 遺?쒖뾽臾댄븿 ?뺣낫瑜??깅줉?쒕떎.
     * 
     * @param DeptJobBx
     * 
     * @param deptJobBx
     */
    public int insertDeptJobBx(DeptJobBx deptJobBx) {
        return insert("DeptJobDAO.insertDeptJobBx", deptJobBx);
    }

    /**
     * 遺?쒕궡 遺?쒖뾽臾댄븿紐낆쓽 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param deptJobBx
     * @return int
     */
    public int selectDeptJobBxCheck(DeptJobBx deptJobBx) {
        return selectOne("DeptJobDAO.selectDeptJobBxCheck", deptJobBx);
    }

    /**
     * 遺?쒖뾽臾댄븿 ?뺣낫瑜???젣?쒕떎.
     * 
     * @param deptJobBx
     * @return int
     */
    public int deleteDeptJobBx(DeptJobBx deptJobBx) {
        return delete("DeptJobDAO.deleteDeptJobBx", deptJobBx);
    }

    /**
     * 二쇱뼱吏?議곌굔???곕Ⅸ 遺?쒖뾽臾?紐⑸줉??遺덈윭?⑤떎.
     * 
     * @param deptJobVO
     * @return List
     */
    public List<DeptJobVO> selectDeptJobList(DeptJobVO deptJobVO) {
        return selectList("DeptJobDAO.selectDeptJobList", deptJobVO);
    }

    /**
     * 遺?쒖뾽臾?紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
     * 
     * @param deptJobVO
     * @return int
     */
    public int selectDeptJobListCnt(DeptJobVO deptJobVO) {
        return selectOne("DeptJobDAO.selectDeptJobListCnt", deptJobVO);
    }

    /**
     * 二쇱뼱吏?議곌굔??留욌뒗 遺?쒖뾽臾대? 遺덈윭?⑤떎.
     * 
     * @param deptJobVO
     * @return DeptJobVO
     */
    public DeptJobVO selectDeptJob(DeptJobVO deptJobVO) {
        return selectOne("DeptJobDAO.selectDeptJob", deptJobVO);
    }

    /**
     * 遺?쒖뾽臾??뺣낫瑜??섏젙?쒕떎.
     * 
     * @param deptJob
     * @return int
     */
    public int updateDeptJob(DeptJob deptJob) {
        return update("DeptJobDAO.updateDeptJob", deptJob);
    }

    /**
     * 遺?쒖뾽臾??뺣낫瑜??깅줉?쒕떎.
     * 
     * @param deptJob
     * @return int
     */
    public int insertDeptJob(DeptJob deptJob) {
        return insert("DeptJobDAO.insertDeptJob", deptJob);
    }

    /**
     * 遺?쒖뾽臾??뺣낫瑜???젣?쒕떎.
     * 
     * @param deptJob
     * @return int
     */
    public int deleteDeptJob(DeptJob deptJob) {
        return delete("DeptJobDAO.deleteDeptJob", deptJob);
    }

}
