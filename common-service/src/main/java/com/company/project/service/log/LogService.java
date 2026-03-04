package com.company.project.service.log;

import com.company.project.domain.log.LoginLog;
import com.company.project.domain.log.LoginLogRepository;
import com.company.project.service.log.dto.LogDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA 湲곕?濡쒓???????퉬???ы쁽?
 * - ?꾩옄???꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 ?⑹?? * - EgovAbstractServiceImpl ?곸냽 ?EgovLogService ?명꽣??씠???ы쁽
 */
@Service("egovLogService")
@Transactional(readOnly = true)
public class LogService extends EgovAbstractServiceImpl implements EgovLogService {

    private final LoginLogRepository loginLogRepository;

    public LogService(LoginLogRepository loginLogRepository) {
        this.loginLogRepository = loginLogRepository;
    }

    /**
     * 濡쒓???濡쒓??湲곕?     */
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
     * 理쒓??濡쒓???濡쒓??紐⑸?議고??     */
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