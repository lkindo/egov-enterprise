package com.company.project.service.code;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeRepository;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommonCodeService extends EgovAbstractServiceImpl {

    private final CommonCodeRepository commonCodeRepository;

    @Transactional(readOnly = true)
    public List<CommonCodeDto> getCodesByGroup(String codeGroupId) {
        return commonCodeRepository.findByCodeGroupIdAndUseAt(codeGroupId, "Y").stream()
                .map(CommonCodeDto::from)
                .collect(Collectors.toList());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public CommonCodeDto createCode(CommonCodeSaveRequest request) {
        egovLogger.info("Creating common code: {}/{}", request.codeGroupId(), request.code());

        if (commonCodeRepository
                .findById(new com.company.project.domain.code.CommonCodeId(request.codeGroupId(), request.code()))
                .isPresent()) {
            throw new BusinessException(ErrorCode.DUPLICATE_CODE);
        }

        CommonCode code = CommonCode.builder()
                .codeGroupId(request.codeGroupId())
                .code(request.code())
                .codeNm(request.codeNm())
                .codeDc(request.codeDc())
                .useAt(request.useAt())
                .build();

        return CommonCodeDto.from(commonCodeRepository.save(code));
    }
}
