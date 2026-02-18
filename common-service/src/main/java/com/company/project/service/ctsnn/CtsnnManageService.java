package com.company.project.service.ctsnn;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.ctsnn.CtsnnManage;
import com.company.project.domain.ctsnn.CtsnnManageRepository;
import com.company.project.service.ctsnn.dto.CtsnnDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import org.springframework.lang.NonNull;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CtsnnManageService implements EgovCtsnnManageService {

    private final CtsnnManageRepository ctsnnManageRepository;

    @Override
    public Page<CtsnnDto> getCtsnnList(String keyword, @NonNull Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return ctsnnManageRepository.findAll(Objects.requireNonNull(pageable)).map(CtsnnDto::from);
        }
        return ctsnnManageRepository.findByCtsnnNmContaining(keyword, Objects.requireNonNull(pageable))
                .map(CtsnnDto::from);
    }

    @Override
    public Page<CtsnnDto> getMyCtsnnList(String userId, @NonNull Pageable pageable) {
        return ctsnnManageRepository.findByUsid(userId, Objects.requireNonNull(pageable)).map(CtsnnDto::from);
    }

    @Override
    public CtsnnDto getCtsnn(@NonNull String ctsnnId) {
        return ctsnnManageRepository.findById(Objects.requireNonNull(ctsnnId))
                .map(CtsnnDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertCtsnn(String userId, CtsnnDto dto) {
        String id = "CTSNN_" + String.format("%013d", System.currentTimeMillis());
        CtsnnManage entity = CtsnnManage.builder()
                .ctsnnId(id)
                .usid(userId)
                .ctsnnCd(dto.getCtsnnCd())
                .reqstDe(dto.getReqstDe())
                .ctsnnNm(dto.getCtsnnNm())
                .trgterNm(dto.getTrgterNm())
                .brth(dto.getBrth())
                .occrrDe(dto.getOccrrDe())
                .relate(dto.getRelate())
                .remark(dto.getRemark())
                .confmAt("N") // 초기 상태: 미승인
                .infrmlSanctnId(dto.getInfrmlSanctnId())
                .build();
        ctsnnManageRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateCtsnn(String ctsnnId, String userId, CtsnnDto dto) {
        CtsnnManage entity = ctsnnManageRepository.findById(Objects.requireNonNull(ctsnnId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 승인된 건은 수정 불가 처리 로직 등 추가 가능

        entity.update(dto.getCtsnnCd(), dto.getCtsnnNm(), dto.getReqstDe(), dto.getTrgterNm(),
                dto.getBrth(), dto.getOccrrDe(), dto.getRelate(), dto.getRemark());
    }

    @Override
    @Transactional
    public void deleteCtsnn(@NonNull String ctsnnId) {
        ctsnnManageRepository.deleteById(Objects.requireNonNull(ctsnnId));
    }

    @Override
    @Transactional
    public void confirmCtsnn(@NonNull String ctsnnId, String confmAt, String returnResn) {
        CtsnnManage entity = ctsnnManageRepository.findById(Objects.requireNonNull(ctsnnId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.confirm(confmAt, returnResn);
    }
}
