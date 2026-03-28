package com.company.project.foundation.service.system.user.impl;

import com.company.project.foundation.domain.user.dto.UserAbsenceDto;
import com.company.project.foundation.domain.user.entity.UserAbsence;
import com.company.project.foundation.domain.user.mapper.UserAbsenceMapper;
import com.company.project.foundation.domain.user.repository.UserAbsenceRepository;
import com.company.project.foundation.service.system.user.UserAbsenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAbsenceServiceImpl implements UserAbsenceService {

    private final UserAbsenceRepository userAbsenceRepository;
    private final UserAbsenceMapper userAbsenceMapper;

    @Override
    public List<UserAbsenceDto> getAbsences() {
        return userAbsenceMapper.toDtoList(userAbsenceRepository.findAll());
    }

    @Override
    public UserAbsenceDto getAbsence(String emplyrId) {
        UserAbsence absence = userAbsenceRepository.findById(emplyrId)
                .orElse(UserAbsence.builder().emplyrId(emplyrId).userAbsnceAt("N").build());
        return userAbsenceMapper.toDto(absence);
    }

    @Override
    @Transactional
    public void updateAbsence(String emplyrId, UserAbsenceDto dto) {
        UserAbsence absence = userAbsenceRepository.findById(emplyrId)
                .orElse(UserAbsence.builder().emplyrId(emplyrId).build());
        absence.updateAbsence(dto.getUserAbsnceAt());
        userAbsenceRepository.save(absence);
    }
}
