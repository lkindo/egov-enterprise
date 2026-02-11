package com.company.project.service.user;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.user.Role;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA 기반 사용자 관리 서비스 구현체
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족
 * - EgovAbstractServiceImpl 상속 및 EgovUserService 인터페이스 구현
 */
@Service("egovUserService")
@Transactional(readOnly = true)
public class UserService extends EgovAbstractServiceImpl implements EgovUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 사용자 목록 조회
     */
    @Override
    public List<UserDto> getUserList() {
        return userRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 사용자 목록 페이징 조회 구현
     */
    @Override
    public org.springframework.data.domain.Page<UserDto> getPagedUserList(
            org.springframework.data.domain.Pageable pageable) {
        return userRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    /**
     * 사용자 상세 조회
     */
    @Override
    public UserDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseGet(() -> userRepository.findByEsntlId(id)
                        .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND)));
        return convertToDto(user);
    }

    /**
     * 사용자 등록 (비밀번호 암호화 적용)
     */
    @Override
    @Transactional
    public String registerUser(String userId, String password, String userNm,
            String passwordHint, String passwordCnsr, Role role) {
        String esntlId = "USR_" + UUID.randomUUID().toString().substring(0, 16);
        String encodedPassword = passwordEncoder.encode(password);

        User user = User.builder()
                .userId(userId)
                .password(encodedPassword)
                .userNm(userNm)
                .esntlId(esntlId)
                .passwordHint(passwordHint)
                .passwordCnsr(passwordCnsr)
                .role(role != null ? role : Role.USER)
                .build();

        userRepository.save(user);
        return userId;
    }

    private UserDto convertToDto(User user) {
        return UserDto.builder()
                .userId(user.getUserId())
                .userNm(user.getUserNm())
                .esntlId(user.getEsntlId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .createdDate(user.getSbscrbDe())
                .build();
    }

    /**
     * 사용자 회원가입 (기존 API 호환성, 비밀번호 암호화 적용)
     */
    @Override
    @Transactional
    public UserResponse signup(UserSignupRequest request) {
        // 중복 사용자 체크
        if (userRepository.existsById(request.userId())) {
            throw new BusinessException(ErrorCode.DUPLICATE_USER_ID);
        }

        String esntlId = "USR_" + UUID.randomUUID().toString().substring(0, 16);
        String encodedPassword = passwordEncoder.encode(request.password());

        User user = User.builder()
                .userId(request.userId())
                .password(encodedPassword)
                .userNm(request.userNm())
                .esntlId(esntlId)
                .passwordHint(request.passwordHint())
                .passwordCnsr(request.passwordCnsr())
                .role(request.role() != null ? request.role() : Role.USER)
                .build();

        userRepository.save(user);
        return UserResponse.from(user);
    }

    /**
     * 비밀번호 검증
     */
    @Override
    public boolean verifyPassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }
}
