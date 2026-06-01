package nuri.business.service.system.user.impl;

import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.domain.user.entity.UserAbsence;
import nuri.business.domain.user.mapper.UserAbsenceMapper;
import nuri.business.domain.user.repository.UserAbsenceRepository;
import nuri.business.service.system.user.UserAbsenceService;
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
    public UserAbsenceDto getAbsence(String userId) {
        UserAbsence absence = userAbsenceRepository.findById(userId)
                .orElse(UserAbsence.builder().userId(userId).userAbsnYn("N").build());
        return userAbsenceMapper.toDto(absence);
    }

    @Override
    @Transactional
    public void updateAbsence(String userId, UserAbsenceDto dto) {
        UserAbsence absence = userAbsenceRepository.findById(userId)
                .orElse(UserAbsence.builder().userId(userId).build());
        absence.updateAbsence(dto.getUserAbsnYn());
        userAbsenceRepository.save(absence);
    }
}
