package com.company.project;

import com.company.project.domain.syshistory.SystemHistory;
import com.company.project.domain.syshistory.SystemHistoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;

@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
@org.springframework.test.context.ActiveProfiles("dev")
@org.springframework.test.context.TestPropertySource(properties = "jwt.secret=test-secret-key-for-unit-testing-purposes-only-12345678901234567890")
public class SystemHistoryTest {

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
