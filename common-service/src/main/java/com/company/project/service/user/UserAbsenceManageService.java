package com.company.project.service.user;

import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.entity.UserAbsence;
import com.company.project.domain.user.repository.UserAbsenceRepository;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.dto.UserAbsenceDto;
import egovframework.com.cmm.ComDefaultVO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ?ъ슜??遺??愿由??쒕퉬??
 */
@Service("userAbsenceManageService")
@Transactional(readOnly = true)
public class UserAbsenceManageService {

    private final UserAbsenceRepository userAbsenceRepository;
    private final UserRepository userRepository;

    public UserAbsenceManageService(
            @org.springframework.beans.factory.annotation.Qualifier("userUserAbsenceRepository") UserAbsenceRepository userAbsenceRepository,
            UserRepository userRepository) {
        this.userAbsenceRepository = Objects.requireNonNull(userAbsenceRepository);
        this.userRepository = Objects.requireNonNull(userRepository);
    }

    /**
     * ?ъ슜??遺??紐⑸줉 議고쉶
     */
    public List<UserAbsenceDto> selectUserAbsenceList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<User> userPage = userRepository.findAll(pageable);
        List<User> users = userPage.getContent();

        // 1. Collect all User IDs
        List<String> userIds = users.stream()
                .map(User::getUserId)
                .collect(Collectors.toList());

        // 2. Bulk fetch absences using findAllById
        java.util.Map<String, UserAbsence> absenceMap = userAbsenceRepository
                .findAllById(Objects.requireNonNull(userIds)).stream()
                .collect(Collectors.toMap(UserAbsence::getUserId, java.util.function.Function.identity()));

        return users.stream().map(user -> {
            UserAbsenceDto dto = new UserAbsenceDto();
            dto.setUserId(user.getUserId());
            dto.setUserNm(user.getUserNm());

            UserAbsence absence = absenceMap.get(user.getUserId());
            if (absence != null) {
                dto.setUserAbsnceAt(absence.getUserAbsnceAt());
                dto.setRegYn("Y");
            } else {
                dto.setUserAbsnceAt("N");
                dto.setRegYn("N");
            }
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * ?ъ슜??遺??紐⑸줉 珥?嫄댁닔
     */
    public int selectUserAbsenceListTotCnt(ComDefaultVO searchVO) {
        return (int) userRepository.count();
    }

    /**
     * ?ъ슜??遺???곸꽭 議고쉶
     */
    public UserAbsenceDto selectUserAbsence(String userId) {
        User user = userRepository.findById(Objects.requireNonNull(userId)).orElse(null);
        if (user == null) {
            return null;
        }

        UserAbsenceDto dto = new UserAbsenceDto();
        dto.setUserId(user.getUserId());
        dto.setUserNm(user.getUserNm());

        UserAbsence absence = userAbsenceRepository.findById(userId).orElse(null);
        if (absence != null) {
            dto.setUserAbsnceAt(absence.getUserAbsnceAt());
            dto.setRegYn("Y");
        } else {
            dto.setUserAbsnceAt("N");
            dto.setRegYn("N");
        }
        return dto;
    }

    /**
     * ?ъ슜??遺???깅줉
     */
    @Transactional
    public void insertUserAbsence(UserAbsenceDto dto) {
        Objects.requireNonNull(dto);
        UserAbsence entity = UserAbsence.builder()
                .userId(dto.getUserId())
                .userAbsnceAt(dto.getUserAbsnceAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        userAbsenceRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * ?ъ슜??遺???섏젙
     */
    @Transactional
    public void updateUserAbsence(UserAbsenceDto dto) {
        Objects.requireNonNull(dto);
        UserAbsence entity = userAbsenceRepository.findById(Objects.requireNonNull(dto.getUserId()))
                .orElseThrow(() -> new RuntimeException("UserAbsence not found: " + dto.getUserId()));
        entity.update(dto.getUserAbsnceAt(), dto.getLastUpdusrId());
    }

    /**
     * ?ъ슜??遺????젣
     */
    @Transactional
    public void deleteUserAbsence(String userId) {
        userAbsenceRepository.deleteById(Objects.requireNonNull(userId));
    }

    /**
     * ?ъ슜??遺???ㅼ쨷 ??젣
     */
    @Transactional
    public void deleteUserAbsences(String[] userIds) {
        userAbsenceRepository.deleteAllById(Objects.requireNonNull(Arrays.asList(Objects.requireNonNull(userIds))));
    }
}
