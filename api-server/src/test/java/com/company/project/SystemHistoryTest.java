package com.company.project;

import com.company.project.domain.syshistory.SystemHistory;
import com.company.project.domain.syshistory.SystemHistoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
public class SystemHistoryTest {

  @org.springframework.context.annotation.Configuration
  @org.springframework.boot.autoconfigure.EnableAutoConfiguration
  @org.springframework.data.jpa.repository.config.EnableJpaRepositories(basePackages = "com.company.project.domain.syshistory")
  @org.springframework.boot.autoconfigure.domain.EntityScan(basePackages = "com.company.project.domain")
  @org.springframework.data.jpa.repository.config.EnableJpaAuditing(auditorAwareRef = "logInUserAuditorAware")
  static class TestConfig {
    @org.springframework.context.annotation.Bean
    public org.springframework.data.domain.AuditorAware<String> logInUserAuditorAware() {
      return () -> java.util.Optional.of("SYSTEM");
    }
  }

  @Autowired
  private SystemHistoryRepository systemHistoryRepository;

  @Test
  public void testFindAll() {
    System.out.println("DEBUG: Starting testFindAll");
    // Test paging and sorting as used in Controller: Sort by "frstRegisterPnttm"
    PageRequest pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));

    try {
      Page<SystemHistory> result = systemHistoryRepository.findAll(pageable);
      System.out.println("DEBUG: Found " + result.getTotalElements() + " elements.");
      List<SystemHistory> list = result.getContent();
      if (!list.isEmpty()) {
        System.out.println("DEBUG: First element ID: " + list.get(0).getHistId());
      }
    } catch (Exception e) {
      System.out.println("DEBUG: Exception occurred!");
      e.printStackTrace();
      throw e;
    }
  }
}
