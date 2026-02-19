package com.company.project.service.user;

import com.company.project.constants.Constants;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.company.project.service.user.mapper.UserMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA Í∏∞Î∞ò ?¨Ïö©??Í¥ÄÎ¶??úÎπÑ??Íµ¨ÌòÑÏ≤?
 * - ?ÑÏûê?ïÎ??ÑÎ†à?ÑÏõå??5.0 ?∏Ìôò???∏Ï¶ù ?îÍ±¥ Ï∂©Ï°±
 * - EgovAbstractServiceImpl ?ÅÏÜç Î∞?EgovUserService ?∏ÌÑ∞?òÏù¥??Íµ¨ÌòÑ
 */
@Service("egovUserService")
@Transactional(readOnly = true)
public class UserService extends EgovAbstractServiceImpl implements EgovUserService {

        private final UserRepository userRepository;
        private final UserAuthorityRepository userAuthorityRepository;
        private final PasswordEncoder passwordEncoder;
        private final UserMapper userMapper;

        public UserService(UserRepository userRepository, UserAuthorityRepository userAuthorityRepository,
                        PasswordEncoder passwordEncoder, UserMapper userMapper) {
                this.userRepository = Objects.requireNonNull(userRepository);
                this.userAuthorityRepository = Objects.requireNonNull(userAuthorityRepository);
                this.passwordEncoder = Objects.requireNonNull(passwordEncoder);
                this.userMapper = Objects.requireNonNull(userMapper);
        }

        /**
         * ?¨Ïö©??Î™©Î°ù Ï°∞Ìöå
         */
        @Override
        @Cacheable(value = "users", key = "'userList'")
        public List<UserDto> getUserList() {
                List<User> users = userRepository.findAll();

                List<String> userIds = users.stream()
                                .map(User::getEsntlId)
                                .collect(Collectors.toList());

                List<UserAuthority> authorities = userAuthorityRepository
                                .findByUniqIdIn(Objects.requireNonNull(userIds));

                Map<String, UserAuthority> authorityMap = authorities.stream()
                                .collect(Collectors.toMap(
                                                authority -> Objects.requireNonNull(authority.getUniqId()),
                                                authority -> authority));

                return users.stream()
                                .map(user -> userMapper.toDtoWithAuthority(user, authorityMap.get(user.getEsntlId())))
                                .collect(Collectors.toList());
        }

        /**
         * ?¨Ïö©??Î™©Î°ù ?òÏù¥Ïß?Ï°∞Ìöå Íµ¨ÌòÑ
         */
        @Override
        @Cacheable(value = "users", key = "'pagedUserList:' + #pageable.pageNumber + ':' + #pageable.pageSize")
        public Page<UserDto> getPagedUserList(@NonNull Pageable pageable) {
                Page<User> userPage = userRepository.findAll(Objects.requireNonNull(pageable));

                List<String> userIds = userPage.getContent().stream()
                                .map(User::getEsntlId)
                                .collect(Collectors.toList());

                List<UserAuthority> authorities = userAuthorityRepository
                                .findByUniqIdIn(Objects.requireNonNull(userIds));

                Map<String, UserAuthority> authorityMap = authorities.stream()
                                .collect(Collectors.toMap(
                                                authority -> Objects.requireNonNull(authority.getUniqId()),
                                                authority -> authority));

                List<UserDto> userDtos = userPage.getContent().stream()
                                .map(user -> userMapper.toDtoWithAuthority(user, authorityMap.get(user.getEsntlId())))
                                .collect(Collectors.toList());

                return new PageImpl<>(
                                Objects.requireNonNull(userDtos),
                                Objects.requireNonNull(userPage.getPageable()),
                                userPage.getTotalElements());
        }

