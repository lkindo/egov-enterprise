package nuri.business.service.user;
import nuri.business.domain.user.repository.UserListFilter;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.constants.Constants;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.business.domain.auth.RefreshTokenRepository;
import nuri.business.domain.login.LoginPolicyRepository;
import nuri.business.domain.user.entity.Role;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.user.dto.DepartmentRecipientsDto;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserResponse;
import nuri.business.service.user.dto.UserSearchDto;
import nuri.business.service.user.dto.UserSignupRequest;
import nuri.business.service.user.event.UserDeletionEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/** 사용자 계정 관리 — 조회·등록·수정·비밀번호·관리 조치(잠금 해제·상태·부서 이동·삭제). */
@Slf4j
@Service
@Transactional(readOnly = true)
public class UserService extends BaseAbstractService {

        /** 사용자 관리 화면의 최대 페이지 크기와 같은 입력 ID 상한. 중복 ID도 요청 건수에 포함한다. */
        public static final int MAX_BULK_DELETE_USERS = 100;
        public static final int MAX_BULK_USERS = MAX_BULK_DELETE_USERS;

        /** 가입일자(yyyyMMdd) 판정 시계(운영은 Asia/Seoul). 앱이 가입일자를 직접 채우고 DB 기본값(V2_103)에 기대지 않는다. */
        private Clock signupClock = Clock.system(ZoneId.of("Asia/Seoul"));

        /** 테스트 전용 — 가입일자 판정의 기준 시각을 고정한다. */
        void useSignupClock(Clock clock) {
                this.signupClock = java.util.Objects.requireNonNull(clock, "clock");
        }

        private String todaySignupYmd() {
                return LocalDate.now(signupClock).format(DateTimeFormatter.BASIC_ISO_DATE);
        }

        /**
         * 현재 비밀번호 불일치는 전용 횟수로 세되 로그인 인증({@code EgovAuthenticationProvider})과 같은 설정 키·한도로 잠근다 —
         * 한도를 따로 두면 로그인에서 막힌 대입이 이 경로로 옮겨 온다. 0 이하이면 잠그지 않는다.
         */
        @org.springframework.beans.factory.annotation.Value("${nuri.security.login.max-failures:5}")
        private int maxLoginFailures = 5;

        @org.springframework.beans.factory.annotation.Value("${nuri.security.login.lock-minutes:15}")
        private long lockMinutes = 15;

        /** 테스트 전용 — 실패 한도와 잠금 시간을 고정한다. */
        void useLoginFailureLimits(int maxFailures, long minutes) {
                this.maxLoginFailures = maxFailures;
                this.lockMinutes = minutes;
        }


        private final UserRepository userRepository;
        private final RefreshTokenRepository refreshTokenRepository;
        private final LoginPolicyRepository loginPolicyRepository;
        private final nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository;
        private final nuri.business.domain.log.UserLogRepository userLogRepository;
        private final nuri.business.domain.deptjob.DeptJobRepository deptJobRepository;
        private final nuri.business.domain.user.repository.DeptManageRepository deptManageRepository;
        private final PasswordEncoder passwordEncoder;
        private final ApplicationEventPublisher eventPublisher;
        private final nuri.business.security.authorization.AuthorizationSnapshotService authorizationSnapshots;
        private final nuri.business.service.auth.AuthorizationAdministrationService authorizationAdministration;
        private final nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit;
        private final nuri.business.domain.auth.mfa.MfaCredentialRepository mfaCredentials;
        private final LoginIdReuseGuard loginIdReuseGuard;
        private final PlatformTransactionManager transactionManager;

        public UserService(UserRepository userRepository,
                        RefreshTokenRepository refreshTokenRepository, LoginPolicyRepository loginPolicyRepository,
                        nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository,
                        nuri.business.domain.log.UserLogRepository userLogRepository,
                        nuri.business.domain.deptjob.DeptJobRepository deptJobRepository,
                        nuri.business.domain.user.repository.DeptManageRepository deptManageRepository,
                        PasswordEncoder passwordEncoder,
                        ApplicationEventPublisher eventPublisher,
                        nuri.business.security.authorization.AuthorizationSnapshotService authorizationSnapshots,
                        nuri.business.service.auth.AuthorizationAdministrationService authorizationAdministration,
                        nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit,
                        nuri.business.domain.auth.mfa.MfaCredentialRepository mfaCredentials,
                        LoginIdReuseGuard loginIdReuseGuard) {
                this(userRepository, refreshTokenRepository, loginPolicyRepository, userAbsenceRepository,
                                userLogRepository, deptJobRepository, deptManageRepository, passwordEncoder,
                                eventPublisher, authorizationSnapshots, authorizationAdministration,
                                sensitiveAudit, mfaCredentials, loginIdReuseGuard, null);
        }

