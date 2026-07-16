package nuri.business.service.system.user.impl;

import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.domain.user.dto.UserAbsenceMapper;
import nuri.business.domain.user.entity.UserAbsence;
import nuri.business.domain.user.exception.UserErrorCode;
import nuri.business.domain.user.repository.UserAbsenceRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.system.user.UserAbsenceService;
import nuri.foundation.core.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserAbsenceServiceImpl implements UserAbsenceService {

    private final UserAbsenceRepository userAbsenceRepository;
    private final UserAbsenceMapper userAbsenceMapper;
    private final UserRepository userRepository;

    public UserAbsenceServiceImpl(UserAbsenceRepository userAbsenceRepository, UserAbsenceMapper userAbsenceMapper,
            UserRepository userRepository) {
        this.userAbsenceRepository = userAbsenceRepository;
        this.userAbsenceMapper = userAbsenceMapper;
        this.userRepository = userRepository;
    }

    @Override
    public List<UserAbsenceDto> getAbsences() {
        return userAbsenceRepository.findAll().stream()
                .map(userAbsenceMapper::toDto)
                .toList();
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
        // [V2_13 결속] tb_user_absn.user_id 는 esntl_id 규약 — 실존 사용자 검증이 키 규약의 코드 확정을 겸함
        // (fk_tb_user_absn_tb_user_info 하에서 유령 id 업서트는 FK 위반이 되므로 도메인 예외로 선차단)
        if (!userRepository.existsById(userId)) {
            throw new BusinessException(UserErrorCode.USER_NOT_FOUND);
        }
        UserAbsence absence = userAbsenceRepository.findById(userId)
                .orElse(UserAbsence.builder().userId(userId).build());
        absence.updateAbsence(dto.userAbsnYn());
        userAbsenceRepository.save(absence);
    }
}
