package nuri.api.support;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * HTTP 통합 테스트 stereotype — <b>운영 보안 체인 위에서</b> 컨트롤러를 검증한다.
 *
 * <p>[왜 별도로 두는가] 공용 {@code @IntegrationTest} 는 운영 보안 체인을 <b>3중으로</b> 우회한다.
 * <ol>
 *   <li>{@code @ActiveProfiles({"test","mock-security"})} — {@code ApiSecurityConfig} 와
 *       {@code SecurityConfig} 가 모두 {@code @Profile("!mock-security ...")} 라 비활성된다.</li>
 *   <li>{@code TestSecurityConfig} 의 {@code @Primary} 체인이 {@code anyRequest().permitAll()} 로
 *       모든 경로를 연다({@code securityMatcher} 가 없어 전 경로에 적용된다).</li>
 *   <li>{@code TestApplication} 이 {@code ApiSecurityConfig} 를 컴포넌트 스캔에서 배제한다 —
 *       프로파일을 고쳐도 이 축 때문에 운영 체인이 끝내 로드되지 않는다.</li>
 * </ol>
 *
 * <p>그 결과 {@code @EnableMethodSecurity} 선언 2곳이 모두 배제되어 {@code @PreAuthorize}·
 * {@code @AdminOnly} 도 집행되지 않는다. 즉 그 컨텍스트의 MockMvc 테스트는 인증·인가에 대해
 * <b>아무것도 증명하지 못한다</b> — 자격증명 없이 {@code /api/v1/admin/**} 를 호출해 200 을 받는 것이
 * 정상처럼 보이는 상태였다.
 *
 * <p>[이 stereotype 의 계약] {@code nuri.ApiServerApplication} 을 그대로 띄우고
 * {@code mock-security} 를 켜지 않으므로 운영 {@code ApiSecurityConfig} 가 로드된다.
 * 인가가 필요한 요청은 {@code @WithMockCustomUser(role = "ADMIN")} 등으로 주체를 실어야 통과한다.
 *
 * <p><b>정직한 한계</b>: HTTP와 메서드는 같은 operation binding·permission 정책을 집행한다.
 * 테스트 주체는 코드 catalog의 초기 그룹 배정을 확장한 canonical fixture이며 실제 OCI의 현재
 * 그룹 배정이나 물리 스키마를 증명하지 않는다. 저장소·원자 감사·회수는 별도 인가 통합 검증 대상이다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(
        classes = nuri.ApiServerApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
            "spring.main.allow-bean-definition-overriding=true",
            "springdoc.api-docs.enabled=false"
        })
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public @interface ApiHttpIntegrationTest {
}