        @Autowired
        public UserService(UserRepository userRepository,
                        RefreshTokenRepository refreshTokenRepository, LoginPolicyRepository loginPolicyRepository,
                        nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository,
                        nuri.business.domain.log.UserLogRepository userLogRepository,
                        nuri.business.domain.deptjob.DeptJobRepository deptJobRepository,
                        nuri.business.domain.user.repository.DeptManageRepository deptManageRepository,
                        PasswordEncoder passwordEncoder,
                        ApplicationEventPublisher eventPublisher,
                        nuri.business.security.authorization.AuthorizationSnapshotService authorizationSnapshots,
                        nuri.business.service.auth.AuthorizationAdministrationService authorizationAdministration,
                        nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit,
                        nuri.business.domain.auth.mfa.MfaCredentialRepository mfaCredentials,
                        LoginIdReuseGuard loginIdReuseGuard,
                        PlatformTransactionManager transactionManager) {
                this.userRepository = required(userRepository, "UserRepository 는 null 일 수 없습니다");
                this.refreshTokenRepository = required(refreshTokenRepository,
                                "RefreshTokenRepository 는 null 일 수 없습니다");
                this.loginPolicyRepository = required(loginPolicyRepository,
                                "LoginPolicyRepository 는 null 일 수 없습니다");
                this.userAbsenceRepository = required(userAbsenceRepository,
                                "UserAbsenceRepository 는 null 일 수 없습니다");
                this.userLogRepository = required(userLogRepository, "UserLogRepository 는 null 일 수 없습니다");
                this.deptJobRepository = required(deptJobRepository, "DeptJobRepository 는 null 일 수 없습니다");
                this.deptManageRepository = required(deptManageRepository,
                                "DeptManageRepository 는 null 일 수 없습니다");
                this.passwordEncoder = required(passwordEncoder, "PasswordEncoder 는 null 일 수 없습니다");
                this.eventPublisher = required(eventPublisher, "ApplicationEventPublisher 는 null 일 수 없습니다");
                this.authorizationSnapshots = required(authorizationSnapshots);
                this.authorizationAdministration = required(authorizationAdministration);
                this.sensitiveAudit = required(sensitiveAudit);
                this.mfaCredentials = required(mfaCredentials);
                this.loginIdReuseGuard = required(loginIdReuseGuard);
                this.transactionManager = transactionManager;
        }

        public Page<UserDto> getPagedUserList(String searchKeyword, UserListFilter filter, @NonNull Pageable pageable) {
                var page=userRepository.getPagedUserList(searchKeyword, filter == null ? UserListFilter.NONE : filter,
                        required(pageable, "Pageable 은 null 일 수 없습니다"));
                var snapshots=authorizationSnapshots.loadAll(page.getContent().stream().map(UserDto::esntlId).toList());
                return page.map(user -> user.withAuthorization(snapshots.get(user.esntlId())));
        }


        /** 담당자 검색이 요구하는 최소 검색어 길이. 1자("김")면 사실상 전 직원 목록이라 2자를 요구한다. */
        public static final int PIC_SEARCH_MIN_KEYWORD_LENGTH = 2;

        /** 담당자 검색 1회 최대 반환 건수. 클라이언트가 무엇을 보내든 이 값을 넘지 않는다. */
        public static final int PIC_SEARCH_MAX_RESULTS = 20;

        /**
         * 담당자 지정용 사용자 검색 — 로그인한 누구나 부르는, 전 직원 인명부의 유일한 일반 사용자 창구다. 그래서 구조로 막는다.
         * <ol>
         *   <li>검색어가 {@value #PIC_SEARCH_MIN_KEYWORD_LENGTH}자 미만이면 예외 없이 빈 목록이다(입력 중 상태라 오류가 아니다).</li>
         *   <li>최대 {@value #PIC_SEARCH_MAX_RESULTS}건이고 offset·총 건수가 없다 — 넘겨 가며 전량을 모을 수 없다.</li>
         *   <li>{@link UserSearchDto} 의 esntlId·성명·부서명·부재 여부만 싣는다. 연락처·이메일·주소·생년월일은 없다.</li>
         * </ol>
         * 컨트롤러의 {@code AUTHENTICATED} 바인딩과 따로 인증 주체를 다시 확인해, 내부 호출 경로에서도 익명에게 나가지 않는다
         * (백엔드 헌법 제8조).
         *
         * @param keyword 성명 일부
         * @return 최대 {@value #PIC_SEARCH_MAX_RESULTS}건. 검색어가 짧으면 빈 목록.
         */
        public List<UserSearchDto> searchAssignableUsers(String keyword) {
                if (nuri.business.security.util.SecurityUtil.getCurrentEsntlId().isEmpty()) {
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
                }

                String trimmed = keyword == null ? "" : keyword.trim();
                if (trimmed.length() < PIC_SEARCH_MIN_KEYWORD_LENGTH) {
                        return List.of();
                }

                return userRepository.searchAssignableUsers(trimmed, PIC_SEARCH_MAX_RESULTS);
        }

        /** 부서 단위 수신자 선택의 1회 상한. 발송 요청 상한(100명)보다 넉넉하되 한 부서를 통째로 덤프하지는 않는다. */
        public static final int DEPARTMENT_RECIPIENT_MAX = 200;

