package com.company.project.service.anniversary;

import com.company.project.domain.anniversary.Anniversary;
import com.company.project.domain.anniversary.AnniversaryDomainRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "spring.jpa.show-sql=true")
@Import(AnniversaryService.class)
public class AnniversaryServiceIntegrationTest {

    @Autowired
    private AnniversaryService anniversaryService;

    @Autowired
    private AnniversaryDomainRepository anniversaryRepository;

    private Anniversary ann1;
    private Anniversary ann2;

    @BeforeEach
    void setUp() {
        ann1 = Anniversary.builder()
                .annId("ANN_001")
                .usid("USER_001")
                .annvrsrySe("1")
                .annvrsryNm("Birthday")
                .annvrsryDe("20231010")
                .cldrSe("1")
                .reptitSe("1")
                .frstRegisterId("USER_001")
                .build();
        anniversaryRepository.save(ann1);

        ann2 = Anniversary.builder()
                .annId("ANN_002")
                .usid("USER_001")
                .annvrsrySe("1")
                .annvrsryNm("Wedding")
                .annvrsryDe("20231225")
                .cldrSe("1")
                .reptitSe("1")
                .frstRegisterId("USER_001")
                .build();
        anniversaryRepository.save(ann2);
    }

    @Test
    void checkAnniversaryDuplicate_ExcludeSelf_ShouldReturnZero() {
        // Checking if "Birthday" on "20231010" is a duplicate, EXCLUDING ANN_001 (itself)
        // Should be 0
        int count = anniversaryService.checkAnniversaryDuplicate("USER_001", "20231010", "Birthday", "ANN_001");
        assertThat(count).isEqualTo(0);
    }

    @Test
    void checkAnniversaryDuplicate_ExcludeOther_ShouldReturnOne() {
        // Checking if "Birthday" on "20231010" is a duplicate, EXCLUDING ANN_002 (other)
        // Should be 1 (because ANN_001 exists with these details)
        int count = anniversaryService.checkAnniversaryDuplicate("USER_001", "20231010", "Birthday", "ANN_002");
        assertThat(count).isEqualTo(1);
    }

    @Test
    void checkAnniversaryDuplicate_ConflictWithOther_ShouldReturnOne() {
        // Update ANN_001 to have details of ANN_002
        // EXCLUDING ANN_001
        // Should be 1 (because ANN_002 exists with these details)
        int count = anniversaryService.checkAnniversaryDuplicate("USER_001", "20231225", "Wedding", "ANN_001");
        assertThat(count).isEqualTo(1);
    }

    @Test
    void checkAnniversaryDuplicate_NoConflict_ShouldReturnZero() {
        // Update ANN_001 to new unique details
        int count = anniversaryService.checkAnniversaryDuplicate("USER_001", "20240101", "New Year", "ANN_001");
        assertThat(count).isEqualTo(0);
    }
}
