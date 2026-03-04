package com.company.project.core.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationContext;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ApplicationContextProviderTest {

    private ApplicationContext mockContext;
    private ApplicationContextProvider provider;

    @BeforeEach
    void setUp() throws Exception {
        mockContext = mock(ApplicationContext.class);
        provider = new ApplicationContextProvider();
        
        // Reset static field using reflection for isolation
        Field field = ApplicationContextProvider.class.getDeclaredField("applicationContext");
        field.setAccessible(true);
        field.set(null, null);
    }

    @Test
    @DisplayName("ApplicationContext 설정 및 조회 확인")
    void setAndGetApplicationContext() {
        provider.setApplicationContext(mockContext);
        assertThat(ApplicationContextProvider.getApplicationContext()).isEqualTo(mockContext);
    }

    @Test
    @DisplayName("Class 타입으로 빈 조회 확인")
    void getBeanByClass_Success() {
        provider.setApplicationContext(mockContext);
        String expectedBean = "testBean";
        when(mockContext.getBean(String.class)).thenReturn(expectedBean);

        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertThat(actualBean).isEqualTo(expectedBean);
    }

    @Test
    @DisplayName("Context가 없을 때 Class 타입으로 빈 조회 시 null 반환")
    void getBeanByClass_NullContext_ReturnsNull() {
        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertThat(actualBean).isNull();
    }

    @Test
    @DisplayName("조회 중 예외 발생 시 null 반환")
    void getBeanByClass_Exception_ReturnsNull() {
        provider.setApplicationContext(mockContext);
        when(mockContext.getBean(String.class)).thenThrow(new RuntimeException("Bean not found"));

        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertThat(actualBean).isNull();
    }

    @Test
    @DisplayName("이름으로 빈 조회 확인")
    void getBeanByName_Success() {
        provider.setApplicationContext(mockContext);
        Object expectedBean = new Object();
        when(mockContext.getBean("beanName")).thenReturn(expectedBean);

        Object actualBean = ApplicationContextProvider.getBean("beanName");
        assertThat(actualBean).isEqualTo(expectedBean);
    }

    @Test
    @DisplayName("Context가 없을 때 이름으로 빈 조회 시 null 반환")
    void getBeanByName_NullContext_ReturnsNull() {
        Object actualBean = ApplicationContextProvider.getBean("beanName");
        assertThat(actualBean).isNull();
    }
}
