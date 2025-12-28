package egovframework.let.uss.olp.qri.service;

import java.util.Map;
import java.util.List;

/**
 * 설문조사 서비스 인터페이스
 */
public interface EgovQustnrRespondInfoService {

    /**
     * 설문응답결과 목록을 조회한다.
     * 
     * @param searchVO
     * @return List
     * @throws Exception
     */
    List<?> selectQustnrRespondInfoList(QustnrRespondInfoVO searchVO) throws Exception;

    /**
     * 설문응답결과를 상세조회한다.
     * 
     * @param searchVO
     * @return Map
     * @throws Exception
     */
    Map<?, ?> selectQustnrRespondInfoDetail(QustnrRespondInfoVO searchVO) throws Exception;

    /**
     * 설문응답결과를 등록한다.
     * 
     * @param qustnrRespondInfoVO
     * @throws Exception
     */
    void insertQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception;

    /**
     * 객관식 통계를 조회한다.
     * 
     * @param map
     * @return List
     * @throws Exception
     */
    List<?> selectQustnrRespondInfoManageStatistics1(Map<?, ?> map) throws Exception;

    /**
     * 주관식 통계를 조회한다.
     * 
     * @param map
     * @return List
     * @throws Exception
     */
    List<?> selectQustnrRespondInfoManageStatistics2(Map<?, ?> map) throws Exception;

    /**
     * 설문응답결과 총 갯수를 조회한다.
     * 
     * @param searchVO
     * @return int
     * @throws Exception
     */
    int selectQustnrRespondInfoListCnt(QustnrRespondInfoVO searchVO) throws Exception;
}
