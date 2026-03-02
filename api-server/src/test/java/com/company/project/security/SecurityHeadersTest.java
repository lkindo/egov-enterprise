package com.company.project.security;

import com.company.project.security.config.SecurityConfig;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.security.service.CustomUserDetailsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

@WebMvcTest(controllers = SecurityHeadersTest.TestController.class, properties = "spring.main.allow-bean-definition-overriding=true")
@ContextConfiguration(classes = SecurityHeadersTest.TestConfig.class)
@Import(SecurityConfig.class)
@ActiveProfiles("dev") // To ensure SecurityConfig loads (!test)
public class SecurityHeadersTest {

  @Configuration
  @EnableAutoConfiguration
  static class TestConfig {
  }

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private CustomUserDetailsService customUserDetailsService;

  @MockitoBean
  private JwtTokenProvider jwtTokenProvider;

  @RestController("headersTestController")
  static class TestController {
    @GetMapping("/test-headers")
    public String test() {
      return "ok";
    }
  }

  @Test
  public void testSecurityHeaders() throws Exception {
    mockMvc.perform(get("/test-headers").secure(true))
        .andExpect(header().exists("X-Content-Type-Options"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(header().exists("X-XSS-Protection"))
        .andExpect(header().string("X-XSS-Protection", "1; mode=block"))
        .andExpect(header().exists("Strict-Transport-Security"));
  }
}
