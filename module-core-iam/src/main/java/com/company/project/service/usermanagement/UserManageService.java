package com.company.project.service.usermanagement;

import com.company.project.service.user.mapper.UserDtoMapper;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.usermanagement.dto.UserManageDto;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.UUID;

/**
 * 사용자 관리를 위한 서비스 클래스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserManageService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 사용자 목록을 조회한다. (페이징)
     *
     * @param searchVO 검색 조건
     * @return 사용자 DTO 목록
     */
    public List<UserManageDto> selectUserList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageSize = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageSize);

        Page<User> page = userRepository.findAll(Objects.requireNonNull(pageable));
        return page.map(UserDtoMapper::toUserManageDto).getContent();
    }

    /**
     * 사용자 목록의 총 갯수를 조회한다.
     *
     * @param searchVO 검색 조건
     * @return 총 갯수
     */
    public int selectUserListTotCnt(ComDefaultVO searchVO) {
        return (int) userRepository.count();
    }

    /**
     * 특정 사용자의 상세 정보를 조회한다.
     *
     * @param userId 사용자 ID
     * @return 사용자 상세 정보 DTO
     */
    public UserManageDto selectUser(String userId) {
        return userRepository.findById(Objects.requireNonNull(userId))
                .map(UserDtoMapper::toUserManageDto)
                .orElse(null);
    }

    /**
     * 사용자를 등록한다.
     *
     * @param dto 사용자 정보 DTO
     */
    @Transactional
    public void insertUser(UserManageDto dto) {
        // ESNTL_ID 생성 (레거시 호환용)
        String esntlId = UUID.randomUUID().toString().substring(0, 20).toUpperCase();
        String encodedPassword = passwordEncoder.encode(dto.getPassword());

        User entity = User.builder()
                .userId(dto.getUserId())
                .esntlId(Objects.requireNonNull(esntlId))
                .userNm(dto.getUserNm())
                .password(Objects.requireNonNull(encodedPassword))
                .passwordHint(dto.getPasswordHint())
                .passwordCnsr(dto.getPasswordCnsr())
                .emplNo(dto.getEmplNo())
                .sexdstnCode(dto.getSexdstnCode())
                .brth(dto.getBrthdy())
                .areaNo(dto.getAreaNo())
                .homemiddleTelno(dto.getHomemiddleTelno())
                .homeendTelno(dto.getHomeendTelno())
                .homeadres(dto.getHomeadres())
                .detailAdres(dto.getDetailAdres())
                .zip(dto.getZip())
                .moblphonNo(dto.getMoblphonNo())
                .emailAdres(dto.getEmailAdres())
                .ofcpsNm(dto.getOfcpsNm())
                .groupId(dto.getGroupId())
                .orgnztId(dto.getOrgnztId())
                .insttCode(dto.getInsttCode())
                .role(Role.USER)
                .build();
        userRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * 사용자 정보를 수정한다.
     *
     * @param dto 사용자 정보 DTO
     */
    @Transactional
    public void updateUser(UserManageDto dto) {
        User entity = userRepository.findById(Objects.requireNonNull(dto.getUserId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        entity.update(
                dto.getUserNm(), dto.getPasswordHint(), dto.getPasswordCnsr(),
                dto.getEmplNo(), null, dto.getSexdstnCode(), dto.getBrthdy(),
                dto.getAreaNo(), dto.getHomemiddleTelno(), dto.getHomeendTelno(),
                null, dto.getHomeadres(), dto.getDetailAdres(), dto.getZip(), null,
                dto.getMoblphonNo(), dto.getEmailAdres(), dto.getOfcpsNm(),
                dto.getGroupId(), dto.getOrgnztId(), dto.getInsttCode(),
                entity.getRole(), null);
    }

    /**
     * 사용자를 삭제한다.
     *
     * @param userId 사용자 ID
     */
    @Transactional
    public void deleteUser(String userId) {
        userRepository.deleteById(Objects.requireNonNull(userId));
    }

    /**
     * 여러 사용자를 일괄 삭제한다.
     *
     * @param userIds 사용자 ID 목록
     */
    @Transactional
    public void deleteUserList(List<String> userIds) {
        userRepository.deleteAllByIdInBatch(Objects.requireNonNull(userIds));
    }

    /**
     * 아이디 중복 여부를 확인한다.
     *
     * @param userId 사용자 ID
     * @return 중복 갯수 (1: 중복 있음, 0: 없음)
     */
    public int checkIdDplct(String userId) {
        return userRepository.existsById(Objects.requireNonNull(userId)) ? 1 : 0;
    }

    /**
     * 사용자의 비밀번호를 수정한다.
     *
     * @param userId      사용자 ID
     * @param newPassword 새 비밀번호
     */
    @Transactional
    public void updatePassword(String userId, String newPassword) {
        User entity = userRepository.findById(Objects.requireNonNull(userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        String encodedPassword = passwordEncoder.encode(newPassword);
        entity.updatePassword(encodedPassword);
    }
}
