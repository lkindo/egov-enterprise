package com.company.project.service.user;

import com.company.project.constants.Constants;
import com.company.project.service.user.mapper.UserDtoMapper;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.dto.UserManageDto;
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
import java.util.stream.Collectors;

/**
 * ?ъ슜??愿由??쒕퉬??
 */
@Service("projectUserManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserManageService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * ?ъ슜??紐⑸줉 議고쉶
     */
    public List<UserManageDto> selectUserList(ComDefaultVO searchVO) {
        int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
        int pageUnit = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
        Pageable pageable = PageRequest.of(pageIndex, pageUnit);

        Page<User> page = userRepository.findAll(Objects.requireNonNull(pageable));
        return page.getContent().stream()
                .map(node -> Objects.requireNonNull(UserDtoMapper.toUserManageDto(Objects.requireNonNull(node))))
                .collect(Collectors.toList());
    }

    /**
     * ?ъ슜??紐⑸줉 珥?嫄댁닔
     */
    public int selectUserListTotCnt(ComDefaultVO searchVO) {
        return (int) userRepository.count();
    }

    /**
     * ?ъ슜???곸꽭 議고쉶
     */
    public UserManageDto selectUser(String userId) {
        return userRepository.findById(Objects.requireNonNull(userId))
                .map(node -> Objects.requireNonNull(UserDtoMapper.toUserManageDto(Objects.requireNonNull(node))))
                .orElse(null);
    }

    /**
     * ?ъ슜???곸꽭 議고쉶 (G-ID/ESNTL_ID 湲곗?)
     */
    public UserManageDto selectUserByEsntlId(String esntlId) {
        return userRepository.findByEsntlId(Objects.requireNonNull(esntlId))
                .map(node -> Objects.requireNonNull(UserDtoMapper.toUserManageDto(Objects.requireNonNull(node))))
                .orElse(null);
    }

    /**
     * ?ъ슜???깅줉
     */
    @Transactional
    public void insertUser(UserManageDto dto) {
        String esntlId = Constants.User.USRCNFRM_PREFIX
                + UUID.randomUUID().toString().substring(0, Constants.User.ESNTL_ID_UUID_LENGTH).toUpperCase();
        String encodedPassword = passwordEncoder.encode(dto.getPassword());

        User entity = User.builder()
                .userId(Objects.requireNonNull(dto.getUserId()))
                .esntlId(esntlId)
                .userNm(Objects.requireNonNull(dto.getUserNm()))
                .password(Objects.requireNonNull(encodedPassword))
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
        userRepository.save(Objects.requireNonNull(entity));
    }

    /**
     * ?ъ슜???섏젙
     */
    @Transactional
    public void updateUser(UserManageDto dto) {
        User entity = userRepository.findById(Objects.requireNonNull(dto.getUserId()))
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
     * ?ъ슜????젣
     */
    @Transactional
    public void deleteUser(String userId) {
        userRepository.deleteById(Objects.requireNonNull(userId));
    }

    /**
     * ?ъ슜????젣 (List)
     */
    @Transactional
    public void deleteUserList(List<String> userIds) {
        userRepository.deleteAllByIdInBatch(Objects.requireNonNull(userIds));
    }

    /**
     * ?꾩씠??以묐났 ?뺤씤
     */
    public int checkIdDplct(String userId) {
        return userRepository.existsById(Objects.requireNonNull(userId)) ? 1 : 0;
    }

    /**
     * 鍮꾨?踰덊샇 蹂寃?
     */
    @Transactional
    public void updatePassword(String userId, String newPassword) {
        User entity = userRepository.findById(Objects.requireNonNull(userId))
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        String encodedPassword = passwordEncoder.encode(newPassword);
        entity.updatePassword(encodedPassword);
    }
}
