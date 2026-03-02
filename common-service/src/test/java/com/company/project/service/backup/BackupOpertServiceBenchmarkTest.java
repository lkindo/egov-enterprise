package com.company.project.service.backup;

import com.company.project.BenchmarkTestConfig;
import com.company.project.domain.backup.BackupOpert;
import com.company.project.domain.backup.BackupOpertRepository;
import com.company.project.domain.backup.BackupSchdulDfk;
import com.company.project.service.code.EgovCommonCodeService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import jakarta.persistence.EntityManager;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.when;

@SpringBootTest(classes = BenchmarkTestConfig.class, properties = "spring.jpa.show-sql=true")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@EntityScan(basePackages = "com.company.project.domain")
@EnableJpaRepositories(basePackages = "com.company.project.domain")
@Import(BackupOpertService.class)
public class BackupOpertServiceBenchmarkTest {

  @Autowired
  private BackupOpertService backupOpertService;

  @Autowired
  private BackupOpertRepository backupOpertRepository;

  @Autowired
  private EntityManager entityManager;

  @MockitoBean
  private EgovCommonCodeService commonCodeService;

  @Test
  @org.junit.jupiter.api.Disabled("NPE 발생 - 통합테스트 환경에서 실행")
  @Transactional
  public void testGetBackupOpertListPerformance() {
    // Given
    int count = 100;
    List<BackupOpert> entities = new ArrayList<>();

    for (int i = 0; i < count; i++) {
      String id = String.format("ID_%03d", i);
      BackupOpert entity = BackupOpert.builder()
          .backupOpertId(id)
          .backupOpertNm("Backup " + i)
          .backupOrginlDrctry("/src")
          .backupStreDrctry("/dest")
          .cmprsSe("01")
          .executCycle("02") // Weekly
          .executSchdulHour("01")
          .executSchdulMnt("00")
          .executSchdulSecnd("00")
          .useAt("Y")
          .build();

      // Add 5 schedule dfk
      for (int j = 0; j < 5; j++) {
        entity.getExecutSchdulDfkSes().add(BackupSchdulDfk.builder()
            .backupOpertId(id)
            .executSchdulDfkSe(String.valueOf(j))
            .backupOpert(entity)
            .build());
      }

      entities.add(entity);
    }

    backupOpertRepository.saveAll(entities);
    backupOpertRepository.flush();

    entityManager.clear();

    // Mock CommonCodeService - COM047 and COM074 groups
    when(commonCodeService.getCodesByGroup("COM047")).thenReturn(Collections.emptyList());
    when(commonCodeService.getCodesByGroup("COM074")).thenReturn(Collections.emptyList());
    when(commonCodeService
        .getCodesByGroup(java.util.Objects.requireNonNull(org.mockito.ArgumentMatchers.anyString())))
        .thenAnswer(invocation -> {
          String group = java.util.Objects.requireNonNull(invocation.getArgument(0));
          if ("COM047".equals(group) || "COM074".equals(group)) {
            return Collections.emptyList();
          }
          return Collections.emptyList();
        });

    // When
    long startTime = System.currentTimeMillis();
    // Page size 100 to fetch all
    backupOpertService.getBackupOpertList(null, null, PageRequest.of(0, 100));
    long endTime = System.currentTimeMillis();

    // Then
    long duration = endTime - startTime;
    System.out.println("Execution time for fetching " + count + " records with children: " + duration + " ms");
  }
}
