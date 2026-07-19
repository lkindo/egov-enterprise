package nuri.api.config;
 
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationContext;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import nuri.foundation.core.config.ApplicationContextProvider;
import nuri.business.security.util.SecurityUtil;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    // Reset the context to null to avoid side effects
    provider.setApplicationContext(null);
    SecurityContextHolder.clearContext();
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
 
  @Test
  void testSecurityUtilHasRoleWithRoleHierarchy() {
    // given
    RoleHierarchy mockRoleHierarchy = mock(RoleHierarchy.class);
    when(mockContext.getBean(RoleHierarchy.class)).thenReturn(mockRoleHierarchy);
 
    Authentication mockAuth = mock(Authentication.class);
    doReturn(List.of(new SimpleGrantedAuthority("ROLE_SYSTEM"))).when(mockAuth).getAuthorities();
 
    SecurityContext mockSecurityContext = mock(SecurityContext.class);
    when(mockSecurityContext.getAuthentication()).thenReturn(mockAuth);
    SecurityContextHolder.setContext(mockSecurityContext);
 
    // SYSTEM이 ADMIN 권한으로 도달 가능하다고 스터빙
    doReturn(List.of(new SimpleGrantedAuthority("ROLE_SYSTEM"), new SimpleGrantedAuthority("ROLE_ADMIN")))
        .when(mockRoleHierarchy).getReachableGrantedAuthorities(any());
 
    // when
    boolean result = SecurityUtil.hasRole("ADMIN");
 
    // then
    assertTrue(result);
    verify(mockRoleHierarchy).getReachableGrantedAuthorities(any());
  }
}
