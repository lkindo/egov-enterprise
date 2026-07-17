package nuri.business.service.user;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.constants.Constants;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.auth.RefreshTokenRepository;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.login.LoginPolicyRepository;
import nuri.business.domain.system.content.community.CommunityUserRepository;
import nuri.business.domain.user.entity.Role;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserResponse;
import nuri.business.service.user.dto.UserSignupRequest;
import nuri.business.service.user.event.UserDeletionEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * JPA 기반 사용자 관리 서비스 구현체
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건 충족
 * - BaseAbstractService 상속으로 중복 코드 제거
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class UserService extends BaseAbstractService {


        private final UserRepository userRepository;
        private final UserAuthorityRepository userAuthorityRepository;
        private final RefreshTokenRepository refreshTokenRepository;
        private final LoginPolicyRepository loginPolicyRepository;
        private final nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository;
        private final CommunityUserRepository communityUserRepository;
        private final nuri.business.domain.log.UserLogRepository userLogRepository;
        private final PasswordEncoder passwordEncoder;
        private final ApplicationEventPublisher eventPublisher;

        public UserService(UserRepository userRepository, UserAuthorityRepository userAuthorityRepository,
                        RefreshTokenRepository refreshTokenRepository, LoginPolicyRepository loginPolicyRepository,
                        nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository,
                        CommunityUserRepository communityUserRepository,
                        nuri.business.domain.log.UserLogRepository userLogRepository, PasswordEncoder passwordEncoder,
                        ApplicationEventPublisher eventPublisher) {
                this.userRepository = required(userRepository, "UserRepository 는 null 일 수 없습니다");
                this.userAuthorityRepository = required(userAuthorityRepository,
                                "UserAuthorityRepository 는 null 일 수 없습니다");
                this.refreshTokenRepository = required(refreshTokenRepository,
                                "RefreshTokenRepository 는 null 일 수 없습니다");
                this.loginPolicyRepository = required(loginPolicyRepository,
                                "LoginPolicyRepository 는 null 일 수 없습니다");
                this.userAbsenceRepository = required(userAbsenceRepository,
                                "UserAbsenceRepository 는 null 일 수 없습니다");
                this.communityUserRepository = required(communityUserRepository,
                                "CommunityUserRepository 는 null 일 수 없습니다");
                this.userLogRepository = required(userLogRepository, "UserLogRepository 는 null 일 수 없습니다");
                this.passwordEncoder = required(passwordEncoder, "PasswordEncoder 는 null 일 수 없습니다");
                this.eventPublisher = required(eventPublisher, "ApplicationEventPublisher 는 null 일 수 없습니다");
        }

        /**
         * 사용자 목록 조회 (N+1 쿼리 개선 버전)
         */
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
                                authorityMap.put(authority.getScrtyDcsnTrgtId(), authority);
                        }
                }

                return userMap.values().stream()
                                .map(user -> UserDto.from(user, authorityMap.get(user.getEsntlId())))
                                .collect(Collectors.toList());
        }

        /**
         * 사용자 목록 페이지 조회 구현
         */
        @Cacheable(value = "users", key = "'pagedUserList:' + (#searchKeyword ?: '') + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
        public Page<UserDto> getPagedUserList(String searchKeyword, @NonNull Pageable pageable) {
                return userRepository.getPagedUserList(searchKeyword, required(pageable, "Pageable 은 null 일 수 없습니다"));
        }


        /**
         * 사용자 목록 페이지 조회 (검색어 없음)
         */
        public Page<UserDto> getUserPage(@NonNull Pageable pageable) {
                return getPagedUserList(null, pageable);
        }

        /**
         * 사용자 목록 페이지 조회 (기본 페이징 적용)
         */
        public Page<UserDto> searchUserPage(String searchKeyword) {
                return getPagedUserList(searchKeyword, org.springframework.data.domain.PageRequest.of(0, 10));
        }

        /**
         * 사용자 상세 조회
         */
        @Cacheable(value = "users", key = "#id")
        public UserDto getUserById(@NonNull String id) {
                // 로그인 ID 또는 PK(esntlId) 중 어느 핸들로도 조회 허용.
                // (User @Id == esntlId 이므로 findById 와 findByEsntlId 는 동일 쿼리 → 후자 중복 분기 제거)
                User user = userRepository.findByUserId(id)
                                .or(() -> userRepository.findById(id))
                                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

                String authorCode = userAuthorityRepository
                                .findById(required(user.getEsntlId(), "사용자 고유 ID 는 null 일 수 없습니다"))
                                .map(auth -> auth.getAuthrtId())
                                .orElse(null);

                UserAuthority authority = (authorCode != null) ? UserAuthority.builder()
                                .scrtyDcsnTrgtId(required(user.getEsntlId()))
                                .authrtId(authorCode)
                                .build() : null;

                return UserDto.from(user, authority);
        }

        /**
         * 사용자 등록 (비밀번호 암호화 적용)
         */
        @Transactional
        @CacheEvict(value = { Constants.Cache.USERS_CACHE }, allEntries = true)
        public String registerUser(@NonNull String userId, @NonNull String pswd, @NonNull String userNm,
                        String pswdHint, String pswdCrans, String roleName) {
                required(userId, "사용자 ID 는 null 일 수 없습니다");
                required(pswd, "비밀번호 는 null 일 수 없습니다");
                required(userNm, "사용자 이름 은 null 일 수 없습니다");

                // [보안] 관리자 권한 확인
                if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }

                // [안정성] ID 중복 체크 (통합 테이블 내 userId 필드 기준)
                if (userRepository.findByUserId(userId).isPresent()) {
                        throw new BusinessException(UserErrorCode.DUPLICATE_USER_ID);
                }

                String esntlId = nuri.foundation.core.util.IdGenerationUtil.generateUserId();
                String encodedPassword = passwordEncoder.encode(pswd);

                Role role = Role.USER;
                if (org.springframework.util.StringUtils.hasText(roleName)) {
                        try {
                                role = Role.valueOf(roleName);
                        } catch (IllegalArgumentException e) {
                                log.warn("Invalid role name: {}, defaulting to ROLE_USER", roleName);
                        }
                }

                User user = User.builder()
                                .userId(userId)
                                .pswd(encodedPassword)
                                .userNm(userNm)
                                .esntlId(esntlId)
                                .pswdHint(pswdHint)
                                .pswdCrans(pswdCrans)
                                .role(role)
                                .build();


                userRepository.save(required(user));

                // 권한 정보 저장
                UserAuthority authority = UserAuthority.builder()
                                .scrtyDcsnTrgtId(user.getEsntlId())
                                .authrtId("ROLE_" + user.getRole().name())
                                .mbrTypeCd("USR")
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
                User user = userRepository.findByUserId(userId)
                                .or(() -> userRepository.findById(userId))
                                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

                // [보안] 본인 또는 관리자만 수정 가능
                String currentUserId = nuri.business.security.util.SecurityUtil.getCurrentEsntlId()
                                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
                if (!currentUserId.equals(userId) && !nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }

                user.update(
                                userDto.userNm(),
                                user.getPswdHint(),
                                user.getPswdCrans(),
                                userDto.emplNo(),
                                user.getRrno(),
                                user.getGndrCd(),
                                user.getBrthYmd(),
                                userDto.areaNo(),
                                userDto.middleTelno(),
                                userDto.endTelno(),
                                userDto.faxNo(),
                                userDto.homeAddr(),
                                userDto.daddr(),
                                userDto.zip(),
                                userDto.officeTelno(),
                                userDto.mblTelno(),
                                userDto.emlAddr(),
                                userDto.ofcpsNm(),
                                userDto.groupId(),
                                userDto.ognzId(),
                                userDto.pstinstCd(),
                                user.getRole(),
                                user.getCertDnVl());
        }

        /**
         * 비밀번호 변경
         */
        @Transactional
        public void changePassword(@NonNull String userId, @NonNull String oldPassword, @NonNull String newPassword) {
                User user = userRepository.findByUserId(userId)
                                .or(() -> userRepository.findById(userId))
                                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));


                if (!passwordEncoder.matches(oldPassword, user.getPswd())) {
                        throw new BusinessException(UserErrorCode.INVALID_PASSWORD);
                }

                user.updatePassword(passwordEncoder.encode(newPassword));
        }

        /**
         * 사용자 삭제
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void deleteUser(@NonNull String userId) {
                // [보안] 관리자 권한 확인
                if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }

                if (!userRepository.findByUserId(userId).isPresent() && !userRepository.existsById(userId)) {
                        throw new BusinessException(UserErrorCode.USER_NOT_FOUND);
                }

                User user = userRepository.findByUserId(userId)
                                .or(() -> userRepository.findById(userId))
                                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

                cleanupDependentsAndDelete(List.of(user));
        }

        /**
         * [무결성/V2_12 결속] 사용자 삭제 전 종속 데이터 정리 후 일괄 삭제.
         *
         * <p>V2_12 가 tb_user_authrt_map·tb_bbs_item·tb_bbs_comment·tb_adbk_manage·tb_user_noti 에
         * tb_user_info(esntl_id) FK(NO ACTION)를 부여했으므로, 사용자 행 삭제 전에 같은 트랜잭션에서
         * 종속 행을 반드시 정리해야 한다. 정리하지 않으면 커밋 시 FK 위반으로 삭제가 실패한다.
         * <ul>
         *   <li>보안 인가 매핑(tb_user_authrt_map)·리프레시 토큰: 여기서 직접 삭제</li>
         *   <li>콘텐츠(게시글/댓글/주소록)·알림: {@link UserDeletionEvent} 동기 발행 →
         *       business-app 의 UserDeletionCleanupListener 가 동일 트랜잭션에서
         *       콘텐츠는 webmaster 재귀속, 알림은 삭제 처리</li>
         *   <li>시스템 관리자 계정(webmaster)은 재귀속 종착지이므로 삭제 금지</li>
         * </ul>
         */
        private void cleanupDependentsAndDelete(List<User> users) {
                if (users.isEmpty()) {
                        return;
                }
                List<String> esntlIds = users.stream().map(User::getEsntlId).collect(Collectors.toList());
                if (esntlIds.contains(Constants.User.SYSTEM_ADMIN_ESNTL_ID)) {
                        // 재귀속 종착 계정이 사라지면 콘텐츠 보존 정책 자체가 붕괴한다
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }
                userAuthorityRepository.deleteAllByIdInBatch(esntlIds);
                for (User user : users) {
                        // [P2 키 규약] tb_auth_rfsh_tk 는 esntlId 단일 키잉 — 발급/로그아웃/재발급 전 경로가
                        // esntlId 기준임을 실측 확인했고, 레거시 loginId 키 행은 V2_18 이 정리한다(생성 경로 없음)
                        refreshTokenRepository.deleteByUserId(user.getEsntlId());
                }
                // [V2_13 결속] 로그인 정책(키=loginId)·부재 플래그(키=esntlId)·커뮤니티 멤버십 정리
                loginPolicyRepository.deleteAllByIdInBatch(
                                users.stream().map(User::getUserId).collect(Collectors.toList()));
                userAbsenceRepository.deleteAllByIdInBatch(esntlIds);
                communityUserRepository.deleteByIdUserIdIn(esntlIds);
                // [log-privacy] 사용통계 로그 정리 — fk_tb_user_log_tb_user_info(dmnd_user_id→esntl_id) 잠복 결함 해소.
                // 개인 단위 통계이므로 파기 대상(보존기간 정책은 접속기록 web/sys/login 에만 적용). 사용자 삭제 前 선행.
                userLogRepository.deleteByDmndUserIdIn(esntlIds);
                eventPublisher.publishEvent(new UserDeletionEvent(esntlIds));
                userRepository.deleteAllInBatch(users);
        }

        /**
         * 사용자 회원가입 (기존 API 호환 및 비밀번호 암호화 적용)
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public UserResponse signup(UserSignupRequest request) {
                required(request, "회원가입 요청 정보는 null 일 수 없습니다");
                required(request.getUserId(), "사용자 ID 는 null 일 수 없습니다");
                required(request.getPswd(), "비밀번호 는 null 일 수 없습니다");
                required(request.getUserNm(), "사용자 이름 은 null 일 수 없습니다");

                // [버그수정] User @Id 는 esntlId 이므로 existsById(loginId)는 항상 false(死가드)였다.
                // 로그인 ID 중복은 unique 컬럼 user_id 로 확인해야 한다. 미수정 시 중복 loginId 가 통과→INSERT 시 500.
                if (userRepository.findByUserId(request.getUserId()).isPresent()) {
                        throw new BusinessException(UserErrorCode.DUPLICATE_USER_ID);
                }

                String esntlId = nuri.foundation.core.util.IdGenerationUtil.generateUserId();
                String encodedPassword = passwordEncoder.encode(request.getPswd());

                User user = User.builder()
                                .userId(request.getUserId())
                                .pswd(encodedPassword)
                                .userNm(request.getUserNm())
                                .esntlId(esntlId)
                                .pswdHint(request.getPswdHint())
                                .pswdCrans(request.getPswdCrans())
                                .role(request.getRole() != null ? Role.valueOf(request.getRole()) : Role.USER)
                                .build();

                userRepository.save(required(user));

                // 권한 정보 저장
                UserAuthority authority = UserAuthority.builder()
                                .scrtyDcsnTrgtId(user.getEsntlId())
                                .authrtId("ROLE_" + user.getRole().name())
                                .mbrTypeCd("USR")
                                .build();
                userAuthorityRepository.save(authority);

                return UserResponse.from(user);
        }

        /**
         * 비밀번호 검증
         */
        public boolean verifyPassword(@NonNull String rawPassword, @NonNull String encodedPassword) {
                return passwordEncoder.matches(rawPassword, encodedPassword);
        }

        /**
         * 여러 사용자를 한꺼번에 삭제합니다.
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void deleteUserList(@NonNull List<String> userIds) {
                // [보안] 관리자 권한 확인
                if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }
                required(userIds, "사용자 ID 목록은 null 일 수 없습니다");

                // [버그수정] 기존 deleteAllByIdInBatch(userIds)는 PK(esntlId) 기준이라, FE(UserOrgHubClient)가
                // 보내는 loginId 목록에서는 아무 행도 지우지 못하는 침묵 no-op 이었다. deleteUser 와 동일하게
                // loginId → esntlId 순으로 해석해 실제 사용자를 확정한 뒤, 종속 정리를 거쳐 삭제한다.
                // (존재하지 않는 ID 는 멱등 삭제 의미론으로 건너뛰고 경고만 남긴다)
                List<User> users = userIds.stream()
                                .map(id -> userRepository.findByUserId(id).or(() -> userRepository.findById(id)))
                                .flatMap(java.util.Optional::stream)
                                .collect(Collectors.toList());
                if (users.size() < userIds.size()) {
                        log.warn("deleteUserList: 요청 {}건 중 {}건만 실존 — 나머지는 건너뜀", userIds.size(), users.size());
                }
                cleanupDependentsAndDelete(users);
        }

        /**
         * 아이디 중복 여부를 확인합니다.
         */
        public boolean checkIdDplct(@NonNull String userId) {
                return userRepository.findByUserId(required(userId, "사용자 ID 는 null 일 수 없습니다")).isPresent();
        }

        /**
         * 관리자 권한으로 비밀번호를 변경합니다. (기존 비밀번호 확인 없음)
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void updatePasswordByAdmin(@NonNull String userId, @NonNull String newPassword) {
                // [보안] 관리자 권한 확인
                if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }

                User user = userRepository.findByUserId(userId)
                                .or(() -> userRepository.findById(userId))
                                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
                user.updatePassword(passwordEncoder.encode(newPassword));
        }

        /**
         * 여러 사용자의 상태를 한꺼번에 변경합니다.
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void updateUsersStatus(@NonNull List<String> userIds, @NonNull String status) {
                // [보안] 관리자 권한 확인
                if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }
                List<User> users = userRepository.findAllById(required(userIds));
                users.forEach(user -> user.updateStatus(status));
                userRepository.saveAll(users);
        }

        /**
         * 여러 사용자의 소속 부서를 한꺼번에 변경합니다.
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void moveUsersToDept(@NonNull List<String> userIds, @NonNull String ognzId) {
                // [보안] 관리자 권한 확인
                if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }
                List<User> users = userRepository.findAllById(required(userIds));
                users.forEach(user -> user.updateOrgnztId(ognzId));
                userRepository.saveAll(users);
        }

        /**
         * 여러 사용자의 권한을 한꺼번에 변경합니다.
         */
        @Transactional
        @CacheEvict(value = { "users" }, allEntries = true)
        public void updateUsersRole(@NonNull List<String> userIds, @NonNull Role role) {
                // [보안] 관리자 권한 확인
                if (!nuri.business.security.util.SecurityUtil.hasRole(nuri.business.security.AuthorityConstants.ROLE_ADMIN)) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }
                List<User> users = userRepository.findAllById(required(userIds));
                String authorCode = "ROLE_" + role.name();

                // 사용자별 findById 하던 N+1 을 findAllById 배치 조회로 제거.
                List<String> esntlIds = users.stream().map(u -> u.getEsntlId()).collect(java.util.stream.Collectors.toList());
                java.util.Map<String, UserAuthority> existingByTarget = userAuthorityRepository.findAllById(esntlIds).stream()
                        .collect(java.util.stream.Collectors.toMap(a -> a.getScrtyDcsnTrgtId(), a -> a));
                List<UserAuthority> newAuthorities = new java.util.ArrayList<>();

                users.forEach(user -> {
                        user.changeRole(role);
                        UserAuthority existing = existingByTarget.get(user.getEsntlId());
                        if (existing != null) {
                                existing.update(authorCode, existing.getMbrTypeCd());
                        } else {
                                newAuthorities.add(UserAuthority.builder()
                                        .scrtyDcsnTrgtId(user.getEsntlId())
                                        .authrtId(authorCode)
                                        .mbrTypeCd("USR")
                                        .build());
                        }
                });

                if (!newAuthorities.isEmpty()) {
                        userAuthorityRepository.saveAll(newAuthorities);
                }
                userRepository.saveAll(users);
        }
}
