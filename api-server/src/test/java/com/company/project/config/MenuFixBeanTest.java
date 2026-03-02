package com.company.project.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MenuFixBeanTest {

  @Mock
  private JdbcTemplate jdbcTemplate;

  @InjectMocks
  private MenuFixBean menuFixBean;

  @Test
  void fixMenuUrl_ShouldUpdateUrl() {
    menuFixBean.fixMenuUrl();
    verify(jdbcTemplate, times(1)).update(anyString());
  }

  @Test
  void fixMenuUrl_ShouldHandleException() {
    doThrow(new RuntimeException("Test Exception")).when(jdbcTemplate).update(anyString());

    // This should not throw an exception as it is caught inside the method
    menuFixBean.fixMenuUrl();

    verify(jdbcTemplate, times(1)).update(anyString());
  }
}
