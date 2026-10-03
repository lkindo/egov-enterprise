package nuri.business.service.login;

/**
 * 로그인 정책 쓰기가 대상 계정을 바꾸기 전후에 부르는 보호 계정 가드(GAP-SEC-006).
 *
 * <p>로그인 정책은 접속 제한·IP·허용 시간대로 계정의 로그인을 막거나 그 제한을 푼다. 계정 상태 변경·잠금 해제와 같은
 * 신뢰 경계라서 두 가지를 같은 판정으로 지킨다. ① 대상이 보호 계정(권한 설정·배정·비밀번호 초기화 권한 보유)이면
 * 호출자에게 권한 설정·권한 배정을 함께 요구한다. ② 마지막 활성 권한관리자의 접속을 제한하지 못하게 한다 — 계정 상태
 * 변경({@code UserService#updateUsersStatus})과 같은 앞뒤 관리자 수 비교다. 판정은 권한 관리 서비스
 * ({@code AuthorizationAdministrationService})가 공유 직렬화 잠금 뒤 DB 로 한다.
 *
 * <p>로그인 정책이 그 서비스를 직접 참조하지 않고 이 포트를 두는 이유: 권한 관리·인증 패키지(service.auth)는 로그인 시점에
 * 이미 이 패키지의 정책 판정({@code validateLoginPolicy})을 쓴다. 이 패키지가 다시 service.auth 를 참조하면 서비스 패키지
 * 순환(ArchitectureTest no_cycles_in_service_packages)이 생기므로, 필요한 것을 이 패키지가 선언하고 service.auth 가 구현한다.
 * 메서드 이름·의미는 구현의 기존 공개 메서드와 같다 — 계정 상태 변경이 부르는 것과 다른 판정을 두지 않는다.
 */
public interface ProtectedAccountChangeGuard {

    /**
     * 대상이 보호 계정이면 호출자의 권한 설정·권한 배정을 DB 에서 다시 확인하고, 없으면 ACCESS_DENIED 로 거부한다.
     * 공유 직렬화 잠금을 잡으므로 호출 트랜잭션 안에서만 부른다(구현이 MANDATORY 전파다).
     *
     * @param esntlId 대상 사용자 식별자(로그인 ID 가 아니다)
     */
    void authorizeProtectedAccountChange(String esntlId);

    /**
     * 지금 로그인해 권한을 관리할 수 있는 활성 권한관리자 수. 사용 중·잠기지 않음·접속 제한(로그인 정책 lmt_yn='Y') 없음인
     * 사용자 가운데 권한 조회·설정·배정을 모두 가진 사람을 센다. 변경을 쓰기 전에 읽어 {@link #protectLastManager} 에 넘긴다.
     */
    long managerCount();

    /**
     * 쓰기(와 flush) 뒤에 부른다. 앞서 활성 권한관리자가 있었는데 이제 없으면 INVALID_INPUT_VALUE 로 거부해 트랜잭션을
     * 되돌린다.
     *
     * @param previous 쓰기 전에 {@link #managerCount()} 로 읽은 값
     */
    void protectLastManager(long previous);
}
