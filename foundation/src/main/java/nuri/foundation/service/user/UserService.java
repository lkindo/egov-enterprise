package nuri.foundation.service.user;

import nuri.foundation.constants.Constants;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.user.entity.Role;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.service.user.dto.UserSignupRequest;
import nuri.foundation.service.user.mapper.UserMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA 기반 사용자 관리 서비스 구현체
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건 충족
 * - BaseAbstractService 상속으로 중복 코드 제거
 */
@Service("egovUserService")
@Transactional(readOnly = true)
public class UserService extends BaseAbstractService implements EgovUserService {

        private final UserRepository userRepository;
        private final UserAuthorityRepository userAuthorityRepository;
        private final PasswordEncoder passwordEncoder;
        private final UserMapper userMapper;

        public UserService(UserRepository userRepository, UserAuthorityRepository userAuthorityRepository,
                        PasswordEncoder passwordEncoder, UserMapper userMapper) {
                this.userRepository = required(userRepository, "UserRepository 는 null 일 수 없습니다");
                this.userAuthorityRepository = required(userAuthorityRepository,
                                "UserAuthorityRepository 는 null 일 수 없습니다");
                this.passwordEncoder = required(passwordEncoder, "PasswordEncoder 는 null 일 수 없습니다");
                this.userMapper = required(userMapper, "UserMapper 는 null 일 수 없습니다");
        }

        /**
         * 사용자 목록 조회 (N+1 쿼리 개선 버전)
         */
        @Override
        @Cacheable(value = "users", key = "'userList'")
        public List<UserDto> getUserList() {
                // [성능 개선] 단일 쿼리로 사용자와 권한 정보를 함께 조회 (N+1 방지)
                List<Object[]> results = userRepository.findAllWithAuthorities();

                // 사용자와 권한 매핑
                Map<String, User> userMap = new java.util.LinkedHashMap<>();
                Map<String, UserAuthority> authorityMap = new java.util.HashMap<>();

                for (Object[] result : results) {
                        User user = (User) result[0];
                        UserAuthority authority = (UserAuthority) result[1];

                        userMap.put(user.getEsntlId(), user);
                        if (authority != null) {
                                authorityMap.put(authority.getUniqId(), authority);
                        }
                }

                return userMap.values().stream()
                                .map(user -> userMapper.toDtoWithAuthority(user, authorityMap.get(user.getEsntlId())))
                                .collect(Collectors.toList());
        }

        /**
         * 사용자 목록 페이지 조회 구현
         */
        @Override
        @Cacheable(value = "users", key = "'pagedUserList:' + (#searchKeyword ?: '') + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
        public Page<UserDto> getPagedUserList(String searchKeyword, @NonNull Pageable pageable) {
                Page<User> userPage;
                if (org.springframework.util.StringUtils.hasText(searchKeyword)) {
                        userPage = userRepository.findByUserIdContainingIgnoreCaseOrUserNmContainingIgnoreCase(searchKeyword, searchKeyword, required(pageable));
                } else {
                        userPage = userRepository.findAll(required(pageable, "Pageable 은 null 일 수 없습니다"));
                }

                List<String> userIds = userPage.getContent().stream()
                                .map(User::getEsntlId)
                                .collect(Collectors.toList());

                if (userIds.isEmpty()) {
                        return new PageImpl<>(java.util.Collections.emptyList(), pageable, userPage.getTotalElements());
                }

                List<UserAuthority> authorities = userAuthorityRepository
                                .findByUniqIdIn(required(userIds, "사용자 ID 목록은 null 일 수 없습니다"));

                Map<String, UserAuthority> authorityMap = authorities.stream()
                                .collect(Collectors.toMap(
                                                authority -> required(authority.getUniqId(), "권한 ID 는 null 일 수 없습니다"),
                                                authority -> authority));

                List<UserDto> userDtos = userPage.getContent().stream()
                                .map(user -> userMapper.toDtoWithAuthority(user, authorityMap.get(user.getEsntlId())))
                                .collect(Collectors.toList());

                return new PageImpl<>(userDtos, userPage.getPageable(), userPage.getTotalElements());
        }

        /**
         * 사용자 목록 페이지 조회 (검색어 없음)
         */
        @Override
        public Page<UserDto> getUserPage(@NonNull Pageable pageable) {
                return getPagedUserList(null, pageable);
        }

        /**
         * 사용자 목록 페이지 조회 (기본 페이징 적용)
         */
        @Override
        public Page<UserDto> searchUserPage(String searchKeyword) {
                return getPagedUserList(searchKeyword, org.springframework.data.domain.PageRequest.of(0, 10));
        }

        /**
         * 사용자 상세 조회
         */
        @Override
        @Cacheable(value = "users", key = "#id")
        public UserDto getUserById(@NonNull String id) {
                User user = userRepository.findById(required(id, "사용자 ID 는 null 일 수 없습니다"))
                                .orElseGet(() -> userRepository.findByEsntlId(required(id, "사용자 ID 는 null 일 수 없습니다"))
                                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND)));

                String authorCode = userAuthorityRepository
                                .findById(required(user.getEsntlId(), "사용자 고유 ID 는 null 일 수 없습니다"))
                                .map(UserAuthority::getAuthorCode)
                                .orElse(null);

