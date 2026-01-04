package com.company.project.service.vacation;

import com.company.project.domain.vacation.UserAbsence;
import com.company.project.domain.vacation.UserAbsenceRepository;
import com.company.project.service.vacation.dto.UserAbsenceDto;
import com.company.project.service.vacation.dto.UserAbsenceDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserAbsenceService implements EgovUserAbsenceService {

    private final UserAbsenceRepository userAbsenceRepository;

    public UserAbsenceService(
            @org.springframework.beans.factory.annotation.Qualifier("commonUserAbsenceRepository") UserAbsenceRepository userAbsenceRepository) {
        this.userAbsenceRepository = userAbsenceRepository;
    }

    @Override
    public UserAbsenceDto getUserAbsence(String userId) {
        return userAbsenceRepository.findById(userId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void updateUserAbsence(String userId, String userAbsnceAt, String lastUpdusrId) {
        userAbsenceRepository.findById(userId)
                .ifPresent(ua -> ua.updateAbsence(userAbsnceAt, lastUpdusrId));
    }

    @Override
    @Transactional
    public void registerUserAbsence(UserAbsenceDto dto) {
        UserAbsence userAbsence = UserAbsence.builder()
                .userId(dto.getUserId())
                .userAbsnceAt(dto.getUserAbsnceAt())
                .frstRegisterId(dto.getUserId())
                .lastUpdusrId(dto.getUserId())
                .build();
        userAbsenceRepository.save(userAbsence);
    }

    @Override
    public Page<UserAbsenceDto> getUserAbsenceList(String searchKeyword, String selAbsnceAt, Pageable pageable) {
        // Implementation for listing with search can be complex with JPA Specifications
        // or Querydsl.
        // For now, simplicity.
        return userAbsenceRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    private UserAbsenceDto convertToDto(UserAbsence ua) {
        return UserAbsenceDto.builder()
                .userId(ua.getUserId())
                .userAbsnceAt(ua.getUserAbsnceAt())
                .regYn("Y")
                .build();
    }
}
