package com.company.project.service.consult;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.consult.CnsltManage;
import com.company.project.domain.consult.CnsltManageRepository;
import com.company.project.service.consult.dto.CnsltManageDto;
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
        return cnsltManageRepository.findByCnsltSjContaining(keyword, Objects.requireNonNull(pageable))
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
        String id = "CNSLT_" + String.format("%013d", System.currentTimeMillis());
        cnsltManageRepository.save(Objects.requireNonNull(CnsltManage.builder()
                .cnsltId(id)
                .cnsltSj(dto.getCnsltSj())
                .cnsltCn(dto.getCnsltCn())
                .othbcAt(dto.getOthbcAt())
                .writngPassword(dto.getWritngPassword())
                .wrterNm(dto.getWrterNm())
                .build()));
    }

    @Override
    @Transactional
    public void updateCnslt(CnsltManageDto dto) {
        CnsltManage entity = cnsltManageRepository.findById(Objects.requireNonNull(dto.getCnsltId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getCnsltSj(), dto.getCnsltCn(), dto.getOthbcAt(), dto.getWritngPassword(),
                null, null, null, null, null, null,
                null, null, dto.getWrterNm(), null, null);
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
        entity.updateAnswer("2", answerCn, null);
    }
}
