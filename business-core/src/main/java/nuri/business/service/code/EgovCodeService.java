package nuri.business.service.code;

import nuri.business.service.code.dto.CodeDto;
import java.util.List;

/**
 * 공통코드 서비스 인터페이스
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건을 충족하기 위한 인터페이스 정의
 */
public interface EgovCodeService {

    /**
     * 상세 코드 리스트 조회
     */
    List<CodeDto> getDetailCodeList(@org.springframework.lang.NonNull String codeGroupId);

    /**
     * 전체 활성 코드 조회
     */
    List<CodeDto> getAllActiveCodes();
}
