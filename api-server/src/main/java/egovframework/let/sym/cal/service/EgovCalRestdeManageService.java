package egovframework.let.sym.cal.service;

import java.util.List;

/**
 * 휴일에 대한 서비스 인터페이스를 정의한다
 */
public interface EgovCalRestdeManageService {

    List<?> selectNormalRestdePopup(Restde restde) throws Exception;

    List<?> selectAdministRestdePopup(Restde restde) throws Exception;

    List<?> selectNormalDayCal(Restde restde) throws Exception;

    List<?> selectNormalDayRestde(Restde restde) throws Exception;

    List<?> selectNormalMonthRestde(Restde restde) throws Exception;

    List<?> selectAdministDayCal(Restde restde) throws Exception;

    List<?> selectAdministDayRestde(Restde restde) throws Exception;

    List<?> selectAdministMonthRestde(Restde restde) throws Exception;

    void deleteRestde(Restde restde) throws Exception;

    void insertRestde(Restde restde) throws Exception;

    Restde selectRestdeDetail(Restde restde) throws Exception;

    List<?> selectRestdeList(RestdeVO searchVO) throws Exception;

    int selectRestdeListTotCnt(RestdeVO searchVO) throws Exception;

    void updateRestde(Restde restde) throws Exception;
}
