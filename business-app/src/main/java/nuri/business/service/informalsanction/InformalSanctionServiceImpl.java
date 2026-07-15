package nuri.business.service.informalsanction;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.business.domain.informalsanction.SanctionStatus;
import nuri.business.service.code.EgovCommonCodeService;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import nuri.business.service.informalsanction.dto.InformalSanctionMapper;
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
    private final InformalSanctionMapper informalSanctionMapper;

    @Override
    public Page<InformalSanctionDto> getInformalSanctionList(String aplcntId, Pageable pageable) {
        Page<InformalSanction> result;
        if (aplcntId != null && !aplcntId.isEmpty()) {
            result = informalSanctionRepository.findByAplcntId(aplcntId, pageable);
        } else {
            result = informalSanctionRepository.findAll(pageable);
        }
        return result.map(this::convertToDto);
    }

    @Override
    public Page<InformalSanctionDto> getReceivedInformalSanctionList(String aprvrId, Pageable pageable) {
        return informalSanctionRepository
                .findByAprvrId(Objects.requireNonNull(aprvrId), Objects.requireNonNull(pageable))
                .map(this::convertToDto);
    }

    @Override
    public InformalSanctionDto getInformalSanction(String ifmlAtrzId) {
        InformalSanction entity = informalSanctionRepository.findById(Objects.requireNonNull(ifmlAtrzId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        InformalSanctionDto dto = convertToDto(entity);

        // 코드명 설정
        List<CommonCodeDto> jobCodes = commonCodeService.getCodesByGroup("COM075");
        dto.setTaskSeNm(jobCodes.stream()
                .filter(c -> c.dtlCd().equals(dto.getTaskSeCd()))
                .findFirst().map(CommonCodeDto::dtlCdNm).orElse(""));

        return dto;
    }

    @Override
    @Transactional
    public void registerInformalSanction(InformalSanctionDto dto) {
        String ifmlAtrzId = dto.getIfmlAtrzId();
        if (ifmlAtrzId == null || ifmlAtrzId.isEmpty()) {
            ifmlAtrzId = "INFRML_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 13).toUpperCase();
        }

        InformalSanction entity = InformalSanction.builder()
                .ifmlAtrzId(ifmlAtrzId)
                .taskSeCd(dto.getTaskSeCd())
                .aplcntId(dto.getAplcntId())
                .reqYmd(dto.getReqYmd())
                .aprvrId(dto.getAprvrId())
                .aprvYn(SanctionStatus.REQUESTED.getCode()) // 초기상태: 신청
                .build();
        informalSanctionRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateInformalSanction(InformalSanctionDto dto) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(dto.getIfmlAtrzId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (신청자 본인)
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getAplcntId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // [안정성] 상태 전이 가드 (신청 상태에서만 수정 가능)
        if (!"A".equals(entity.getAprvYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "신청 상태인 경우에만 수정할 수 있습니다.");
        }

        entity.update(dto.getTaskSeCd(), dto.getReqYmd(), dto.getAprvrId());
    }

    @Override
    @Transactional
    public void deleteInformalSanction(String ifmlAtrzId) {
        InformalSanction entity = informalSanctionRepository
                .findById(Objects.requireNonNull(ifmlAtrzId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (신청자 본인)
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getAplcntId())) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }

        // [안정성] 상태 전이 가드 (신청 상태에서만 삭제 가능)
        if (!"A".equals(entity.getAprvYn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "신청 상태인 경우에만 삭제할 수 있습니다.");
        }

        informalSanctionRepository.delete(entity);
    }

    @Override
    @Transactional
    public void confirmInformalSanction(String ifmlAtrzId, String aprvYn, String rjctRsnCn) {
        InformalSanction entity = informalSanctionRepository.findById(Objects.requireNonNull(ifmlAtrzId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        // [보안] 권한 확인 (결재자 본인)
        String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
        if (!currentUserId.equals(entity.getAprvrId())) {
            throw new BusinessException("접근 권한이 없습니다.", CommonErrorCode.ACCESS_DENIED);
        }

        // [안정성] 상태 전이 가드 및 비즈니스 행위 위임
        if (SanctionStatus.APPROVED.getCode().equals(aprvYn)) {
            entity.approve();
        } else if (SanctionStatus.REJECTED.getCode().equals(aprvYn)) {
            entity.reject(rjctRsnCn);
        } else {
            throw new BusinessException("잘못된 결재 상태 코드입니다: " + aprvYn, CommonErrorCode.INVALID_INPUT_VALUE);
        }

        // 이벤트 발행 — 커밋 후 발행하여 알림 리스너(@Async)가 롤백 시 허위 알림을 보내지 않도록 한다.
        final nuri.business.service.informalsanction.event.SanctionStatusChangedEvent statusChangedEvent =
                new nuri.business.service.informalsanction.event.SanctionStatusChangedEvent(
                        ifmlAtrzId, entity.getAplcntId(), entity.getAprvrId(),
                        SanctionStatus.fromCode(aprvYn), rjctRsnCn);
        nuri.foundation.core.util.TransactionUtils.runAfterCommit(() -> eventPublisher.publishEvent(statusChangedEvent));
    }

    private InformalSanctionDto convertToDto(InformalSanction entity) {
        return informalSanctionMapper.toDto(entity);
    }
}