        /**
         * 부서 단위 수신자 선택 — 한 부서의 사용 중 계정인 직속 소속 인원. 사용자 목록과 같은 USER_READ 로 열려 권한을 넓히지 않고(H3),
         * 응답은 {@link UserSearchDto} 최소 필드뿐이다.
         *
         * @throws BusinessException 부서가 없으면 404
         */
        public DepartmentRecipientsDto getDepartmentRecipients(String ognzId) {
                if (ognzId == null || ognzId.isBlank() || !deptManageRepository.existsById(ognzId)) {
                        throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "부서를 찾을 수 없습니다: " + ognzId);
                }
                // 상한보다 하나 더 읽어 넘쳤는지 판정한다 — 총 건수를 세지 않는다.
                List<UserSearchDto> rows = userRepository.findActiveDepartmentMembers(ognzId, DEPARTMENT_RECIPIENT_MAX + 1);
                boolean truncated = rows.size() > DEPARTMENT_RECIPIENT_MAX;
                return new DepartmentRecipientsDto(truncated ? List.copyOf(rows.subList(0, DEPARTMENT_RECIPIENT_MAX)) : rows, truncated);
        }

        public UserDto getUserById(@NonNull String id) {
                User user = findByLoginIdOrEsntlIdOrThrow(id);
                // 관리자가 초기화 뒤 상태와 복구 승인 대상인지 볼 수 있게 비밀번호 변경 필요·추가 인증 사용 여부를 싣는다.
                //   인증앱 비밀값·복구 코드는 싣지 않는다.
                boolean mfaActive = mfaCredentials.findBySubject(user.getEsntlId())
                        .map(nuri.business.domain.auth.mfa.MfaCredential::isActive).orElse(false);
                return UserDto.from(user).withAuthorization(authorizationSnapshots.load(user.getEsntlId())).toBuilder()
                        .passwordChangeRequired(user.isTemporaryPassword()).mfaEnabled(mfaActive).build();
    }

        /**
         * 관리 경로의 사용자 식별자 해석 — 로그인 ID 로 먼저, 없으면 esntlId 로 찾는다. 조회만 하며 인가는 호출 메서드가 자기 순서로 한다(H3).
         * 인증 제공자의 로그인 ID 전용 해석(DEC-OPS-179)·{@link #assertLoginIdAvailable} 와는 의미가 다르다.
         */
        private Optional<User> findByLoginIdOrEsntlId(String id) {
                return userRepository.findByUserId(id).or(() -> userRepository.findById(id));
        }

        private User findByLoginIdOrEsntlIdOrThrow(String id) {
                return findByLoginIdOrEsntlId(id)
                                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        }

        @Transactional(propagation = Propagation.SUPPORTS)
        public String registerUser(@NonNull UserDto dto) {
                required(dto, "등록 요청은 null 일 수 없습니다");
                String userId = required(dto.userId(), "사용자 ID 는 null 일 수 없습니다");
                String pswd = required(dto.pswd(), "비밀번호 는 null 일 수 없습니다");
                String userNm = required(dto.userNm(), "사용자 이름 은 null 일 수 없습니다");
                String pswdHint = dto.pswdHint();
                String pswdCrans = dto.pswdCrans();
                String roleName = dto.role();

                // 단독 호출이면 비밀번호 해시를 트랜잭션 밖에서 계산한다(DB 연결·전역 잠금 점유 최소화).
                nuri.business.security.util.SecurityUtil.assertPermission("USER_CREATE");
                String encodedPassword = passwordEncoder.encode(pswd);

                return executeWrite(() -> {
                        authorizationAdministration.lockAndAuthorize("USER_CREATE");

                        assertLoginIdAvailable(userId);

                        String esntlId = nuri.foundation.core.util.IdGenerationUtil.generateUserId();

                        Role role = Role.USER;
                        if (org.springframework.util.StringUtils.hasText(roleName)
                                && !"USER".equals(roleName) && !"ROLE_USER".equals(roleName)) {
                            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                    "신규 사용자 그룹은 USER입니다. 추가 그룹은 권한 관리에서 배정해 주세요.");
                        }

                        // 등록과 수정이 저장하는 사용자 속성 집합을 일치시켜 전달된 부서·이메일·연락처가 누락되지 않게 한다.
                        assertDepartmentExists(dto.ognzId());

                        User user = User.builder()
                                        .userId(userId)
                                        .pswd(encodedPassword)
                                        .userNm(userNm)
                                        .esntlId(esntlId)
                                        .sbscrbYmd(todaySignupYmd())
                                        .pswdHint(pswdHint)
                                        .pswdCrans(pswdCrans)
                                        .role(role)
                                        .emlAddr(dto.emlAddr())
                                        .mblTelno(dto.mblTelno())
                                        .ognzId(blankToNull(dto.ognzId()))
                                        .emplNo(dto.emplNo())
                                        .ofcpsNm(dto.ofcpsNm())
                                        .groupId(dto.groupId())
                                        .pstinstCd(dto.pstinstCd())
                                        .officeTelno(dto.officeTelno())
                                        .areaNo(dto.areaNo())
                                        .middleTelno(dto.middleTelno())
                                        .endTelno(dto.endTelno())
                                        .faxNo(dto.faxNo())
                                        .homeAddr(dto.homeAddr())
                                        .daddr(dto.daddr())
                                        .zip(dto.zip())
                                        .build();


                        userRepository.saveAndFlush(required(user));
                        authorizationAdministration.assignNewUser(user.getEsntlId());

                        return userId;
                });
        }

        @Transactional
        public void updateUser(@NonNull String userId, @NonNull UserDto userDto) {
                User user = findByLoginIdOrEsntlIdOrThrow(userId);

                // 본인 또는 USER_UPDATE 만 수정한다(인가를 전역 잠금보다 먼저 판정). 보호계정 가드는 걸지 않는다 — 이 경로는
                //   비밀번호 힌트·정답·역할을 못 바꾸고, 보호 관리자의 이름·연락처·부서 수정은 허용한다(DEC-OPS-375).
                nuri.business.security.util.SecurityUtil.assertOwnerOrPermissionByEsntlId(user.getEsntlId(), "USER_UPDATE");

                boolean isSelf = Optional.ofNullable(user.getEsntlId())
                        .equals(nuri.business.security.util.SecurityUtil.getCurrentEsntlId());
                // 잠금 전 소속은 낡을 수 있다. 소속 입력이 있으면 전역→사용자 순서를 먼저 확보한다.
                if (!isSelf || userDto.ognzId() != null) {
                        authorizationAdministration.lockAdministration();
                }
                refreshForUpdateOrThrow(user);
                // 행 잠금 뒤 읽은 편집 버전과 대조해 늦은 저장이 앞 저장을 덮지 않게 한다(V2_156). 없으면 400, 다르면 409.
                //   로그인 실패 횟수 같은 보안 상태 쓰기는 이 버전을 올리지 않는다(User.editVersion).
                nuri.foundation.core.util.EntityVersions.assertCurrent(userDto.version(), user.getEditVersion());

                // 부분 수정 계약 — null 은 '보내지 않음'이라 기존 값을 두고 "" 는 '지움'이다(keepIfAbsent). User.update() 는
                //   모든 인자를 대입하는데 화면은 일부 필드만 보내고 나머지를 받지도 못하므로, 이 규칙이 없으면 보내지 않은 칸이
                //   지워진다. 전체 치환이 필요하면 별도 엔드포인트로 나눈다.
                // 소속은 요청이 실제로 보냈고 기존과 다를 때만 검사한다 — 결과값을 검사하면 이미 고아 소속인 사용자가 이름조차
                //   못 고친다(/users/me 는 소속을 받지 않는다).
                assertDepartmentChange(userDto.ognzId(), user.getOgnzId());

                user.update(
                                userDto.userNm(),
                                user.getPswdHint(),
                                user.getPswdCrans(),
                                keepIfAbsent(userDto.emplNo(), user.getEmplNo()),
                                user.getRrno(),
                                user.getGndrCd(),
                                user.getBrthYmd(),
                                keepIfAbsent(userDto.areaNo(), user.getAreaNo()),
                                keepIfAbsent(userDto.middleTelno(), user.getMiddleTelno()),
                                keepIfAbsent(userDto.endTelno(), user.getEndTelno()),
                                keepIfAbsent(userDto.faxNo(), user.getFaxNo()),
                                keepIfAbsent(userDto.homeAddr(), user.getHomeAddr()),
                                keepIfAbsent(userDto.daddr(), user.getDaddr()),
                                keepIfAbsent(userDto.zip(), user.getZip()),
                                keepIfAbsent(userDto.officeTelno(), user.getOfficeTelno()),
                                keepIfAbsent(userDto.mblTelno(), user.getMblTelno()),
                                keepIfAbsent(userDto.emlAddr(), user.getEmlAddr()),
                                keepIfAbsent(userDto.ofcpsNm(), user.getOfcpsNm()),
                                keepIfAbsent(userDto.groupId(), user.getGroupId()),
                                blankToNull(keepIfAbsent(userDto.ognzId(), user.getOgnzId())),
                                keepIfAbsent(userDto.pstinstCd(), user.getPstinstCd()),
                                user.getRole(),
                                user.getCertDnVl());
                user.markProfileEdited();
        }

        /** 부분 수정 규칙 — {@code null}(보내지 않음)이면 기존 값, 빈 문자열(비움)을 포함한 그 밖의 값은 요청 값을 쓴다. */
        private static String keepIfAbsent(String requested, String existing) {
                return requested != null ? requested : existing;
        }

        /**
         * 비밀번호 변경. 단독 호출이면 조회(읽기 TX) → 해시 대조·생성(트랜잭션 밖) → 행 잠금 뒤 갱신·실패 기록(짧은 쓰기 TX)으로
         * 나눠 bcrypt 동안 DB 연결을 쥐지 않는다. 외부 트랜잭션이 있으면 참여한다. 불일치는
         * {@link nuri.business.domain.user.exception.CurrentPasswordMismatchException}({@code noRollbackFor})으로 실패 횟수·잠금을 커밋한다.
         */
        @Transactional(propagation = Propagation.SUPPORTS,
                        noRollbackFor = nuri.business.domain.user.exception.CurrentPasswordMismatchException.class)
        public void changePassword(@NonNull String userId, @NonNull String oldPassword, @NonNull String newPassword) {
                boolean standalone = isStandaloneTransaction();
                PasswordSnapshot snapshot = executeReadOnly(() -> {
                        User user = findByLoginIdOrEsntlIdOrThrow(userId);
                        String observedPassword = user.getPswd();
                        return new PasswordSnapshot(user, user.getEsntlId(), observedPassword);
                });
                String observedPassword = snapshot.observedPassword();
                // 새 비밀번호 해시는 현재 비밀번호가 맞든 틀리든 한 번 계산한다. 맞힌 요청만 해시를 더 계산하면 잠긴 뒤에도 응답 시간이
                //   정답을 알린다. 해시 계산은 잠금 밖에서 한다.
                String encodedPassword = passwordEncoder.encode(newPassword);
                boolean matched = passwordEncoder.matches(oldPassword, observedPassword);

                Boolean mismatchRecorded = executeWrite(() -> {
                        User user = standalone
                                        ? userRepository.findById(snapshot.esntlId())
                                                        .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND))
                                        : snapshot.user();
                        if (!matched) {
                                applyCurrentPasswordFailure(user, observedPassword);
                                return Boolean.TRUE;
                        }
                        // 대기 중 초기화됐으면 현재 비밀번호로 다시 검증한다.
                        refreshForUpdateOrThrow(user);
                        if (!java.util.Objects.equals(observedPassword, user.getPswd())
                                        && !passwordEncoder.matches(oldPassword, user.getPswd())) {
                                throw new BusinessException(UserErrorCode.INVALID_PASSWORD);
                        }
                        // 잠금 안에서 다시 본다. 같은 세션으로 동시에 보낸 대입 요청은 잠금 전에 인증을 지나왔을 수 있다 — 한도에 닿아 잠긴 뒤
                        //   맞힌 요청이 비밀번호를 바꾸면 잠금이 대입을 막지 못한다. 잠금 시간이 지났으면 로그인처럼 풀고 진행한다.
                        if (isLockedNow(user)) {
                                throw new BusinessException(UserErrorCode.INVALID_PASSWORD);
                        }
                        // 같은 값으로 바꾸면 임시 비밀번호 표시만 지워져 강제 변경을 건너뛴다. 잠금 판정 뒤에 본다 — 앞에 두면 잠긴 동안에도
                        //   '현재=새 비밀번호' 대입의 400 이 정답을, 401 이 오답을 알린다.
                        if (oldPassword.equals(newPassword)) {
                                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "새 비밀번호는 현재 비밀번호와 달라야 합니다.");
                        }
                        user.updatePassword(encodedPassword);
                        // 비밀번호 변경으로 현재 비밀번호 실패를 초기화하고, 해당 자격의 로그인 실패도 지운다.
                        user.unlockAccount();
                        revokeRefreshTokens(user);
                        return Boolean.FALSE;
                });
                if (Boolean.TRUE.equals(mismatchRecorded)) {
                        throw new nuri.business.domain.user.exception.CurrentPasswordMismatchException();
                }
        }

        private boolean isStandaloneTransaction() {
                return transactionManager != null && !TransactionSynchronizationManager.isActualTransactionActive();
        }

        private <T> T executeReadOnly(Supplier<T> action) {
                if (!isStandaloneTransaction()) {
                        return action.get();
                }
                TransactionTemplate readOnly = new TransactionTemplate(transactionManager);
                readOnly.setReadOnly(true);
                return readOnly.execute(status -> action.get());
        }

        private <T> T executeWrite(Supplier<T> action) {
                if (!isStandaloneTransaction()) {
                        return action.get();
                }
                return new TransactionTemplate(transactionManager).execute(status -> action.get());
        }

        /**
         * 현재 비밀번호 불일치를 전용 횟수에 더하고 한도에 닿으면 잠근다(로그인과 같은 규칙, DEC-OPS-354).
         * 횟수는 행 잠금 아래 현재 값으로 올려 동시 요청이 서로를 덮지 않게 하고, 이미 잠겼으면 더 올리지 않는다(고정창).
         * 잠글 때만 세션 차수를 올려 기존 세션을 끊는다(V2_153) — 로그인과 달리 대입한 쪽이 이미 세션을 가졌기 때문이다(DEC-OPS-419).
         * 기다리는 사이 비밀번호가 바뀌었으면 옛 해시와 대조한 실패라 세지 않는다.
         */
        private void applyCurrentPasswordFailure(User user, String observedPassword) {
                refreshForUpdateOrThrow(user);
                if (!java.util.Objects.equals(observedPassword, user.getPswd()) || isLockedNow(user)) {
                        throw new BusinessException(UserErrorCode.INVALID_PASSWORD);
                }
                int failures = user.incrementCurrentPasswordFailures();
                boolean locked = maxLoginFailures > 0 && failures >= maxLoginFailures;
                if (locked) {
                        user.lockAccount();
                        // 이 실패 주기는 잠금으로 끝난다. 잠금이 풀리면 새 횟수로 시작한다.
                        user.clearCurrentPasswordFailures();
                        log.warn("Account locked after repeated current-password failures (failures={}, lockMinutes={})",
                                        failures, lockMinutes);
                }
                userRepository.save(user);
                if (locked) {
                        userRepository.advanceSessionCycle(List.of(user.getEsntlId()));
                }
        }

        private record PasswordSnapshot(User user, String esntlId, String observedPassword) {}

        /** 잠겨 있고 잠금 시간이 아직 지나지 않았는가. 지났으면 로그인 인증처럼 여기서 풀고 false 다. */
        private boolean isLockedNow(User user) {
                if (!user.isLocked()) {
                        return false;
                }
                if (user.hasLockExpired(java.time.Duration.ofMinutes(lockMinutes))) {
                        user.unlockAccount();
                        return false;
                }
                return true;
        }

        /**
         * 새 로그인 ID 가 기존 로그인 ID·기존 사용자의 esntlId·지워진 계정의 남은 기록과 겹치면 일반 중복과 같은 오류로 거부한다
         * (어느 쪽인지 드러내지 않는다). 관리 경로는 식별자를 로그인 ID 로 먼저 해석하므로({@link #findByLoginIdOrEsntlId}), 남의
         * esntlId 와 같은 로그인 ID 가 생기면 그 사용자를 겨눈 관리 조치가 새 계정으로 간다 — 등록 규칙(영문·숫자·밑줄 4~20자)은
         * {@code USRCNFRM_00000000001} 같은 값을 통과시킨다. 업무 기록은 주인을 로그인 ID 로 판정하므로 같은 ID 로 다시 만든 계정은
         * 옛 기록을 물려받는다({@link LoginIdReuseGuard}).
         */
        private void assertLoginIdAvailable(String userId) {
                if (isLoginIdUnavailable(userId)) {
                        throw new BusinessException(UserErrorCode.DUPLICATE_USER_ID);
                }
        }

        private boolean isLoginIdUnavailable(String userId) {
                return userRepository.findByUserId(userId).isPresent()
                                || userRepository.existsById(userId)
                                || loginIdReuseGuard.isStillReferenced(userId);
        }

        /**
         * 비밀번호가 바뀌면 지금까지의 자격을 끊는다 — 본인 변경·관리자 초기화 모두 세션 차수를 올려 이전 차수의 access·refresh
         * token 을 무효화하고(V2_153), 저장된 refresh token 행도 지운다.
         */
        private void revokeRefreshTokens(User user) {
                // 사용자→MFA 자격→refresh 순서로 잠근다. 비밀번호 이전의 도전은 더 이상 증명이 아니다.
                userRepository.flush();
                eventPublisher.publishEvent(new nuri.foundation.core.event.UserCredentialsChangedEvent(user.getEsntlId()));
                revokeSessions(List.of(user.getEsntlId()));
        }

        /** 세션 차수를 올리고 refresh token 을 지운다 — 그 전에 발급된 access·refresh token 이 모두 거부된다(V2_153). */
        private void revokeSessions(List<String> esntlIds) {
                userRepository.advanceSessionCycle(esntlIds);
                refreshTokenRepository.deleteAllByEsntlIdIn(esntlIds);
        }

        /**
         * 관리자 강제 로그아웃 — 대상의 모든 세션을 끊되(V2_153) 계정 상태·비밀번호는 그대로라 다시 로그인할 수 있다.
         * {@code USER_STATUS} 로 하며 보호 계정은 상태 변경과 같은 보호 판정을 받고, 응답 전에 민감 감사에 남긴다.
         */
        @Transactional
        public void forceLogout(@NonNull String userId) {
                nuri.business.security.util.SecurityUtil.assertPermission("USER_STATUS");
                authorizationAdministration.lockAndAuthorize("USER_STATUS");
                User user = findByLoginIdOrEsntlIdOrThrow(userId);
                authorizationAdministration.authorizeProtectedAccountChange(user.getEsntlId());
                refreshForUpdateOrThrow(user);
                revokeSessions(List.of(user.getEsntlId()));
                sensitiveAudit.recordMutation("ADMIN_FORCE_LOGOUT", user.getEsntlId());
        }

        @Transactional
        public void deleteUser(@NonNull String userId) {
                nuri.business.security.util.SecurityUtil.assertPermission("USER_DELETE");

                User user = findByLoginIdOrEsntlIdOrThrow(userId);

                cleanupDependentsAndDelete(List.of(user));
        }

        /**
         * 종속 데이터를 같은 트랜잭션에서 정리한 뒤 사용자를 일괄 삭제한다 — 사용자 행을 가리키는 FK 가 지연되지 않는 NO ACTION 이라
         * (V2_12) 사용자 DELETE 문보다 먼저 정리하지 않으면 그 삭제문이 실패한다. 인가 매핑·토큰·로그인 정책·부재·사용 로그·부서 업무 담당자는 여기서,
         * 콘텐츠·알림·커뮤니티 멤버십은 {@link UserDeletionEvent} 리스너(business-app)가 같은 트랜잭션에서 처리한다
         * (콘텐츠는 webmaster 로 재귀속). 재귀속 종착지인 시스템 관리자 계정은 지우지 않는다.
         */
        private void cleanupDependentsAndDelete(List<User> users) {
                if (users.isEmpty()) {
                        return;
                }
                List<String> esntlIds = users.stream().map(u -> u.getEsntlId()).collect(Collectors.toList());
                if (esntlIds.contains(Constants.User.SYSTEM_ADMIN_ESNTL_ID)) {
                        // 재귀속 종착 계정이라 지우면 콘텐츠 보존이 무너진다. 일괄 선택에 섞였음을 알도록 사유를 말한다(전체가 거부된다).
                        throw new BusinessException(CommonErrorCode.ACCESS_DENIED,
                                        "시스템 관리자 계정은 삭제할 수 없습니다. 선택에서 빼고 다시 시도해 주세요.");
                }
                authorizationAdministration.lockAndAuthorize("USER_DELETE");
                // 관리 전역 잠금 다음 사용자 행부터 잠가 MFA 완료·비밀번호 변경의 사용자→refresh 순서를 지킨다.
                // refresh를 먼저 지우면 사용자 행을 보유한 MFA 요청과 서로 기다릴 수 있다.
                esntlIds.stream().distinct().sorted().forEach(userRepository::lockForDeletion);
                authorizationAdministration.removeDeletedUsers(esntlIds);
                // refresh token 표는 esntlId 단일 키다(레거시 loginId 키 행은 V2_18 이 정리했다). IN 삭제 한 번으로 지운다.
                refreshTokenRepository.deleteAllByEsntlIdIn(esntlIds);
                // 로그인 정책은 loginId, 부재 표지는 esntlId 가 키다(V2_13).
                loginPolicyRepository.deleteAllByIdInBatch(
                                users.stream().map(u -> u.getUserId()).collect(Collectors.toList()));
                userAbsenceRepository.deleteAllByIdInBatch(esntlIds);
                // 사용 통계 로그는 개인 단위라 파기한다(보존기간 정책은 접속기록에만 적용된다). FK 때문에 사용자보다 먼저 지운다.
                userLogRepository.deleteByDmndUserIdIn(esntlIds);
                // 부서 업무는 부서 자산이라 지우지 않고 담당자만 공석으로 돌린다(V2_32 FK). 공석 업무의 인가는 등록자 기준이다
                //   (DeptJobService.assertPicOrAdmin).
                deptJobRepository.releasePicByPicIdIn(esntlIds);
                eventPublisher.publishEvent(new UserDeletionEvent(esntlIds));
                userRepository.deleteAllInBatch(users);
                // 삭제한 계정을 같은 트랜잭션에 커밋 사실로 남긴다(ADR-0025 D13) — 엔드포인트 표지는 시도·결과만 남긴다.
                sensitiveAudit.recordMutation("ADMIN_USER_DELETE", auditTargets(esntlIds));
        }

        /**
         * 감사 대상 좌표 — 정렬한 esntlId 를 쉼표로 잇는다. 원장은 요청마다 커밋 기록을 한 행만 받으므로(요청 ID·처리 상태 유일) 일괄
         * 작업도 한 행이다. 일괄 상한({@link #MAX_BULK_USERS})이면 스냅숏 상한(4000자) 안에 든다.
         */
        private static String auditTargets(java.util.Collection<String> esntlIds) {
                return esntlIds.stream().distinct().sorted().collect(Collectors.joining(","));
        }

        @Transactional(propagation = Propagation.SUPPORTS)
        public UserResponse signup(UserSignupRequest request) {
                nuri.business.security.util.SecurityUtil.assertPermission("USER_CREATE");
                required(request, "회원가입 요청 정보는 null 일 수 없습니다");
                required(request.getUserId(), "사용자 ID 는 null 일 수 없습니다");
                String pswd = required(request.getPswd(), "비밀번호 는 null 일 수 없습니다");
                required(request.getUserNm(), "사용자 이름 은 null 일 수 없습니다");

                String encodedPassword = passwordEncoder.encode(pswd);

                return executeWrite(() -> {
                        // 잠금을 기다리는 사이 회수된 권한으로 계정을 만들지 않게 잠금 뒤 현재 상태로 다시 판정한다(registerUser 와 같다).
                        authorizationAdministration.lockAndAuthorize("USER_CREATE");

                        assertLoginIdAvailable(request.getUserId());

                        String esntlId = nuri.foundation.core.util.IdGenerationUtil.generateUserId();

                        User user = User.builder()
                                        .userId(request.getUserId())
                                        .pswd(encodedPassword)
                                        .userNm(request.getUserNm())
                                        .esntlId(esntlId)
                                        .sbscrbYmd(todaySignupYmd())
                                        .pswdHint(request.getPswdHint())
                                        .pswdCrans(request.getPswdCrans())
                                        // 권한은 요청에서 받지 않고 USER 로 고정한다. 추가 그룹은 버전 검증된 배정 API 로 준다(DEC-OPS-135).
                                        .role(Role.USER)
                                        .build();

                        userRepository.saveAndFlush(required(user));
                        authorizationAdministration.assignNewUser(user.getEsntlId());

                        return UserResponse.from(user);
                });
        }

        public boolean verifyPassword(@NonNull String rawPassword, @NonNull String encodedPassword) {
                return passwordEncoder.matches(rawPassword, encodedPassword);
        }

        @Transactional
        public void deleteUserList(@NonNull List<String> userIds) {
                nuri.business.security.util.SecurityUtil.assertPermission("USER_DELETE");
                required(userIds, "사용자 ID 목록은 null 일 수 없습니다");
                if (userIds.size() > MAX_BULK_DELETE_USERS) {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                        "한 번에 삭제할 사용자 ID는 " + MAX_BULK_DELETE_USERS + "개 이하여야 합니다.");
                }

                // 화면은 loginId 를 보내므로 deleteUser 처럼 loginId → esntlId 로 해석한다. 없는 ID 는 멱등 삭제로 건너뛰고 경고만 남긴다.
                List<User> users = userIds.stream()
                                .map(this::findByLoginIdOrEsntlId)
                                .flatMap(opt -> opt.stream())
                                .collect(Collectors.toList());
                if (users.size() < userIds.size()) {
                        log.warn("deleteUserList: 요청 {}건 중 {}건만 실존 — 나머지는 건너뜀", userIds.size(), users.size());
                }
                cleanupDependentsAndDelete(users);
        }

        public boolean checkIdDplct(@NonNull String userId) {
                return isLoginIdUnavailable(required(userId, "사용자 ID 는 null 일 수 없습니다"));
        }

        /** 관리자 비밀번호 초기화 — 현재 비밀번호를 묻지 않고 임시 비밀번호로 발급한다. */
        @Transactional(propagation = Propagation.SUPPORTS)
        public void updatePasswordByAdmin(@NonNull String userId, @NonNull String newPassword) {
                // 단독 호출이면 비밀번호 해시를 트랜잭션 밖에서 계산한다(DB 연결·전역 잠금 점유 최소화).
                nuri.business.security.util.SecurityUtil.assertPermission("USER_PASSWORD");
                String encodedPassword = passwordEncoder.encode(newPassword);

                executeWrite(() -> {
                        authorizationAdministration.lockAndAuthorize("USER_PASSWORD");

                        User user = findByLoginIdOrEsntlIdOrThrow(userId);
                        authorizationAdministration.authorizeProtectedAccountChange(user.getEsntlId());
                        refreshForUpdateOrThrow(user);
                        // 관리자 초기화 비밀번호는 임시 비밀번호로 발급하며, 본인이 새 비밀번호로 로그인·변경할 수 있게 잠금도 함께 푼다.
                        user.issueTemporaryPassword(encodedPassword);
                        user.unlockAccount();
                        revokeRefreshTokens(user);
                        sensitiveAudit.recordMutation("ADMIN_PASSWORD_RESET", user.getEsntlId());
                        return null;
                });
        }

        /** 잠금 시간이 지나기 전에 관리자가 계정 잠금을 푼다. 비밀번호와 세션은 건드리지 않는다. */
        @Transactional
        public void unlockUser(@NonNull String userId) {
                nuri.business.security.util.SecurityUtil.assertPermission("USER_STATUS");
                authorizationAdministration.lockAndAuthorize("USER_STATUS");
                User user = findByLoginIdOrEsntlIdOrThrow(userId);
                authorizationAdministration.authorizeProtectedAccountChange(user.getEsntlId());
                refreshForUpdateOrThrow(user);
                user.unlockAccount();
                user.clearCurrentPasswordFailures();
                sensitiveAudit.recordMutation("ADMIN_UNLOCK", user.getEsntlId());
        }

        @Transactional
        public void updateUsersStatus(@NonNull List<String> userIds, @NonNull String status) {
                nuri.business.security.util.SecurityUtil.assertPermission("USER_STATUS");
                authorizationAdministration.lockAndAuthorize("USER_STATUS");
                long managerCount = authorizationAdministration.managerCount();
                List<User> users = findAllByLoginIdOrThrow(userIds);
                users.forEach(user -> authorizationAdministration.authorizeProtectedAccountChange(user.getEsntlId()));
                refreshAllForUpdate(users);
                users.forEach(user -> user.updateStatus(status));
                userRepository.saveAllAndFlush(users);
                // 상태가 바뀌면(정지·탈퇴·승인 등) 그 전에 발급된 세션을 끊는다(V2_153) — 다시 활성으로 돌려도 옛 토큰은 되살아나지 않는다.
                revokeSessions(users.stream().map(User::getEsntlId).toList());
                authorizationAdministration.protectLastManager(managerCount);
                sensitiveAudit.recordMutation("ADMIN_STATUS_CHANGE", auditTargets(users.stream().map(User::getEsntlId).toList()));
        }

        @Transactional
        public void moveUsersToDept(@NonNull List<String> userIds, @NonNull String ognzId) {
                authorizationAdministration.lockAndAuthorize("USER_DEPT");
                nuri.business.security.util.SecurityUtil.assertPermission("USER_DEPT");
                assertDepartmentExists(ognzId);
                List<User> users = findAllByLoginIdOrThrow(userIds);
                refreshAllForUpdate(users);
                String normalizedOgnzId = blankToNull(ognzId);
                users.forEach(user -> user.updateOrgnztId(normalizedOgnzId));
                userRepository.saveAll(users);
        }

        /** 전역 잠금 뒤 일정한 순서로 모두 새로 읽는다. 하나라도 수정하기 전에 끝내 auto-flush를 피한다. */
        private void refreshAllForUpdate(List<User> users) {
                users.stream().sorted(java.util.Comparator.comparing(User::getEsntlId))
                                .forEach(this::refreshForUpdateOrThrow);
        }

        private void refreshForUpdateOrThrow(User user) {
                try {
                        userRepository.refreshForUpdate(user);
                } catch (org.springframework.orm.ObjectRetrievalFailureException deletedWhileWaiting) {
                        throw new BusinessException(UserErrorCode.USER_NOT_FOUND);
                }
        }

        /** 단일 role 일괄 변경은 받지 않는다 — 사용자별 전체 그룹과 버전으로 배정하는 API 를 쓴다. */
        @Transactional
        public void updateUsersRole(@NonNull List<String> userIds, @NonNull Role role) {
                nuri.business.security.util.SecurityUtil.assertPermission("AUTHRT_ASSIGN");
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "단일 role 변경은 종료되었습니다. 사용자별 전체 그룹과 버전으로 배정해 주세요.");
    }

        /**
         * 화면의 일괄 선택 키인 loginId({@code user_id})로 사용자를 전부 확정한다(PK 는 esntlId 라 findAllById 로는 0건이다).
         * 하나라도 없으면 부분 성공 없이 실패시켜, 관리자가 결과를 믿을 수 있게 한다.
         */
        private List<User> findAllByLoginIdOrThrow(List<String> userIds) {
                List<String> nonNullIds = required(userIds, "사용자 ID 목록은 null 일 수 없습니다");
                if (nonNullIds.size() > MAX_BULK_USERS) {
                        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                                        "한 번에 처리할 사용자 ID는 " + MAX_BULK_USERS + "개 이하여야 합니다.");
                }
                List<String> requestedIds = nonNullIds.stream()
                                .map(id -> required(id, "사용자 ID 는 null 일 수 없습니다"))
                                .distinct()
                                .toList();
                if (requestedIds.isEmpty()) {
                        throw new BusinessException(UserErrorCode.USER_INVALID_INPUT_VALUE,
                                        "사용자 ID 목록은 비어 있을 수 없습니다.");
                }

                List<User> users = userRepository.findByUserIdIn(requestedIds);
                if (users.size() != requestedIds.size()) {
                        throw new BusinessException(UserErrorCode.USER_NOT_FOUND,
                                        "요청한 사용자 중 존재하지 않는 대상이 있습니다.");
                }
                return users;
        }
        /**
         * "소속 없음"의 저장 표현을 NULL 하나로 모은다 — 화면은 소속 없음을 빈 문자열로 보내는데 V2_102 의 부서 FK 가 빈 문자열을
         * 거부한다. 부분 수정 계약({@link #keepIfAbsent})에서 '비움'이 확정된 뒤 저장 표현만 바꾼다.
         */
        private static String blankToNull(String value) {
                return (value == null || value.isBlank()) ? null : value;
        }

        /** 소속 부서가 실재하는지 먼저 확인해 FK 위반 대신 부서 없음으로 답한다. 빈 값은 소속 해제라 통과시킨다. */
        private void assertDepartmentExists(String ognzId) {
                if (ognzId == null || ognzId.isBlank()) {
                        return; // 소속 없음
                }
                if (!deptManageRepository.existsById(ognzId)) {
                        throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND,
                                        "부서를 찾을 수 없습니다: " + ognzId);
                }
        }

        /** 요청이 소속을 실제로 바꿀 때만 검사한다 — 기존 고아 값을 그대로 왕복시키는 수정은 막지 않는다. */
        private void assertDepartmentChange(String requested, String current) {
                // null 은 '보내지 않음'. 빈 문자열은 '소속 없음' 이라 저장값 null 과 같은 상태다 — 소속 없는 사용자의 이름만
                //   고치는 폼은 "" 를 보내므로, 정규화 없이 비교하면 부서 변경으로 오판해 USER_DEPT 없는 담당자를 403 으로 막는다.
                if (requested == null || java.util.Objects.equals(blankToNull(requested), blankToNull(current))) {
                        return;
                }
                // 소속 변경은 USER_DEPT 의 의미라 USER_UPDATE 만으로 우회하지 못한다(H3). 판정은 요청 시점 권한이다(전역 잠금은
                //   소속 입력이 있으면 updateUser 가 이미 잡았다). 일괄 이동은 잠금 뒤 DB 재확인까지 한다.
                nuri.business.security.util.SecurityUtil.assertPermission("USER_DEPT");
                assertDepartmentExists(requested);
        }
}