                UserAuthority authority = (authorCode != null) ? UserAuthority.builder()
                                .uniqId(required(user.getEsntlId()))
                                .authorCode(authorCode)
                                .build() : null;

                return userMapper.toDtoWithAuthority(user, authority);
        }

        /**
         * 사용자 등록 (비밀번호 암호화 적용)
         */
        @Transactional
        @CacheEvict(value = { Constants.Cache.USERS_CACHE }, allEntries = true)
        public String registerUser(@NonNull String userId, @NonNull String password, @NonNull String userNm,
                        String passwordHint, String passwordCnsr, Role role) {
                String esntlId = Constants.User.USER_PREFIX
                                + UUID.randomUUID().toString().substring(0, Constants.User.UUID_LENGTH);
                String encodedPassword = passwordEncoder.encode(password);

                User user = User.builder()
                                .userId(notBlank(userId, "User ID 는 null 이거나 빈 값일 수 없습니다"))
                                .password(notBlank(encodedPassword, "Password 는 null 이거나 빈 값일 수 없습니다"))
                                .userNm(notBlank(userNm, "사용자 이름은 null 이거나 빈 값일 수 없습니다"))
                                .esntlId(esntlId)
                                .passwordHint(passwordHint)
                                .passwordCnsr(passwordCnsr)
                                .role(role != null ? role : Role.USER)
                                .build();

                userRepository.save(required(user));

                // 권한 정보 저장
                UserAuthority authority = UserAuthority.builder()
                                .uniqId(user.getEsntlId())
                                .authorCode("ROLE_" + user.getRole().name())
                                .mberTyCode("USR")
                                .build();
                userAuthorityRepository.save(authority);

                return userId;
        }

        /**
         * 사용자 정보 수정
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void updateUser(@NonNull String userId, @NonNull UserDto userDto) {
                User user = userRepository.findById(required(userId, "사용자 ID 는 null 일 수 없습니다"))
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
                                user.getSubDn());
        }

        /**
         * 비밀번호 변경
         */
        @Transactional
        public void changePassword(@NonNull String userId, @NonNull String oldPassword, @NonNull String newPassword) {
                User user = userRepository.findById(required(userId, "사용자 ID 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
                        throw new BusinessException(ErrorCode.INVALID_PASSWORD);
                }

                user.updatePassword(passwordEncoder.encode(newPassword));
        }

        /**
         * 사용자 삭제
         */
        @Override
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void deleteUser(@NonNull String userId) {
                if (!userRepository.existsById(required(userId, "사용자 ID 는 null 일 수 없습니다"))) {
                        throw new BusinessException(ErrorCode.USER_NOT_FOUND);
                }
                userRepository.deleteById(required(userId));
        }

        /**
         * 사용자 회원가입 (기존 API 호환 및 비밀번호 암호화 적용)
         */
        @Override
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public UserResponse signup(UserSignupRequest request) {
                UserValidator.validateUserSignupRequest(required(request, "회원가입 요청은 null 일 수 없습니다"));

                if (userRepository.existsById(required(request.getUserId(), "사용자 ID 는 null 일 수 없습니다"))) {
                        throw new BusinessException(ErrorCode.DUPLICATE_USER_ID);
                }

                String esntlId = "USR_" + UUID.randomUUID().toString().substring(0, 16);
                String encodedPassword = passwordEncoder.encode(request.getPassword());

                User user = User.builder()
                                .userId(required(request.getUserId()))
                                .password(required(encodedPassword))
                                .userNm(required(request.getUserNm()))
                                .esntlId(esntlId)
                                .passwordHint(request.getPasswordHint())
                                .passwordCnsr(request.getPasswordCnsr())
                                .role(request.getRole() != null ? Role.valueOf(request.getRole()) : Role.USER)
                                .build();

                userRepository.save(required(user));

                // 권한 정보 저장
                UserAuthority authority = UserAuthority.builder()
                                .uniqId(user.getEsntlId())
                                .authorCode("ROLE_" + user.getRole().name())
                                .mberTyCode("USR")
                                .build();
                userAuthorityRepository.save(authority);

                return userMapper.toResponse(user);
        }

        /**
         * 비밀번호 검증
         */
        @Override
        public boolean verifyPassword(@NonNull String rawPassword, @NonNull String encodedPassword) {
                return passwordEncoder.matches(rawPassword, encodedPassword);
        }

        /**
         * 여러 사용자를 한꺼번에 삭제합니다.
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void deleteUserList(@NonNull List<String> userIds) {
                userRepository.deleteAllByIdInBatch(required(userIds, "사용자 ID 목록은 null 일 수 없습니다"));
        }

        /**
         * 아이디 중복 여부를 확인합니다.
         */
        public boolean checkIdDplct(@NonNull String userId) {
                return userRepository.existsById(required(userId, "사용자 ID 는 null 일 수 없습니다"));
        }

        /**
         * 관리자 권한으로 비밀번호를 변경합니다. (기존 비밀번호 확인 없음)
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void updatePasswordByAdmin(@NonNull String userId, @NonNull String newPassword) {
                User user = userRepository.findById(required(userId, "사용자 ID 는 null 일 수 없습니다"))
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
                user.updatePassword(passwordEncoder.encode(newPassword));
        }
}
