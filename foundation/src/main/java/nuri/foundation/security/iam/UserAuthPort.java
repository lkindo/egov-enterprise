package nuri.foundation.security.iam;

import org.springframework.security.core.userdetails.UserDetails;

/**
 * 프레임워크 보안 모듈이 특정 사용자 엔티티 결합을 피하기 위한 포트 인터페이스 (DIP)
 */
public interface UserAuthPort {
    /** 검증한 내부 사용자 식별자(JWT subject)를 해석한다. 입력 로그인 ID와 혼합 조회하지 않는다. */
    UserDetails loadUserByUsername(String username);
}
