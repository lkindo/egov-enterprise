package nuri.foundation.service.system.service.consult;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.system.service.consult.CnsltManage;
import nuri.foundation.domain.system.service.consult.CnsltManageRepository;
import nuri.foundation.service.system.service.consult.dto.CnsltManageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CnsltService implements EgovCnsltService {

    private final CnsltManageRepository cnsltManageRepository;

    @Override
    public Page<CnsltManageDto> getCnsltList(String keyword, @org.springframework.lang.NonNull Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return cnsltManageRepository.findAll(Objects.requireNonNull(pageable)).map(CnsltManageDto::from);
        }
        return cnsltManageRepository.findByDscsnTtlContaining(keyword, Objects.requireNonNull(pageable))
                .map(CnsltManageDto::from);
    }

    @Override
    @Transactional
    public CnsltManageDto getCnslt(String cnsltId) {
        CnsltManage entity = cnsltManageRepository.findById(Objects.requireNonNull(cnsltId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.incrementInqireCo();
        return CnsltManageDto.from(entity);
    }

    @Override
    @Transactional
    public void insertCnslt(CnsltManageDto dto) {
        String id = "CNSLT_" + System.currentTimeMillis();
        cnsltManageRepository.save(Objects.requireNonNull(CnsltManage.builder()
                .dscsnId(id)
                .dscsnTtl(dto.getDscsnTtl())
                .dscsnCn(dto.getDscsnCn())
                .rlsYn(dto.getRlsYn())
                .wrtPswd(dto.getWrtPswd())
                .wrterNm(dto.getWrterNm())
                .build()));
    }

    @Override
    @Transactional
    public void updateCnslt(CnsltManageDto dto) {
        CnsltManage entity = cnsltManageRepository.findById(Objects.requireNonNull(dto.getDscsnId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getDscsnTtl(), dto.getDscsnCn(), dto.getRlsYn(), dto.getWrtPswd(),
                null, null, null, null, null, null,
                null, null, dto.getWrterNm(), null);
    }

    @Override
    @Transactional
    public void deleteCnslt(String cnsltId) {
        cnsltManageRepository.deleteById(Objects.requireNonNull(cnsltId));
    }

    @Override
    @Transactional
    public void answerCnslt(String cnsltId, String answerCn) {
        CnsltManage entity = cnsltManageRepository.findById(Objects.requireNonNull(cnsltId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updateAnswer("2", answerCn);
    }
}
