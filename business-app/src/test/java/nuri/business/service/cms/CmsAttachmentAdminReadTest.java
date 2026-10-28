package nuri.business.service.cms;

import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.file.AttachmentSource;
import nuri.business.service.file.JdbcAttachmentReferenceResolver;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.sql.ResultSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 콘텐츠 페이지 이미지 첨부의 관리 열람 경계 — {@link JdbcAttachmentReferenceResolver} 의 CMS 참조원(ADR-0039).
 *
 * <p>[왜 콘텐츠 페이지 시험 디렉터리인가] 판정 SQL 은 business-core 에 있지만 관리 열람 권한({@link PermissionCodes#CMS_ADMIN_READ})은
 * 콘텐츠 페이지 기능 소유다. 생성기는 구성마다 권한 코드 상수를 다시 만들고 원장에 없는 코드는 늘 거부하므로, 콘텐츠 페이지가 빠진
 * 생성물에서는 이 단언이 제품 결함 없이 붉었다(T2, 2026-10-23~). 그 구성에서는 CMS 참조원을 등록하는 기여자도 없어 이 분기에 닿지
 * 않는다. 그래서 기능과 함께 빠지는 이 디렉터리로 옮겼다(DEC-OPS-257 ①). 권한을 보지 않는 CMS 단언
 * ({@code cmsImageInCurrentRevisionIsShared})은 business-core 의 {@code JdbcAttachmentReferenceResolverTest} 에 남는다.
 */
@DisplayName("JdbcAttachmentReferenceResolver — 콘텐츠 페이지 이미지의 관리 열람")
class CmsAttachmentAdminReadTest {

    private static final Long ATCH_FILE_SN = 101L;
    private static final String LOGIN_ID = "webmaster";
    private static final String ESNTL_ID = "USR_0000000000000001";

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("게시본이 쓰지 않는 콘텐츠 페이지 이미지(초안·지난 게시본)는 관리 열람 권한(CMS_ADMIN_READ)이 있어야 공유 근거다")
    void cmsImageOutsideCurrentRevisionNeedsAdminRead() {
        JdbcAttachmentReferenceResolver resolver = new JdbcAttachmentReferenceResolver(unpublishedCmsReference(),
                List.of(() -> List.of(AttachmentSource.CMS_PAGE)));

        authenticate();
        assertThat(resolver.resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID).sharedGrant()).isFalse();
        authenticate(PermissionCodes.CMS_ADMIN_READ);
        assertThat(resolver.resolve(ATCH_FILE_SN, LOGIN_ID, ESNTL_ID).sharedGrant()).isTrue();
    }

    /** CMS 참조원 조회에 참조 행 하나(현재 게시본이 쓰지 않음, published=false)를 돌려주는 최소 목 JdbcTemplate. */
    private static JdbcTemplate unpublishedCmsReference() {
        JdbcTemplate template = mock(JdbcTemplate.class);
        when(template.query(contains(" FROM " + AttachmentSource.CMS_PAGE.table() + " "),
                ArgumentMatchers.<RowMapper<Object>>any(), any(Object[].class)))
                .thenAnswer(invocation -> {
                    ResultSet rs = mock(ResultSet.class);
                    when(rs.getBoolean("published")).thenReturn(false);
                    RowMapper<?> mapper = invocation.getArgument(1);
                    return List.of(mapper.mapRow(rs, 0));
                });
        return template;
    }

    private static void authenticate(String... permissions) {
        CustomUserDetails user = CustomUserDetails.builder().userId(LOGIN_ID).esntlId(ESNTL_ID).enabled(true)
                .permissions(List.of(permissions)).authorizationVersion("fixture").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
}
