package nuri.foundation.security.iam;

import org.springframework.security.core.userdetails.UserDetails;

/**
 * 프레임워크 보안 모듈이 특정 사용자 엔티티 결합을 피하기 위한 포트 인터페이스 (DIP)
 */
public interface UserAuthPort {
    UserDetails loadUserByUsername(String username);
}
