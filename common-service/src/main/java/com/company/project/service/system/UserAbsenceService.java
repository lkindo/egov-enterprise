package com.company.project.service.system;

import com.company.project.domain.system.UserAbsence;
import com.company.project.domain.system.UserAbsenceRepository;
import com.company.project.service.system.dto.UserAbsenceDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserAbsenceService extends EgovAbstractServiceImpl {

    private final UserAbsenceRepository userAbsenceRepository;

    public UserAbsenceService(
            @org.springframework.beans.factory.annotation.Qualifier("systemUserAbsenceRepository") UserAbsenceRepository userAbsenceRepository) {
        this.userAbsenceRepository = userAbsenceRepository;
    }

    @Transactional(readOnly = true)
    public Page<UserAbsenceDto> getUserAbsenceList(String userNm, Pageable pageable) {
        return userAbsenceRepository.findByUserNmContaining(userNm == null ? "" : userNm, pageable)
                .map(UserAbsenceDto::from);
    }

    @Transactional(readOnly = true)
    public UserAbsenceDto getUserAbsence(String userId) {
        UserAbsence entity = userAbsenceRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User absence record not found"));
        return UserAbsenceDto.from(entity);
    }

    @Transactional
    public void saveUserAbsence(UserAbsenceDto dto) {
        UserAbsence entity = userAbsenceRepository.findById(dto.getUserId())
                .orElse(UserAbsence.builder()
                        .userId(dto.getUserId())
                        .build());

        entity.setUserNm(dto.getUserNm());
        entity.setUserAbsnceAt(dto.getUserAbsnceAt());
        entity.setRegYn("Y");

        userAbsenceRepository.save(entity);
    }

    @Transactional
    public void deleteUserAbsence(String userId) {
        userAbsenceRepository.deleteById(userId);
    }
}
