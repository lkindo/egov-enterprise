package nuri.business.security.util;
 
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import java.util.Optional;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
 
@Component
public class SecurityUtil {

    public static boolean hasPermission(String permission) {
        return nuri.business.security.authorization.PermissionPolicy.has(
                SecurityContextHolder.getContext().getAuthentication(), permission);
    }

    public static void assertPermission(String permission) {
        if (!hasPermission(permission)) throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
    }

    public static void assertOwnerOrPermission(String ownerLoginId, String overridePermission) {
        if (hasPermission(overridePermission)) return;
        String current = getCurrentLoginId().orElse(null);
        if (current == null || !current.equals(ownerLoginId)) throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
    }

    public static void assertOwnerOrPermissionByEsntlId(String ownerEsntlId, String overridePermission) {
        if (hasPermission(overridePermission)) return;
        assertOwnerByEsntlId(ownerEsntlId);
    }
 
    /**
     * 현재 인증 주체의 <b>esntlId</b>(시스템 내부 PK)를 반환한다.
     * (principal 이 {@link UserDetails} 이면 {@code getUsername()} == esntlId 규약을 따른다.)
     *
     * <p><b>⚠ 감사 컬럼과의 비교에는 이 메서드를 쓰지 않는다.</b> 감사 컬럼
     * ({@code frstRgtrId}/{@code lastMdfrId})에 저장되는 값은 <b>loginId</b>이므로
     * ({@link nuri.business.security.audit.LoginUserAuditorAware} 참조)
     * {@link #getCurrentLoginId()} 로 비교해야 한다.</p>
     *
     * <p><b>소유권(IDOR) 비교의 축은 도메인마다 다르다.</b> 소유자 필드가 감사 컬럼을
     * 쓰는 표준 도메인은 {@link #assertOwnerOrPermission(String, String)}(loginId 기준)로,
     * 소유자 필드를 <b>esntlId 로 저장</b>하는 도메인({@code InformalSanction.aplcntId},
     * {@code Board.userId} 등)은 이 메서드({@code getCurrentEsntlId()})로 비교해야 축이 일치한다.
     * 상세 규약: {@code docs/03-guides/identity-model-guide.md} §2.</p>
     *
     * @return esntlId (User 엔티티 PK). 인증 정보 부재 시 {@code Optional.empty()}.
     * @see #getCurrentLoginId()
     * @see #assertOwnerOrPermission(String, String)
     */
    public static Optional<String> getCurrentEsntlId() {
        final Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
 
        if (authentication == null) {
            return Optional.empty();
        }
 
        String esntlId = null;
        if (authentication.getPrincipal() instanceof UserDetails springSecurityUser) {
            esntlId = springSecurityUser.getUsername();
        } else if (authentication.getPrincipal() instanceof String principalString) {
            esntlId = principalString;
        }
 
        return Optional.ofNullable(esntlId);
    }
 
    /**
     * @deprecated 이름과 달리 <b>로그인 ID 가 아니라 esntlId</b> 를 반환한다(정체성 footgun).
     * 의미가 명확한 {@link #getCurrentEsntlId()} 를 사용하라. 하위호환을 위해 위임만 유지한다.
     */
    @Deprecated
    public static Optional<String> getCurrentUserId() {
        return getCurrentEsntlId();
    }
 


    /**
     * 현재 인증 주체의 <b>로그인 ID</b>(CustomUserDetails.getUserId)를 반환한다.
     * 소유권 비교는 감사 컬럼 frstRgtrId 에 저장되는 값(=loginId, {@code LoginUserAuditorAware})과
     * 일치시켜야 하므로 esntlId 가 아닌 loginId 를 쓴다.
     */
    public static Optional<String> getCurrentLoginId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            return Optional.ofNullable(userDetails.getLoginId());
        }
        return Optional.empty();
    }






    /**
     * 리소스 소유권(본인) 검증. <b>관리자도 우회하지 못한다.</b> — 대리 수행이 허용되지 않는
     * 인격 귀속 행위(결재자 본인 승인, 신청자 본인 정정 등)용 엄격 가드.
     * 소유자 식별은 <b>esntlId</b> 기준(User 엔티티 PK)이다.
     *
     * <p>관리자 우회가 필요한 일반 소유권 검증은 {@link #assertOwnerOrPermissionByEsntlId(String, String)} 를 쓴다.
     * 두 헬퍼를 혼동해 이 자리에 관리자 우회를 도입하면 결재 무결성이 깨지므로 주의한다.</p>
     *
     * @param ownerEsntlId 리소스 귀속 주체의 esntlId
     * @throws BusinessException ACCESS_DENIED — 현재 주체가 그 본인이 아닐 때(미인증 포함, fail-closed)
     */
    public static void assertOwnerByEsntlId(String ownerEsntlId) {
        String current = getCurrentEsntlId().orElse(null);
        if (current == null || !current.equals(ownerEsntlId)) {
            throw new BusinessException(CommonErrorCode.ACCESS_DENIED);
        }
    }




}
