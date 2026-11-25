package nuri;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("WAR 배포 표지")
class ApiServerApplicationWarMarkerTest {

    @Test
    @DisplayName("🚨 외부 서블릿 컨테이너 진입점(configure)은 표지 속성을 준다 — 없으면 WAR 배포에서 JWT 개발키 검사가 돌지 않는다")
    void servletInitializerMarksExternalContainer() {
        SpringApplicationBuilder builder = new ApiServerApplication().configure(new SpringApplicationBuilder());

        @SuppressWarnings("unchecked")
        Map<String, Object> defaults = (Map<String, Object>) ReflectionTestUtils.getField(builder.application(), "defaultProperties");
        assertThat(defaults).containsEntry("nuri.deployment.external-servlet-container", "true");
    }
}
