package com.company.project.foundation.service.log;

import com.company.project.foundation.domain.log.LoginLog;
import com.company.project.foundation.domain.log.LoginLogRepository;
import com.company.project.foundation.service.log.dto.LogDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA 기반 로그 관리 서비스 구현체
 * - 전자정부 프레임워크 5.0 호환성 인증 요건 충실
 * - EgovAbstractServiceImpl 상속 및 EgovLogService 인터페이스 구현
 */
@Service("egovLogService")
@Transactional(readOnly = true)
public class LogService extends EgovAbstractServiceImpl implements EgovLogService {

    private final LoginLogRepository loginLogRepository;

    public LogService(LoginLogRepository loginLogRepository) {
        this.loginLogRepository = loginLogRepository;
    }

    /**
     * 로그인 로그 기록
     */
    @Override
    @Transactional
    public void logLogin(String userId, String ip, String mthd, String errAt, String errCode) {
        LoginLog log = LoginLog.builder()
                .logId("LGN_" + UUID.randomUUID().toString().substring(0, 16))
                .loginId(userId)
                .loginIp(ip)
                .loginMthd(mthd)
                .errOccrrAt(errAt)
                .errorCode(errCode)
                .creatDt(java.time.LocalDateTime.now())
                .build();
        loginLogRepository.save(Objects.requireNonNull(log));
    }

    /**
     * 최근 로그인 로그 목록 조회
     */
    @Override
    public List<LogDto> getRecentLoginLogs() {
        return loginLogRepository.findTop100ByOrderByCreatDtDesc().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private LogDto convertToDto(LoginLog log) {
        return LogDto.builder()
                .logId(log.getLogId())
                .conectMthd(log.getLoginMthd())
                .conectId(log.getLoginId())
                .conectIp(log.getLoginIp())
                .creatDt(log.getCreatDt())
                .errOccrrAt(log.getErrOccrrAt())
                .build();
    }
}
