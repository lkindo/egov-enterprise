package com.company.project.service.user;

import com.company.project.BenchmarkTestConfig;
import com.company.project.domain.user.UserAbsence;
import com.company.project.domain.user.UserAbsenceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = BenchmarkTestConfig.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@EntityScan(basePackages = "com.company.project.domain")
@EnableJpaRepositories(basePackages = "com.company.project.domain")
@Import(UserAbsenceManageService.class)
public class UserAbsenceManageServiceBenchmarkTest {

    @Autowired
    private UserAbsenceManageService userAbsenceManageService;

    @Autowired
    private UserAbsenceRepository userAbsenceRepository;

    @Test
    public void testDeleteUserAbsencesPerformance() {
        // Given
        int count = 1000;
        List<String> userIds = new ArrayList<>();
        List<UserAbsence> userAbsences = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            // Truncate UUID to fit in VARCHAR(20) as per memory
            String userId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
            userIds.add(userId);
            userAbsences.add(UserAbsence.builder()
                    .userId(userId)
                    .userAbsnceAt("Y")
                    .frstRegisterId("admin")
                    .build());
        }

        // Batch save to prepare data quickly
        userAbsenceRepository.saveAll(userAbsences);
        assertThat(userAbsenceRepository.count()).isEqualTo(count);

        String[] idsArray = userIds.toArray(new String[0]);

        // When
        long startTime = System.currentTimeMillis();
        userAbsenceManageService.deleteUserAbsences(idsArray);
        long endTime = System.currentTimeMillis();

        // Then
        long duration = endTime - startTime;
        System.out.println("Execution time for deleting " + count + " records: " + duration + " ms");

        assertThat(userAbsenceRepository.count()).isZero();
    }
}
