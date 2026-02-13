package com.company.project.service.user;

import com.company.project.constants.Constants;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

/**
 * JPA 기반 사용자 관리 서비스 구현체
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족
 * - EgovAbstractServiceImpl 상속 및 EgovUserService 인터페이스 구현
 */
@Service("egovUserService")
@Transactional(readOnly = true)
public class UserService extends EgovAbstractServiceImpl implements EgovUserService {

    private final UserRepository userRepository;
    private final UserAuthorityRepository userAuthorityRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, UserAuthorityRepository userAuthorityRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userAuthorityRepository = userAuthorityRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 사용자 목록 조회
     */
    @Override
    @Cacheable(value = "users", key = "'userList'")
    public List<UserDto> getUserList() {
        List<User> users = userRepository.findAll();
        
        // 사용자 ID 목록 추출
        List<String> userIds = users.stream()
                .map(User::getEsntlId)
                .collect(Collectors.toList());
        
        // 권한 정보 한 번에 조회
        List<UserAuthority> authorities = userAuthorityRepository.findByUniqIdIn(userIds);
        
        // 권한 정보를 맵으로 변환 (uniqId -> UserAuthority)
        Map<String, UserAuthority> authorityMap = authorities.stream()
                .collect(Collectors.toMap(UserAuthority::getUniqId, authority -> authority));
        
        // 사용자 정보와 권한 정보를 결합하여 DTO 생성
        return users.stream()
                .map(user -> convertToDtoWithAuthority(user, authorityMap.get(user.getEsntlId())))
                .collect(Collectors.toList());
    }

    /**
     * 사용자 목록 페이징 조회 구현
     */
    @Override
    @Cacheable(value = "users", key = "'pagedUserList:' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public org.springframework.data.domain.Page<UserDto> getPagedUserList(
            org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<User> userPage = userRepository.findAll(pageable);
        
        // 사용자 ID 목록 추출
        List<String> userIds = userPage.getContent().stream()
                .map(User::getEsntlId)
                .collect(Collectors.toList());
        
        // 권한 정보 한 번에 조회
        List<UserAuthority> authorities = userAuthorityRepository.findByUniqIdIn(userIds);
        
        // 권한 정보를 맵으로 변환 (uniqId -> UserAuthority)
        Map<String, UserAuthority> authorityMap = authorities.stream()
                .collect(Collectors.toMap(UserAuthority::getUniqId, authority -> authority));
        
        // 사용자 정보와 권한 정보를 결합하여 DTO 생성
        List<UserDto> userDtos = userPage.getContent().stream()
                .map(user -> convertToDtoWithAuthority(user, authorityMap.get(user.getEsntlId())))
                .collect(Collectors.toList());
        
        // 새로운 Page 객체 생성 (기존 페이지 정보 유지)
        return new org.springframework.data.domain.PageImpl<>(
                userDtos, 
                userPage.getPageable(), 
                userPage.getTotalElements()
        );
    }

    /**
     * 사용자 상세 조회
     */
    @Override
    @Cacheable(value = "users", key = "#id")
    public UserDto getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseGet(() -> userRepository.findByEsntlId(id)
                        .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND)));
        
        // 사용자 권한 정보 조회
        UserAuthority authority = userAuthorityRepository.findById(user.getEsntlId())
                .orElse(null);
        
        return convertToDtoWithAuthority(user, authority);
    }

    /**
     * 사용자 등록 (비밀번호 암호화 적용)
     */
    @Transactional
    @CacheEvict(value = {Constants.Cache.USERS_CACHE}, allEntries = true) // 사용자 목록 캐시 전체 무효화
    public String registerUser(String userId, String password, String userNm,
            String passwordHint, String passwordCnsr, Role role) {
        String esntlId = Constants.User.USER_PREFIX + UUID.randomUUID().toString().substring(0, Constants.User.UUID_LENGTH);
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
        if (user == null) {
            return null;
        }

        return UserDto.builder()
                .userId(user.getUserId())
                .userNm(user.getUserNm())
                .esntlId(user.getEsntlId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .createdDate(user.getSbscrbDe())
                .build();
    }

    /**
     * 사용자 정보 수정
     */
    @Transactional
    @CacheEvict(value = {"users"}, allEntries = true)
    public void updateUser(String userId, UserDto userDto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        user.update(
                userDto.getUserNm(),
                user.getPasswordHint(),
                user.getPasswordCnsr(),
                userDto.getEmplNo(),
                user.getIhidnum(),
                user.getSexdstnCode(),
                user.getBrth(),
                user.getAreaNo(),
                user.getHomemiddleTelno(),
                user.getHomeendTelno(),
                user.getFxnum(),
                user.getHomeadres(),
                user.getDetailAdres(),
                user.getZip(),
                user.getOffmTelno(),
                user.getMoblphonNo(),
                user.getEmailAdres(),
                userDto.getOfcpsNm(),
                user.getGroupId(),
                user.getOrgnztId(),
                user.getInsttCode(),
                user.getRole(),
                user.getSubDn()
        );
    }

    /**
     * 비밀번호 변경
     */
    @Transactional
    public void changePassword(String userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }

        user.updatePassword(passwordEncoder.encode(newPassword));
    }

    private UserDto convertToDtoWithAuthority(User user, UserAuthority authority) {
        UserDto userDto = convertToDto(user);
        if (userDto != null && authority != null && authority.getAuthorCode() != null) {
            // 권한 코드가 있는 경우, 해당 권한 코드로 역할을 덮어씀
            return UserDto.builder()
                    .userId(userDto.getUserId())
                    .userNm(userDto.getUserNm())
                    .esntlId(userDto.getEsntlId())
                    .role(authority.getAuthorCode())
                    .emplNo(userDto.getEmplNo())
                    .ofcpsNm(userDto.getOfcpsNm())
                    .createdDate(userDto.getCreatedDate())
                    .build();
        }
        return userDto;
    }

    /**
     * 사용자 회원가입 (기존 API 호환성, 비밀번호 암호화 적용)
     */
    @Override
    @Transactional
    @CacheEvict(value = {"users"}, allEntries = true) // 사용자 목록 캐시 전체 무효화
    public UserResponse signup(UserSignupRequest request) {
        // 입력값 검증
        UserValidator.validateUserSignupRequest(request);
        
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
