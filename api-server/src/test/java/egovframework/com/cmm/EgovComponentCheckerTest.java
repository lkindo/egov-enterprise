package egovframework.com.cmm;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationContext;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class EgovComponentCheckerTest {

    private ApplicationContext applicationContext;
    private EgovComponentChecker egovComponentChecker;

    @BeforeEach
    void setUp() {
        applicationContext = mock(ApplicationContext.class);
        egovComponentChecker = new EgovComponentChecker();
        egovComponentChecker.setApplicationContext(applicationContext);
    }

    @Test
    void benchmarkHasComponent() {
        String existingBean = "existingBean";
        String nonExistingBean = "nonExistingBean";

        // Setup behavior
        when(applicationContext.getBean(existingBean)).thenReturn(new Object());
        when(applicationContext.getBean(nonExistingBean)).thenThrow(new NoSuchBeanDefinitionException(nonExistingBean));
        when(applicationContext.containsBean(existingBean)).thenReturn(true);
        when(applicationContext.containsBean(nonExistingBean)).thenReturn(false);

        // Warmup
        for (int i = 0; i < 1000; i++) {
            EgovComponentChecker.hasComponent(existingBean);
            EgovComponentChecker.hasComponent(nonExistingBean);
        }

        int iterations = 100000;
        long start, end;

        // Measure existing bean
        start = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            EgovComponentChecker.hasComponent(existingBean);
        }
        end = System.nanoTime();
        System.out.println("Existing bean time: " + (end - start) / 1_000_000.0 + " ms");

        // Measure non-existing bean (the optimization target)
        start = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            EgovComponentChecker.hasComponent(nonExistingBean);
        }
        end = System.nanoTime();
        System.out.println("Non-existing bean time: " + (end - start) / 1_000_000.0 + " ms");

        // Assertions to ensure correctness
        assertTrue(EgovComponentChecker.hasComponent(existingBean));
        assertFalse(EgovComponentChecker.hasComponent(nonExistingBean));
    }
}
