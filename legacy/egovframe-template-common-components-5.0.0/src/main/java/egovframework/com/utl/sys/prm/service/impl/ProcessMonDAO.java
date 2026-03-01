package egovframework.com.utl.sys.prm.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.sys.prm.service.ProcessMon;
import egovframework.com.utl.sys.prm.service.ProcessMonLog;
import egovframework.com.utl.sys.prm.service.ProcessMonLogVO;
import egovframework.com.utl.sys.prm.service.ProcessMonVO;

/**
 * 媛쒖슂
 * - PROCESS紐⑤땲?곕쭅?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - PROCESS紐⑤땲?곕쭅??????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - PROCESS紐⑤땲?곕쭅??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author 諛뺤쥌??
 * @version 1.0
 * @created 08-9-2010 ?ㅽ썑 3:54:46
 */

@Repository("ProcessMonDAO")
public class ProcessMonDAO extends EgovComAbstractDAO {

	/**
     * ?깅줉??PROCESS紐⑤땲?곕쭅 紐⑸줉??議고쉶?쒕떎.
     *
     * @param processMonVO - PROCESS紐⑤땲?곕쭅 Vo
     * @return List - PROCESS紐⑤땲?곕쭅 紐⑸줉
     */
    public List<ProcessMonVO> selectProcessMonList(ProcessMonVO processMonVO) throws Exception {
        return selectList("ProcessMonDAO.selectProcessMonList", processMonVO);
    }

    /**
     * PROCESS紐⑤땲?곕쭅 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
     *
     * @param ProcessMonVO - PROCESS紐⑤땲?곕쭅 Vo
     * @return int - PROCESS紐⑤땲?곕쭅 ?좏깉 移댁슫????
     */
    public int selectProcessMonTotCnt(ProcessMonVO processMonVO) throws Exception {
        return selectOne("ProcessMonDAO.selectProcessMonTotCnt", processMonVO);
    }

    /**
     * ?깅줉??PROCESS紐⑤땲?곕쭅???곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param processMonVO - PROCESS紐⑤땲?곕쭅 Vo
     * @return processMonVO - PROCESS紐⑤땲?곕쭅 Vo
     */
    public ProcessMonVO selectProcessMon(ProcessMonVO processMonVO) throws Exception {
        return selectOne("ProcessMonDAO.selectProcessMon", processMonVO);
    }

    /**
     * PROCESS紐⑤땲?곕쭅 ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
     *
     * @param processNm - PROCESS紐⑤땲?곕쭅 model
     * @return int - ?깅줉 寃곌낵
     */
    public int insertProcessMon(ProcessMon processMon) throws Exception {
        return insert("ProcessMonDAO.insertProcessMon", processMon);
    }

    /**
     * 湲??깅줉??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜??섏젙?쒕떎.
     *
     * @param processNm - PROCESS紐⑤땲?곕쭅 model
     * @return int - ?섏젙 寃곌낵
     */
    public int updateProcessMon(ProcessMon processMon) throws Exception {
        return update("ProcessMonDAO.updateProcessMon", processMon);
    }

    /**
     * 湲??깅줉??PROCESS紐⑤땲?곕쭅 ?뺣낫瑜???젣?쒕떎.
     *
     * @param processNm - PROCESS紐⑤땲?곕쭅 model
     * @return int - ??젣 寃곌낵
     */
    public int deleteProcessMon(ProcessMon processMon) throws Exception {
        return delete("ProcessMonDAO.deleteProcessMon", processMon);
    }

    /**
     * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇 紐⑸줉??議고쉶?쒕떎.
     *
     * @param ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 VO
     * @return List<ProcessMonLogVO> - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 List
     */
    public List<ProcessMonLogVO> selectProcessMonLogList(ProcessMonLogVO processMonLogVO) throws Exception {
        return selectList("ProcessMonDAO.selectProcessMonLogList", processMonLogVO);
    }

    /**
     * PROCESS紐⑤땲?곕쭅濡쒓렇 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
     *
     * @param ProcessMonVO - PROCESS紐⑤땲?곕쭅濡쒓렇 Vo
     * @return int - PROCESS紐⑤땲?곕쭅濡쒓렇 ?좏깉 移댁슫????
     */
    public int selectProcessMonLogTotCnt(ProcessMonLogVO processMonLogVO) throws Exception {
        return selectOne("ProcessMonDAO.selectProcessMonLogTotCnt", processMonLogVO);
    }

    /**
     * ?꾨줈?몄뒪 紐⑤땲?곕쭅濡쒓렇???곸꽭?뺣낫瑜?議고쉶?쒕떎.
     *
     * @param ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 model
     * @return ProcessMonVO - ?꾨줈?몄뒪紐⑤땲?곕쭅濡쒓렇 model
     */
    public ProcessMonLogVO selectProcessMonLog(ProcessMonLogVO processMonLogVO) {
        return selectOne("ProcessMonDAO.selectProcessMonLog", processMonLogVO);
    }

    /**
     * PROCESS紐⑤땲?곕쭅濡쒓렇 ????뺣낫瑜??깅줉?쒕떎.
     *
     * @param ProcessMonLog - ?뚯씪?쒖뒪?쒕え?덊꽣留????model
     * @return int - ?깅줉 寃곌낵
     */
    public int insertProcessMonLog(ProcessMonLog processMonLog) throws Exception {
        return insert("ProcessMonDAO.insertProcessMonLog", processMonLog);
    }

    /**
     * ?꾨줈?몄뒪 紐⑤땲?곕쭅 寃곌낵 ?뺣낫瑜??섏젙?쒕떎.
     *
     * @param ProcessMon - ?꾨줈?몄뒪 ???model
     * @return int - ?섏젙 寃곌낵
     */
    public int updateProcessMonSttus(ProcessMon processMon) throws Exception {
        return update("ProcessMonDAO.updateProcessMonSttus", processMon);
    }
}
