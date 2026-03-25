package com.company.project.foundation.service.usermanagement;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.user.entity.EnterpriseUser;
import com.company.project.foundation.domain.user.repository.EnterpriseUserRepository;
import com.company.project.foundation.service.usermanagement.dto.EnterpriseUserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EntrprsManageServiceImpl implements EgovEntrprsManageService {

    private final EnterpriseUserRepository enterpriseUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Page<EnterpriseUserDto> getEntrprsList(String keyword, Pageable pageable) {
        return enterpriseUserRepository.searchEnterpriseUsers(null, "1", keyword, pageable)
                .map(EnterpriseUserDto::from);
    }

    @Override
    public EnterpriseUserDto getEntrprs(String esntlId) {
        return enterpriseUserRepository.findById(Objects.requireNonNull(esntlId))
                .map(EnterpriseUserDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertEntrprs(EnterpriseUserDto dto) {
        String esntlId = "ENT_" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        String encodedPassword = passwordEncoder.encode(dto.getEntrprsMberPassword());

        EnterpriseUser entity = EnterpriseUser.builder()
                .esntlId(esntlId)
                .entrprsmberId(dto.getEntrprsmberId())
                .entrprsSeCode(dto.getEntrprsSeCode())
                .bizrno(dto.getBizrno())
                .jurirno(dto.getJurirno())
                .cmpnyNm(dto.getCmpnyNm())
                .cxfc(dto.getCxfc())
                .zip(dto.getZip())
                .adres(dto.getAdres())
                .entrprsMiddleTelno(dto.getEntrprsMiddleTelno())
                .fxnum(dto.getFxnum())
                .indutyCode(dto.getIndutyCode())
                .applcntNm(dto.getApplcntNm())
                .entrprsMberSttus(dto.getEntrprsMberSttus())
                .entrprsMberPassword(encodedPassword)
                .entrprsMberPasswordHint(dto.getEntrprsMberPasswordHint())
                .entrprsMberPasswordCnsr(dto.getEntrprsMberPasswordCnsr())
                .groupId(dto.getGroupId())
                .detailAdres(dto.getDetailAdres())
                .entrprsEndTelno(dto.getEntrprsEndTelno())
                .areaNo(dto.getAreaNo())
                .applcntEmailAdres(dto.getApplcntEmailAdres())
                .applcntIhidnum(dto.getApplcntIhidnum())
                .build();
        enterpriseUserRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateEntrprs(EnterpriseUserDto dto) {
        EnterpriseUser entity = enterpriseUserRepository.findById(Objects.requireNonNull(dto.getEsntlId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getEntrprsmberId(), dto.getEntrprsSeCode(), dto.getBizrno(), dto.getJurirno(),
                dto.getCmpnyNm(), dto.getCxfc(), dto.getZip(), dto.getAdres(),
                dto.getEntrprsMiddleTelno(), dto.getFxnum(), dto.getIndutyCode(),
                dto.getApplcntNm(), dto.getEntrprsMberSttus(), dto.getEntrprsMberPasswordHint(),
                dto.getEntrprsMberPasswordCnsr(), dto.getGroupId(), dto.getDetailAdres(),
                dto.getEntrprsEndTelno(), dto.getAreaNo(), dto.getApplcntEmailAdres());
    }

    @Override
    @Transactional
    public void deleteEntrprs(String esntlId) {
        enterpriseUserRepository.deleteById(Objects.requireNonNull(esntlId));
    }

    @Override
    @Transactional
    public void updatePassword(String esntlId, String password) {
        EnterpriseUser entity = enterpriseUserRepository.findById(Objects.requireNonNull(esntlId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updatePassword(passwordEncoder.encode(password));
    }
}
