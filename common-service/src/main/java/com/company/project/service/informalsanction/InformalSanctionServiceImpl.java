package com.company.project.service.informalsanction;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.informalsanction.InformalSanction;
import com.company.project.domain.informalsanction.InformalSanctionRepository;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.informalsanction.dto.InformalSanctionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InformalSanctionServiceImpl implements InformalSanctionService {

    private final InformalSanctionRepository informalSanctionRepository;
    private final EgovCommonCodeService commonCodeService;

    @Override
    public Page<InformalSanctionDto> getInformalSanctionList(String applicantId, Pageable pageable) {
        Page<InformalSanction> result;
        if (applicantId != null && !applicantId.isEmpty()) {
            result = informalSanctionRepository.findByApplicantId(applicantId, pageable);
        } else {
            result = informalSanctionRepository.findAll(pageable);
        }
        return result.map(this::convertToDto);
    }

    @Override
    public Page<InformalSanctionDto> getReceivedInformalSanctionList(String sanctionerId, Pageable pageable) {
        return informalSanctionRepository
                .findBySanctionerId(Objects.requireNonNull(sanctionerId), Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public InformalSanctionDto getInformalSanction(String informalSanctionId) {
        InformalSanction entity = informalSanctionRepository.findById(Objects.requireNonNull(informalSanctionId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        InformalSanctionDto dto = convertToDto(entity);

        // 코드명 설정
        List<CommonCodeDto> jobCodes = commonCodeService.getCodesByGroup("COM075");
        dto.setJobSeNm(jobCodes.stream()
                .filter(c -> c.code().equals(dto.getJobSeCode()))
                .findFirst().map(CommonCodeDto::codeNm).orElse(""));

        return dto;
    }

    @Override
    @Transactional
    public void registerInformalSanction(InformalSanctionDto dto) {
        InformalSanction entity = InformalSanction.builder()
                .informalSanctionId(dto.getInformalSanctionId())
                .jobSeCode(dto.getJobSeCode())
                .applicantId(dto.getApplicantId())
                .requestDe(dto.getRequestDe())
                .sanctionerId(dto.getSanctionerId())
                .confmAt("A") // 초기상태: 신청
                .build();
        informalSanctionRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateInformalSanction(InformalSanctionDto dto) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(dto.getInformalSanctionId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getJobSeCode(), dto.getRequestDe(), dto.getSanctionerId());
    }

    @Override
    @Transactional
    public void deleteInformalSanction(String informalSanctionId) {
        informalSanctionRepository.deleteById(Objects.requireNonNull(informalSanctionId));
    }

    @Override
    @Transactional
    public void confirmInformalSanction(String informalSanctionId, String confmAt, String returnResn) {
        InformalSanction entity = informalSanctionRepository.findById(Objects.requireNonNull(informalSanctionId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.confirm(confmAt, returnResn);
    }

    private InformalSanctionDto convertToDto(InformalSanction entity) {
        return InformalSanctionDto.from(entity);
    }
}
