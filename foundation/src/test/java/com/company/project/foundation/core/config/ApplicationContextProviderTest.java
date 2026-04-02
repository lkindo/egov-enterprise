package com.company.project.foundation.core.config;

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
    @DisplayName("ApplicationContext ?§Ï†ï Î∞?Ï°∞Ìöå ?ïÏù∏")
    void setAndGetApplicationContext() {
        provider.setApplicationContext(mockContext);
        assertThat(ApplicationContextProvider.getApplicationContext()).isEqualTo(mockContext);
    }

    @Test
    @DisplayName("Class ?Ä?ÖÏúºÎ°?Îπ?Ï°∞Ìöå ?ïÏù∏")
    void getBeanByClass_Success() {
        provider.setApplicationContext(mockContext);
        String expectedBean = "testBean";
        when(mockContext.getBean(String.class)).thenReturn(expectedBean);

        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertThat(actualBean).isEqualTo(expectedBean);
    }

    @Test
    @DisplayName("ContextÍ∞Ä ?ÜÏùÑ ??Class ?Ä?ÖÏúºÎ°?Îπ?Ï°∞Ìöå ??null Î∞òÌôò")
    void getBeanByClass_NullContext_ReturnsNull() {
        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertThat(actualBean).isNull();
    }

    @Test
    @DisplayName("Ï°∞Ìöå Ï§??àÏô∏ Î∞úÏÉù ??null Î∞òÌôò")
    void getBeanByClass_Exception_ReturnsNull() {
        provider.setApplicationContext(mockContext);
        when(mockContext.getBean(String.class)).thenThrow(new RuntimeException("Bean not found"));

        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertThat(actualBean).isNull();
    }

    @Test
    @DisplayName("?¥Î¶Ñ?ºÎ°ú Îπ?Ï°∞Ìöå ?ïÏù∏")
    void getBeanByName_Success() {
        provider.setApplicationContext(mockContext);
        Object expectedBean = new Object();
        when(mockContext.getBean("beanName")).thenReturn(expectedBean);

        Object actualBean = ApplicationContextProvider.getBean("beanName");
        assertThat(actualBean).isEqualTo(expectedBean);
    }

    @Test
    @DisplayName("ContextÍ∞Ä ?ÜÏùÑ ???¥Î¶Ñ?ºÎ°ú Îπ?Ï°∞Ìöå ??null Î∞òÌôò")
    void getBeanByName_NullContext_ReturnsNull() {
        Object actualBean = ApplicationContextProvider.getBean("beanName");
        assertThat(actualBean).isNull();
    }
}
