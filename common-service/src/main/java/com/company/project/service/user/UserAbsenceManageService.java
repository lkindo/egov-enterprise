package com.company.project.service.user;

import com.company.project.domain.user.User;
import com.company.project.domain.user.UserAbsence;
import com.company.project.domain.user.UserAbsenceRepository;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.user.dto.UserAbsenceDto;
import egovframework.com.cmm.ComDefaultVO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 사용자 부재 관리 서비스
 */
@Service("userAbsenceManageService")
@Transactional(readOnly = true)
public class UserAbsenceManageService {

    private final UserAbsenceRepository userAbsenceRepository;
    private final UserRepository userRepository;

    public UserAbsenceManageService(
            @org.springframework.beans.factory.annotation.Qualifier("userAbsenceRepository") UserAbsenceRepository userAbsenceRepository,
            UserRepository userRepository) {
        this.userAbsenceRepository = userAbsenceRepository;
        this.userRepository = userRepository;
    }

    /**
     * 사용자 부재 목록 조회
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
        java.util.Map<String, UserAbsence> absenceMap = userAbsenceRepository.findAllById(userIds).stream()
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
     * 사용자 부재 목록 총 건수
     */
    public int selectUserAbsenceListTotCnt(ComDefaultVO searchVO) {
        return (int) userRepository.count();
    }

    /**
     * 사용자 부재 상세 조회
     */
    public UserAbsenceDto selectUserAbsence(String userId) {
        User user = userRepository.findById(userId).orElse(null);
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
     * 사용자 부재 등록
     */
    @Transactional
    public void insertUserAbsence(UserAbsenceDto dto) {
        UserAbsence entity = UserAbsence.builder()
                .userId(dto.getUserId())
                .userAbsnceAt(dto.getUserAbsnceAt())
                .frstRegisterId(dto.getFrstRegisterId())
                .build();
        userAbsenceRepository.save(entity);
    }

    /**
     * 사용자 부재 수정
     */
    @Transactional
    public void updateUserAbsence(UserAbsenceDto dto) {
        UserAbsence entity = userAbsenceRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("UserAbsence not found: " + dto.getUserId()));
        entity.update(dto.getUserAbsnceAt(), dto.getLastUpdusrId());
    }

    /**
     * 사용자 부재 삭제
     */
    @Transactional
    public void deleteUserAbsence(String userId) {
        userAbsenceRepository.deleteById(userId);
    }

    /**
     * 사용자 부재 다중 삭제
     */
    @Transactional
    public void deleteUserAbsences(String[] userIds) {
        userAbsenceRepository.deleteAllById(Arrays.asList(userIds));
    }
}
