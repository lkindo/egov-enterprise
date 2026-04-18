package nuri.foundation.service.log;

import nuri.foundation.domain.common.BaseSearchDto;
import nuri.foundation.domain.log.LoginLog;
import nuri.foundation.domain.log.LoginLogRepository;
import nuri.foundation.service.log.dto.LoginLogDto;
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
 * 로그인 로그 관리 서비스
 */
@Service("loginLogManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoginLogManageService {

    private final LoginLogRepository loginLogRepository;

    /**
     * 로그인 로그 목록 조회
     */
    public List<LoginLogDto> selectLoginLogList(BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<LoginLog> page = loginLogRepository.findAll(pageable);
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 로그인 로그 목록 건수 조회
     */
    public int selectLoginLogListTotCnt(BaseSearchDto searchVO) {
        return (int) loginLogRepository.count();
    }

    /**
     * 로그인 로그 상세 조회
     */
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
