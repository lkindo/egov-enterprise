package com.company.project.api.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

class ApplicationContextProviderTest {

    private ApplicationContext mockContext;
    private ApplicationContextProvider provider;

    @BeforeEach
    void setUp() {
        mockContext = mock(ApplicationContext.class);
        provider = new ApplicationContextProvider();
        provider.setApplicationContext(mockContext);
    }

    @AfterEach
    void tearDown() {
        // Reset the static context to null to avoid side effects
        provider.setApplicationContext(null);
    }

    @Test
    void testGetBeanByClass_Success() {
        String expectedBean = "testBean";
        when(mockContext.getBean(String.class)).thenReturn(expectedBean);

        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertEquals(expectedBean, actualBean);
    }

    @Test
    void testGetBeanByClass_NullContext() {
        provider.setApplicationContext(null);
        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertNull(actualBean);
    }

    @Test
    void testGetBeanByClass_Exception() {
        when(mockContext.getBean(String.class)).thenThrow(new RuntimeException("Bean error"));

        String actualBean = ApplicationContextProvider.getBean(String.class);
        assertNull(actualBean);
    }

    @Test
    void testGetBeanByName_Success() {
        Object expectedBean = new Object();
        when(mockContext.getBean("beanName")).thenReturn(expectedBean);

        Object actualBean = ApplicationContextProvider.getBean("beanName");
        assertEquals(expectedBean, actualBean);
    }
}
