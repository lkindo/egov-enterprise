package nuri.business.service.system.user.impl;

import nuri.business.domain.user.dto.UserAbsenceDto;
import nuri.business.domain.user.dto.UserAbsenceMapper;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.entity.UserAbsence;
import nuri.business.domain.user.exception.UserErrorCode;
import nuri.business.domain.user.repository.UserAbsenceRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.system.user.UserAbsenceService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.validation.Ymd;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Stream;

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

    /**
     * 부재와 대리결재(V2_151)를 함께 정한다. 대리결재자는 부재(Y)일 때만, 기간과 함께 둔다.
     *
     * <p>거부(400)하는 지정: 본인, 없거나 사용 중이 아니거나 잠긴 계정, 그 기간에 부재 중인 사람(연쇄·순환 — A→B 를 둘 때 B 가 같은
     * 기간에 부재면 B→A 또는 B→C 가 된다), 그리고 같은 기간에 이미 다른 사람의 대리결재자인 사람을 부재로 돌리는 지정(X→A 가 있는데
     * A→B 를 두면 연쇄가 된다). 한 사람의 부재는 한 행이라 같은 사람의 기간 겹침은 구조로 생기지 않는다.
     *
     * <p>두 관리자가 서로를 맞물려 지정하는 순환을 막으려고 두 사용자 행을 같은 순서로 잠근 뒤 판정한다.
     */
    @Override
    @Transactional
    public void updateAbsence(String userId, UserAbsenceDto dto) {
        nuri.business.security.util.SecurityUtil.assertPermission("ABSENCE_UPDATE");
        // [V2_13 결속] tb_user_absn.user_id 는 esntl_id 규약 — 실존 사용자 검증이 키 규약의 코드 확정을 겸함
        // (fk_tb_user_absn_tb_user_info 하에서 유령 id 업서트는 FK 위반이 되므로 도메인 예외로 선차단)
        if (!userRepository.existsById(userId)) {
            throw new BusinessException(UserErrorCode.USER_NOT_FOUND);
        }
        String absent = dto.userAbsnYn();
        String substitute = blankToNull(dto.sbtAprvrId());
        String from = compactDate(dto.absnBgngYmd());
        String to = compactDate(dto.absnEndYmd());
        if (substitute == null) {
            if (from != null || to != null) {
                if (!"Y".equals(absent) || from == null || to == null) {
                    throw invalid("부재 기간은 부재일 때 시작일과 종료일을 함께 적어 주세요.");
                }
                assertPeriod(from, to);
            }
        } else {
            assertSubstitute(userId, absent, substitute, from, to);
        }
        UserAbsence absence = userAbsenceRepository.findById(userId)
                .orElse(UserAbsence.builder().userId(userId).build());
        absence.updateDelegation(absent, substitute, "Y".equals(absent) ? from : null, "Y".equals(absent) ? to : null);
        userAbsenceRepository.save(absence);
    }

    private void assertSubstitute(String userId, String absent, String substitute, String from, String to) {
        if (!"Y".equals(absent)) {
            throw invalid("부재가 아니면 대리결재자를 지정할 수 없습니다.");
        }
        if (from == null || to == null) {
            throw invalid("대리결재자를 지정하려면 부재 시작일과 종료일을 함께 적어 주세요.");
        }
        assertPeriod(from, to);
        if (substitute.equals(userId)) {
            throw invalid("본인을 대리결재자로 지정할 수 없습니다.");
        }
        // 두 사람의 사용자 행을 같은 순서로 잠근다 — 맞물린 두 지정이 서로의 판정 사이에 끼어들지 못한다.
        Stream.of(userId, substitute).sorted().forEach(id -> userRepository.findByEsntlIdForUpdate(id)
                .orElseThrow(() -> invalid("대리결재자로 지정할 수 없는 사용자입니다.")));
        User delegate = userRepository.findById(substitute)
                .orElseThrow(() -> invalid("대리결재자로 지정할 수 없는 사용자입니다."));
        if (!"P".equals(delegate.getUserSttsCd()) || delegate.isLocked()) {
            throw invalid("사용 중이 아니거나 잠긴 계정은 대리결재자로 지정할 수 없습니다.");
        }
        userAbsenceRepository.findById(substitute)
                .filter(other -> "Y".equals(other.getUserAbsnYn()))
                .filter(other -> other.getAbsnBgngYmd() == null || other.getAbsnEndYmd() == null
                        || (other.getAbsnBgngYmd().compareTo(to) <= 0 && other.getAbsnEndYmd().compareTo(from) >= 0))
                .ifPresent(other -> {
                    throw invalid("대리결재자가 그 기간에 부재 중입니다. 대리결재를 이어서 맡길 수 없습니다.");
                });
        if (!userAbsenceRepository.findOverlappingDelegationsTo(userId, userId, from, to).isEmpty()) {
            throw invalid("이 사용자는 그 기간에 다른 사람의 대리결재자입니다. 대리결재를 이어서 맡길 수 없습니다.");
        }
    }

    private static void assertPeriod(String from, String to) {
        if (from.compareTo(to) > 0) {
            throw invalid("부재 종료일은 시작일과 같거나 그 뒤여야 합니다.");
        }
    }

    private static String compactDate(String value) {
        String date = blankToNull(value);
        return date == null ? null : Ymd.compact(date);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, message);
    }
}
