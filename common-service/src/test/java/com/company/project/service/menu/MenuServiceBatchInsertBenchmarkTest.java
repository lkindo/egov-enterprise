package com.company.project.service.menu;

import com.company.project.BenchmarkTestConfig;
import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = BenchmarkTestConfig.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@EntityScan(basePackages = "com.company.project.domain")
@EnableJpaRepositories(basePackages = "com.company.project.domain")
@Import(MenuService.class)
@ActiveProfiles("test")
@Transactional
public class MenuServiceBatchInsertBenchmarkTest {

    @Autowired
    private MenuService menuService;

    @Autowired
    private MenuAuthorityRepository menuAuthorityRepository;

    @Test
    public void testInsertMenuCreatListPerformance() {
        // Given
        String authorCode = "TEST_AUTHOR_CODE";
        int count = 1000;

        // Generate comma separated menu numbers
        String checkedMenuNos = IntStream.rangeClosed(1, count)
                .mapToObj(String::valueOf)
                .collect(Collectors.joining(","));

        // Pre-clean
        menuAuthorityRepository.deleteByIdAuthorCode(authorCode);

        // When
        long startTime = System.currentTimeMillis();
        menuService.insertMenuCreatList(authorCode, checkedMenuNos);
        menuAuthorityRepository.flush();
        long endTime = System.currentTimeMillis();

        // Then
        long duration = endTime - startTime;
        System.out.println("Execution time for inserting " + count + " records: " + duration + " ms");

        long dbCount = menuAuthorityRepository.findByIdAuthorCode(authorCode).size();
        assertThat(dbCount).isEqualTo(count);

        // Cleanup
        menuAuthorityRepository.deleteByIdAuthorCode(authorCode);
    }
}
