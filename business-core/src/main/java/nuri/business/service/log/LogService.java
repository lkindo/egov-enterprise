package nuri.business.service.log;

import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.log.LoginLog;
import nuri.business.domain.log.LoginLogRepository;
import nuri.business.service.log.dto.LogDto;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA 기반 로그 관리 서비스 구현체
 * - 전자정부 프레임워크 5.0 호환성 인증 요건 충실
 * - BaseAbstractService 상속으로 중복 코드 제거
 */
@Service
@Transactional(readOnly = true)
public class LogService extends BaseAbstractService {

    private final LoginLogRepository loginLogRepository;

    public LogService(LoginLogRepository loginLogRepository) {
        this.loginLogRepository = required(loginLogRepository, "LoginLogRepository 는 null 일 수 없습니다");
    }

    /**
     * 로그인 로그 기록 (비동기 처리)
     */
    @Async("logExecutor")
    @Transactional
    public void logLogin(String userId, String ip, String mthd, String errAt, String errCode) {

        LoginLog log = LoginLog.builder()
                .logId(nuri.foundation.core.util.IdGenerationUtil.generateId("LGN_", 16))
                .userId(userId)
                .lgnIpAddr(ip)
                .cntnMthdCd(mthd)
                .errOcrnYn(errAt)
                .errCd(errCode)
                .build();
        loginLogRepository.save(required(log, "로그 엔티티는 null 일 수 없습니다"));
    }

    /**
     * 최근 로그인 로그 목록 조회
     */
    public List<LogDto> getRecentLoginLogs() {
        return loginLogRepository.findTop100ByOrderByCrtDtDesc().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private LogDto convertToDto(LoginLog log) {
        return LogDto.builder()
                .logId(log.getLogId())
                .conectMthd(log.getCntnMthdCd())
                .conectId(log.getUserId())
                .conectIp(log.getLgnIpAddr())
                .creatDt(log.getCrtDt())
                .errOccrrAt(log.getErrOcrnYn())
                .build();
    }
}
