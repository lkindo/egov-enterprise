package com.company.project.foundation.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 전역 컨트롤러 테스트 지원 베이스 클래스
 * MockMvc 및 ObjectMapper를 제공하여 컨트롤러 테스트의 반복 코드를 줄입니다.
 * 하위 클래스에서 @WebMvcTest 또는 @SpringBootTest + @AutoConfigureMockMvc를 사용하세요.
 */
@ActiveProfiles("test")
public abstract class ControllerTestSupport {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;
}
