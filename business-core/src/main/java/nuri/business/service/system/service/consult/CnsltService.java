package nuri.business.service.system.service.consult;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.service.consult.CnsltManage;
import nuri.business.domain.system.service.consult.CnsltManageRepository;
import nuri.business.service.system.service.consult.dto.CnsltManageDto;
import nuri.business.service.system.service.consult.dto.CnsltManageMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CnsltService {

    private final CnsltManageRepository cnsltManageRepository;
    private final CnsltManageMapper cnsltManageMapper;

    public Page<CnsltManageDto> getCnsltList(String keyword, @org.springframework.lang.NonNull Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return cnsltManageRepository.findAll(Objects.requireNonNull(pageable)).map(cnsltManageMapper::toDto);
        }
        return cnsltManageRepository.findByDscsnTtlContaining(keyword, Objects.requireNonNull(pageable))
                .map(cnsltManageMapper::toDto);
    }

    @Transactional
    public CnsltManageDto getCnslt(String cnsltId) {
        CnsltManage entity = cnsltManageRepository.findById(Objects.requireNonNull(cnsltId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.incrementInqireCo();
        return cnsltManageMapper.toDto(entity);
    }

    @Transactional
    public void insertCnslt(CnsltManageDto dto) {
        String id = nuri.foundation.core.util.IdGenerationUtil.generateId("CNSLT_", 13);
        cnsltManageRepository.save(Objects.requireNonNull(CnsltManage.builder()
                .dscsnId(id)
                .dscsnTtl(dto.getDscsnTtl())
                .dscsnCn(dto.getDscsnCn())
                .rlsYn(dto.getRlsYn())
                .wrtPswd(dto.getWrtPswd())
                .wrterNm(dto.getWrterNm())
                .build()));
    }

    @Transactional
    public void updateCnslt(CnsltManageDto dto) {
        CnsltManage entity = cnsltManageRepository.findById(Objects.requireNonNull(dto.getDscsnId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getDscsnTtl(), dto.getDscsnCn(), dto.getRlsYn(), dto.getWrtPswd(),
                null, null, null, null, null, null,
                null, null, dto.getWrterNm(), null);
    }

    @Transactional
    public void deleteCnslt(String cnsltId) {
        cnsltManageRepository.deleteById(Objects.requireNonNull(cnsltId));
    }

    @Transactional
    public void answerCnslt(String cnsltId, String answerCn) {
        CnsltManage entity = cnsltManageRepository.findById(Objects.requireNonNull(cnsltId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.updateAnswer("2", answerCn);
    }
}
