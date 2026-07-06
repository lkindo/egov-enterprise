package nuri.business.support;

import nuri.business.TestApplication;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import nuri.business.service.menu.MenuIntegrationService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 전역 컨트롤러 테스트 지원 베이스 클래스
 *
 * <p>제공하는 기능:
 * <ul>
 *   <li>MockMvc - HTTP 요청/응답 테스트</li>
 *   <li>ObjectMapper - JSON 직렬화/역직렬화</li>
 *   <li>Pageable 파라미터 자동 바인딩 ({@link MockMvcTestConfig} via {@link Import})</li>
 * </ul>
 *
 * <p>사용 방법:
 * <pre>
 * {@code
 * @WebMvcTest(MyController.class)
 * @AutoConfigureMockMvc(addFilters = false)
 * class MyControllerTest extends ControllerTestSupport {
 *     @MockitoBean
 *     private MyService myService;
 *     // ...
 * }
 * }
 * </pre>
 */
@ActiveProfiles("test")
@Import(MockMvcTestConfig.class)
@ContextConfiguration(classes = TestApplication.class)
public abstract class ControllerTestSupport {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @MockitoBean
    protected MenuIntegrationService menuIntegrationService;
}
