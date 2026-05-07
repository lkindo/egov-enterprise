package nuri.business.service.informalsanction;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.foundation.service.code.EgovCommonCodeService;
import nuri.foundation.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InformalSanctionServiceImpl implements InformalSanctionService {

    private final InformalSanctionRepository informalSanctionRepository;
    private final EgovCommonCodeService commonCodeService;
    private final ApplicationEventPublisher eventPublisher;

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
        String informalSanctionId = dto.getInformalSanctionId();
        if (informalSanctionId == null || informalSanctionId.isEmpty()) {
            informalSanctionId = nuri.foundation.core.util.IdGenerationUtil.generateInformalSanctionId();
        }

        InformalSanction entity = InformalSanction.builder()
                .informalSanctionId(informalSanctionId)
                .jobSeCode(dto.getJobSeCode())
                .applicantId(dto.getApplicantId())
                .requestDe(dto.getRequestDe())
                .sanctionerId(dto.getSanctionerId())
                .confmAt(SanctionStatus.REQUESTED.getCode()) // 초기상태: 신청
                .build();
        informalSanctionRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateInformalSanction(InformalSanctionDto dto) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(dto.getInformalSanctionId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (신청자 본인)
        String currentUserId = nuri.foundation.security.util.SecurityUtil.getCurrentUserId()
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getApplicantId())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        // [안정성] 상태 전이 가드 (신청 상태에서만 수정 가능)
        if (!"A".equals(entity.getConfmAt())) {
            throw new BusinessException(ErrorCode.INVALID_STATE, "신청 상태인 경우에만 수정할 수 있습니다.");
        }

        entity.update(dto.getJobSeCode(), dto.getRequestDe(), dto.getSanctionerId());
    }

    @Override
    @Transactional
    public void deleteInformalSanction(String informalSanctionId) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(informalSanctionId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (신청자 본인)
        String currentUserId = nuri.foundation.security.util.SecurityUtil.getCurrentUserId()
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getApplicantId())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        // [안정성] 상태 전이 가드 (신청 상태에서만 삭제 가능)
        if (!"A".equals(entity.getConfmAt())) {
            throw new BusinessException(ErrorCode.INVALID_STATE, "신청 상태인 경우에만 삭제할 수 있습니다.");
        }

        informalSanctionRepository.delete(entity);
    }

    @Override
    @Transactional
    public void confirmInformalSanction(String informalSanctionId, String confmAt, String returnResn) {
        InformalSanction entity = informalSanctionRepository.findById(Objects.requireNonNull(informalSanctionId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (결재자 본인)
        String currentUserId = nuri.foundation.security.util.SecurityUtil.getCurrentUserId()
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getSanctionerId())) {
            throw new BusinessException("접근 권한이 없습니다.", ErrorCode.ACCESS_DENIED);
        }

        // [안정성] 상태 전이 가드 및 비즈니스 행위 위임
        if (SanctionStatus.APPROVED.getCode().equals(confmAt)) {
            entity.approve();
        } else if (SanctionStatus.REJECTED.getCode().equals(confmAt)) {
            entity.reject(returnResn);
        } else {
            throw new BusinessException("잘못된 결재 상태 코드입니다: " + confmAt, ErrorCode.INVALID_INPUT_VALUE);
        }

        // 이벤트 발행
        eventPublisher.publishEvent(new nuri.business.service.informalsanction.event.SanctionStatusChangedEvent(
                informalSanctionId, entity.getApplicantId(), entity.getSanctionerId(), 
                SanctionStatus.fromCode(confmAt), returnResn));
    }

    private InformalSanctionDto convertToDto(InformalSanction entity) {
        return InformalSanctionDto.from(entity);
    }
}
