package nuri.business.service.system.user.impl;

import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.domain.user.entity.UserAbsence;
import nuri.business.domain.user.repository.UserAbsenceRepository;
import nuri.business.service.system.user.UserAbsenceService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserAbsenceServiceImpl implements UserAbsenceService {

    private final UserAbsenceRepository userAbsenceRepository;

    public UserAbsenceServiceImpl(UserAbsenceRepository userAbsenceRepository) {
        this.userAbsenceRepository = userAbsenceRepository;
    }

    @Override
    public List<UserAbsenceDto> getAbsences() {
        return userAbsenceRepository.findAll().stream()
                .map(UserAbsenceDto::from)
                .toList();
    }

    @Override
    public UserAbsenceDto getAbsence(String userId) {
        UserAbsence absence = userAbsenceRepository.findById(userId)
                .orElse(UserAbsence.builder().userId(userId).userAbsnYn("N").build());
        return UserAbsenceDto.from(absence);
    }

    @Override
    @Transactional
    public void updateAbsence(String userId, UserAbsenceDto dto) {
        UserAbsence absence = userAbsenceRepository.findById(userId)
                .orElse(UserAbsence.builder().userId(userId).build());
        absence.updateAbsence(dto.userAbsnYn());
        userAbsenceRepository.save(absence);
    }
}
