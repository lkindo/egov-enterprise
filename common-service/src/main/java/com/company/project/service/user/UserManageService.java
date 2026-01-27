package com.company.project.service.user;

import com.company.project.domain.user.Role;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.user.dto.UserManageDto;
import egovframework.com.cmm.ComDefaultVO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 사용자 관리 서비스
 */
@Service("projectUserManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserManageService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 사용자 목록 조회
     */
    public List<UserManageDto> selectUserList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<User> page = userRepository.findAll(pageable);
        return page.getContent().stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * 사용자 목록 총 건수
     */
    public int selectUserListTotCnt(ComDefaultVO searchVO) {
        return (int) userRepository.count();
    }

    /**
     * 사용자 상세 조회
     */
    public UserManageDto selectUser(String userId) {
        return userRepository.findById(userId)
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * 사용자 상세 조회 (G-ID/ESNTL_ID 기준)
     */
    public UserManageDto selectUserByEsntlId(String esntlId) {
        return userRepository.findByEsntlId(esntlId)
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * 사용자 등록
     */
    @Transactional
    public void insertUser(UserManageDto dto) {
        String esntlId = "USRCNFRM_" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        String encodedPassword = passwordEncoder.encode(dto.getPassword());

        User entity = User.builder()
                .userId(dto.getUserId())
                .esntlId(esntlId)
                .userNm(dto.getUserNm())
                .password(encodedPassword)
                .passwordHint(dto.getPasswordHint())
                .passwordCnsr(dto.getPasswordCnsr())
                .emplNo(dto.getEmplNo())
                .sexdstnCode(dto.getSexdstnCode())
                .brth(dto.getBrthdy())
                .areaNo(dto.getAreaNo())
                .homemiddleTelno(dto.getHomemiddleTelno())
                .homeendTelno(dto.getHomeendTelno())
                .moblphonNo(dto.getMoblphonNo())
                .emailAdres(dto.getEmailAdres())
                .zip(dto.getZip())
                .homeadres(dto.getHomeadres())
                .detailAdres(dto.getDetailAdres())
                .ofcpsNm(dto.getOfcpsNm())
                .groupId(dto.getGroupId())
                .orgnztId(dto.getOrgnztId())
                .insttCode(dto.getInsttCode())
                .role(Role.USER)
                .build();
        userRepository.save(entity);
    }

    /**
     * 사용자 수정
     */
    @Transactional
    public void updateUser(UserManageDto dto) {
        User entity = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found: " + dto.getUserId()));
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
     * 사용자 삭제
     */
    @Transactional
    public void deleteUser(String userId) {
        userRepository.deleteById(userId);
    }

    /**
     * 사용자 삭제 (List)
     */
    @Transactional
    public void deleteUserList(List<String> userIds) {
        userRepository.deleteAllByIdInBatch(userIds);
    }

    /**
     * 아이디 중복 확인
     */
    public int checkIdDplct(String userId) {
        return userRepository.existsById(userId) ? 1 : 0;
    }

    /**
     * 비밀번호 변경
     */
    @Transactional
    public void updatePassword(String userId, String newPassword) {
        User entity = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        String encodedPassword = passwordEncoder.encode(newPassword);
        entity.updatePassword(encodedPassword);
    }

    private UserManageDto toDto(User entity) {
        return UserManageDto.builder()
                .userId(entity.getUserId())
                .esntlId(entity.getEsntlId())
                .userNm(entity.getUserNm())
                .sexdstnCode(entity.getSexdstnCode())
                .brthdy(entity.getBrth())
                .areaNo(entity.getAreaNo())
                .homemiddleTelno(entity.getHomemiddleTelno())
                .homeendTelno(entity.getHomeendTelno())
                .moblphonNo(entity.getMoblphonNo())
                .emailAdres(entity.getEmailAdres())
                .zip(entity.getZip())
                .homeadres(entity.getHomeadres())
                .detailAdres(entity.getDetailAdres())
                .ofcpsNm(entity.getOfcpsNm())
                .groupId(entity.getGroupId())
                .orgnztId(entity.getOrgnztId())
                .insttCode(entity.getInsttCode())
                .emplyrSttusCode(entity.getRole() != null ? entity.getRole().name() : null)
                .sbscrbDe(entity.getSbscrbDe() != null
                        ? entity.getSbscrbDe().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : null)
                .subDn(entity.getSubDn())
                .build();
    }
}
