package nuri.foundation.service.log;

import nuri.foundation.core.service.BaseAbstractService;
import nuri.foundation.domain.log.LoginLog;
import nuri.foundation.domain.log.LoginLogRepository;
import nuri.foundation.service.log.dto.LoginLogDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.foundation.domain.common.BaseSearchDto;
import org.springframework.lang.NonNull;

@Service("egovLoginLogManageService")
public class LoginLogManageService extends BaseAbstractService implements EgovLoginLogManageService {

    private final LoginLogRepository loginLogRepository;

    public LoginLogManageService(LoginLogRepository loginLogRepository) {
        this.loginLogRepository = required(loginLogRepository, "LoginLogRepository 는 null 일 수 없습니다");
    }

    @Override
    @Transactional
    public void logInsertLoginLog(@NonNull LoginLogDto dto) {
        LoginLog entity = LoginLog.builder()
                .logId(dto.getLogId())
                .userId(dto.getLoginId())
                .lgnIpAddr(dto.getLoginIp())
                .cntnMthdCd(dto.getLoginMthd())
                .errOcrnYn(dto.getErrOccrrAt())
                .errCd(dto.getErrorCode())
                .build();
        loginLogRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    @Override
    public List<LoginLogDto> selectLoginLogList(@NonNull BaseSearchDto searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);
        Page<LoginLog> page = loginLogRepository.searchLoginLogs(
                searchVO.getSearchKeyword(), searchVO.getSearchBgnDe(), searchVO.getSearchEndDe(),
                required(pageable, "pageable 는 null 일 수 없습니다"));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public int selectLoginLogListTotCnt(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) loginLogRepository.searchLoginLogs(
                searchVO.getSearchKeyword(), searchVO.getSearchBgnDe(), searchVO.getSearchEndDe(), pageable)
                .getTotalElements();
    }

    @Override
    public LoginLogDto selectLoginLogDetail(@NonNull LoginLogDto dto) {
        return loginLogRepository.findById(required(dto.getLogId(), "dto.getLogId() 는 null 일 수 없습니다"))
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
                .creatDt(entity.getCreatedDate() != null ? entity.getCreatedDate().toString() : null)
                .build();
    }
}
