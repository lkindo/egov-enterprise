package nuri.business.service.log;

import nuri.business.service.log.dto.LogDto;
import java.util.List;

/**
 * 로그 관리 서비스 인터페이스
 * - 전자정부 프레임워크 5.0 호환성 인증 요건 충실을 위한 인터페이스 정의
 */
public interface EgovLogService {

    /**
     * 로그인 로그 기록
     */
    void logLogin(String userId, String ip, String mthd, String errAt, String errCode);

    /**
     * 최근 로그인 로그 목록 조회
     */
    List<LogDto> getRecentLoginLogs();
}