        /**
         * ?¨Ïö©???ÅÏÑ∏ Ï°∞Ìöå
         */
        @Override
        @Cacheable(value = "users", key = "#id")
        public UserDto getUserById(@NonNull String id) {
                User user = userRepository.findById(Objects.requireNonNull(id))
                                .orElseGet(() -> userRepository.findByEsntlId(Objects.requireNonNull(id))
                                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND)));

                String authorCode = userAuthorityRepository.findById(Objects.requireNonNull(user.getEsntlId()))
                                .map(UserAuthority::getAuthorCode)
                                .orElse(null);

                UserAuthority authority = (authorCode != null) ? UserAuthority.builder()
                                .uniqId(Objects.requireNonNull(user.getEsntlId()))
                                .authorCode(authorCode)
                                .build() : null;

                return userMapper.toDtoWithAuthority(user, authority);
        }

        /**
         * ?¨Ïö©???±Î°ù (ÎπÑÎ?Î≤àÌò∏ ?îÌò∏???ÅÏö©)
         */
        @Transactional
        @CacheEvict(value = { Constants.Cache.USERS_CACHE }, allEntries = true)
        public String registerUser(@NonNull String userId, @NonNull String password, @NonNull String userNm,
                        String passwordHint, String passwordCnsr, Role role) {
                String esntlId = Constants.User.USER_PREFIX
                                + UUID.randomUUID().toString().substring(0, Constants.User.UUID_LENGTH);
                String encodedPassword = passwordEncoder.encode(password);

                User user = User.builder()
                                .userId(Objects.requireNonNull(userId))
                                .password(Objects.requireNonNull(encodedPassword))
                                .userNm(Objects.requireNonNull(userNm))
                                .esntlId(esntlId)
                                .passwordHint(passwordHint)
                                .passwordCnsr(passwordCnsr)
                                .role(role != null ? role : Role.USER)
                                .build();

                userRepository.save(Objects.requireNonNull(user));
                return userId;
        }

        /**
         * ?¨Ïö©???ïÎ≥¥ ?òÏ†ï
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void updateUser(@NonNull String userId, @NonNull UserDto userDto) {
                User user = userRepository.findById(Objects.requireNonNull(userId))
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
         * ÎπÑÎ?Î≤àÌò∏ Î≥ÄÍ≤?
         */
        @Transactional
        public void changePassword(@NonNull String userId, @NonNull String oldPassword, @NonNull String newPassword) {
                User user = userRepository.findById(Objects.requireNonNull(userId))
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
                        throw new BusinessException(ErrorCode.INVALID_PASSWORD);
                }

                user.updatePassword(passwordEncoder.encode(newPassword));
        }

        /**
         * ?¨Ïö©????†ú
         */
        @Override
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void deleteUser(@NonNull String userId) {
                if (!userRepository.existsById(Objects.requireNonNull(userId))) {
                        throw new BusinessException(ErrorCode.USER_NOT_FOUND);
                }
                userRepository.deleteById(Objects.requireNonNull(userId));
        }

        /**
         * ?¨Ïö©???åÏõêÍ∞Ä??(Í∏∞Ï°¥ API ?∏Ìôò?? ÎπÑÎ?Î≤àÌò∏ ?îÌò∏???ÅÏö©)
         */
        @Override
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public UserResponse signup(UserSignupRequest request) {
                UserValidator.validateUserSignupRequest(Objects.requireNonNull(request));

                if (userRepository.existsById(Objects.requireNonNull(request.userId()))) {
                        throw new BusinessException(ErrorCode.DUPLICATE_USER_ID);
                }

                String esntlId = "USR_" + UUID.randomUUID().toString().substring(0, 16);
                String encodedPassword = passwordEncoder.encode(request.password());

                User user = User.builder()
                                .userId(Objects.requireNonNull(request.userId()))
                                .password(Objects.requireNonNull(encodedPassword))
                                .userNm(Objects.requireNonNull(request.userNm()))
                                .esntlId(esntlId)
                                .passwordHint(request.passwordHint())
                                .passwordCnsr(request.passwordCnsr())
                                .role(request.role() != null ? request.role() : Role.USER)
                                .build();

                userRepository.save(Objects.requireNonNull(user));
                return userMapper.toResponse(user);
        }

        /**
         * ÎπÑÎ?Î≤àÌò∏ Í≤ÄÏ¶?
         */
        @Override
        public boolean verifyPassword(@NonNull String rawPassword, @NonNull String encodedPassword) {
                return passwordEncoder.matches(rawPassword, encodedPassword);
        }
}
