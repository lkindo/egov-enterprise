package nuri.business.service.log;

import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.log.LoginLog;
import nuri.business.domain.log.LoginLogRepository;
import nuri.business.service.log.dto.LoginLogDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import nuri.business.domain.common.BaseSearchDto;
import org.springframework.lang.NonNull;

@Service
@Transactional(readOnly = true)
public class LoginLogManageService extends BaseAbstractService {

    private final LoginLogRepository loginLogRepository;

    public LoginLogManageService(LoginLogRepository loginLogRepository) {
        this.loginLogRepository = required(loginLogRepository, "LoginLogRepository 는 null 일 수 없습니다");
    }

    @Transactional
    public void logInsertLoginLog(@NonNull LoginLogDto dto) {
        LoginLog entity = LoginLog.builder()
                .userId(dto.getLoginId())
                .lgnIpAddr(dto.getLoginIp())
                .cntnMthdCd(dto.getLoginMthd())
                .errOcrnYn(dto.getErrOccrrAt())
                .errCd(dto.getErrorCode())
                .build();
        loginLogRepository.save(required(entity, "entity 는 null 일 수 없습니다"));
    }

    public List<LoginLogDto> selectLoginLogList(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = searchVO.toPageable();
        Page<LoginLog> page = loginLogRepository.searchLoginLogs(
                searchVO.getSearchKeyword(), searchVO.getSearchKeywordFrom(), searchVO.getSearchKeywordTo(),
                required(pageable, "pageable 는 null 일 수 없습니다"));
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    public int selectLoginLogListTotCnt(@NonNull BaseSearchDto searchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        return (int) loginLogRepository.searchLoginLogs(
                searchVO.getSearchKeyword(), searchVO.getSearchKeywordFrom(), searchVO.getSearchKeywordTo(), pageable)
                .getTotalElements();
    }

    public LoginLogDto selectLoginLogDetail(@NonNull Long lgnSn) {
        return loginLogRepository.findById(lgnSn)
                .map(this::toDto)
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.RESOURCE_NOT_FOUND, "로그인 로그를 찾을 수 없습니다: " + lgnSn));
    }

    private LoginLogDto toDto(LoginLog entity) {
        return LoginLogDto.builder()
                .lgnSn(entity.getLgnSn())
                .loginId(entity.getUserId())
                .loginIp(entity.getLgnIpAddr())
                .loginMthd(entity.getCntnMthdCd())
                .errOccrrAt(entity.getErrOcrnYn())
                .errorCode(entity.getErrCd())
                .creatDt(entity.getCrtDt() != null ? entity.getCrtDt().toString() : null)
                .build();
    }
}
