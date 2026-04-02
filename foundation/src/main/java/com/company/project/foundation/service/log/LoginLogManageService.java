package com.company.project.foundation.service.log;

import com.company.project.foundation.domain.log.LoginLog;
import com.company.project.foundation.domain.log.LoginLogRepository;
import com.company.project.foundation.service.log.dto.LoginLogDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 濡쒓濡쒓퉬??
 */
@Service("loginLogManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoginLogManageService {

    private final LoginLogRepository loginLogRepository;

    /**
     * 濡쒓濡쒓紐⑸議고??     */
    public List<LoginLogDto> selectLoginLogList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<LoginLog> page = loginLogRepository.findAll(pageable);
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 濡쒓濡쒓紐⑸嫄댁??     */
    public int selectLoginLogListTotCnt(ComDefaultVO searchVO) {
        return (int) loginLogRepository.count();
    }

    /**
     * 濡쒓濡쒓???곸꽭 議고??     */
    public LoginLogDto selectLoginLog(String logId) {
        return loginLogRepository.findById(Objects.requireNonNull(logId))
                .map(this::toDto)
                .orElse(null);
    }

    private LoginLogDto toDto(LoginLog entity) {
        return LoginLogDto.builder()
                .logId(entity.getLogId())
                .loginId(entity.getLoginId())
                .loginIp(entity.getLoginIp())
                .loginMthd(entity.getLoginMthd())
                .errOccrrAt(entity.getErrOccrrAt())
                .errorCode(entity.getErrorCode())
                .creatDt(entity.getCreatDt() != null
                        ? entity.getCreatDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                        : null)
                .build();
    }
}
