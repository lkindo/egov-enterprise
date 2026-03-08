package com.company.project.service.usermanagement;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.user.entity.GeneralUser;
import com.company.project.domain.user.repository.GeneralUserRepository;
import com.company.project.service.usermanagement.dto.GeneralUserDto;
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
public class MberManageServiceImpl implements EgovMberManageService {

    private final GeneralUserRepository generalUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Page<GeneralUserDto> getMberList(String keyword, Pageable pageable) {
        return generalUserRepository.searchGeneralUsers(null, "1", keyword, pageable).map(GeneralUserDto::from);
    }

    @Override
    public GeneralUserDto getMber(String esntlId) {
        return generalUserRepository.findById(Objects.requireNonNull(esntlId))
                .map(GeneralUserDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertMber(GeneralUserDto dto) {
        String esntlId = "MBER_" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        String encodedPassword = passwordEncoder.encode(dto.getPassword());

        GeneralUser entity = GeneralUser.builder()
                .esntlId(esntlId)
                .mberId(dto.getMberId())
                .mberNm(dto.getMberNm())
                .password(encodedPassword)
                .passwordHint(dto.getPasswordHint())
                .passwordCnsr(dto.getPasswordCnsr())
                .ihidnum(dto.getIhidnum())
                .sexdstnCode(dto.getSexdstnCode())
                .zip(dto.getZip())
                .adres(dto.getAdres())
                .areaNo(dto.getAreaNo())
                .mberSttus(dto.getMberSttus())
                .detailAdres(dto.getDetailAdres())
                .endTelno(dto.getEndTelno())
                .moblphonNo(dto.getMoblphonNo())
                .groupId(dto.getGroupId())
                .mberFxnum(dto.getMberFxnum())
                .mberEmailAdres(dto.getMberEmailAdres())
                .middleTelno(dto.getMiddleTelno())
                .build();
        generalUserRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateMber(GeneralUserDto dto) {
        GeneralUser entity = generalUserRepository.findById(Objects.requireNonNull(dto.getEsntlId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getMberNm(), dto.getPasswordHint(), dto.getPasswordCnsr(),
                dto.getIhidnum(), dto.getSexdstnCode(), dto.getZip(), dto.getAdres(),
                dto.getAreaNo(), dto.getMberSttus(), dto.getDetailAdres(), dto.getEndTelno(),
                dto.getMoblphonNo(), dto.getGroupId(), dto.getMberFxnum(),
                dto.getMberEmailAdres(), dto.getMiddleTelno());
    }

    @Override
    @Transactional
    public void deleteMber(String esntlId) {
        generalUserRepository.deleteById(Objects.requireNonNull(esntlId));
    }

    @Override
    @Transactional
    public void updatePassword(String esntlId, String password) {
        GeneralUser entity = generalUserRepository.findById(Objects.requireNonNull(esntlId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updatePassword(passwordEncoder.encode(password));
    }
}
