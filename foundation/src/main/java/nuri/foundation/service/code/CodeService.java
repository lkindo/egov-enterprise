package nuri.foundation.service.code;

import nuri.foundation.core.service.BaseAbstractService;
import nuri.foundation.domain.code.CommonCode;
import nuri.foundation.domain.code.CommonCodeRepository;
import nuri.foundation.service.code.dto.CodeDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.stream.Collectors;

/**
 * JPA 기반 공통코드 서비스 구현체
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건 충족
 * - EgovCodeService 인터페이스 구현
 */
@Service("egovCodeService")
@Transactional(readOnly = true)
public class CodeService extends BaseAbstractService implements EgovCodeService {

    private final CommonCodeRepository commonCodeRepository;

    public CodeService(CommonCodeRepository commonCodeRepository) {
        this.commonCodeRepository = required(commonCodeRepository, "commonCodeRepository 은 null 일 수 없습니다");
    }

    /**
     * 특정 코드그룹 ID(CODE_ID)에 대한 상세 코드 목록 조회
     */
    @Override
    public List<CodeDto> getDetailCodeList(@NonNull String codeGroupId) {
        return commonCodeRepository.findByCodeGroupIdAndUseYn(required(codeGroupId, "codeGroupId 는 null 일 수 없습니다"), "Y")
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 전체 활성 코드 목록 조회
     */
    @Override
    public List<CodeDto> getAllActiveCodes() {
        return commonCodeRepository.findAll().stream()
                .filter(code -> "Y".equals(code.getUseYn()))
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private CodeDto convertToDto(CommonCode code) {
        return CodeDto.builder()
                .codeGroupId(code.getCodeGroupId())
                .code(code.getCode())
                .codeNm(code.getCodeNm())
                .codeDc(code.getCodeDc())
                .useYn(code.getUseYn())
                .build();
    }
}
