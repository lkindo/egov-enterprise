package com.company.project.service.anniversary;

import com.company.project.domain.anniversary.Anniversary;
import com.company.project.domain.anniversary.AnniversaryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AnniversaryService ?듯빀 ?뚯뒪??
 * Note: DB ?쒖빟議곌굔 臾몄젣濡??명빐 ?꾩옱 鍮꾪솢?깊솕??
 */
@DataJpaTest(properties = {
        "spring.jpa.show-sql=true",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(AnniversaryService.class)
@Transactional
@Rollback
@org.junit.jupiter.api.Disabled("DB ?쒖빟議곌굔 臾몄젣 - ?꾩냽 ?묒뾽 ?꾩슂")
public class AnniversaryServiceIntegrationTest {

    @Autowired
    private AnniversaryService anniversaryService;

    @Autowired
    @Qualifier("ansAnniversaryRepository")
    private AnniversaryRepository anniversaryRepository;

    private Anniversary ann1;
    private Anniversary ann2;

    @BeforeEach
    @Transactional
    void setUp() {
        anniversaryRepository.deleteAll();

        ann1 = Anniversary.builder()
                .annId("ANN_001")
                .usid("USER_001")
                .annvrsrySe("1")
                .annvrsryNm("Birthday")
                .annvrsryDe("20231010")
                .cldrSe("1")
                .reptitAt("1")
                .build();
        anniversaryRepository.save(java.util.Objects.requireNonNull(ann1));

        ann2 = Anniversary.builder()
                .annId("ANN_002")
                .usid("USER_001")
                .annvrsrySe("1")
                .annvrsryNm("Wedding")
                .annvrsryDe("20231225")
                .cldrSe("1")
                .reptitAt("1")
                .build();
        anniversaryRepository.save(java.util.Objects.requireNonNull(ann2));
    }

    @Test
    @DisplayName("湲곕뀗??以묐났 ?뺤씤 - ?먯떊 ?쒖쇅 ??0 媛?諛섑솚")
    void checkAnniversaryDuplicate_ExcludeSelf_ShouldReturnZero() {
        // When
        int count = anniversaryService.checkAnniversaryDuplicate("USER_001", "20231010", "Birthday", "ANN_001");

        // Then
        assertThat(count).isEqualTo(0);
    }

    @Test
    @DisplayName("湲곕뀗??以묐났 ?뺤씤 - ?ㅻⅨ 寃??쒖쇅 ??1 媛?諛섑솚")
    void checkAnniversaryDuplicate_ExcludeOther_ShouldReturnOne() {
        // When
        int count = anniversaryService.checkAnniversaryDuplicate("USER_001", "20231010", "Birthday", "ANN_002");

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("湲곕뀗??以묐났 ?뺤씤 - ?ㅻⅨ 寃껉낵 異⑸룎 ??1 媛?諛섑솚")
    void checkAnniversaryDuplicate_ConflictWithOther_ShouldReturnOne() {
        // When
        int count = anniversaryService.checkAnniversaryDuplicate("USER_001", "20231225", "Wedding", "ANN_001");

        // Then
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("湲곕뀗??以묐났 ?뺤씤 - 異⑸룎 ?놁쓬 ??0 媛?諛섑솚")
    void checkAnniversaryDuplicate_NoConflict_ShouldReturnZero() {
        // When
        int count = anniversaryService.checkAnniversaryDuplicate("USER_001", "20240101", "New Year", "ANN_001");

        // Then
        assertThat(count).isEqualTo(0);
    }
}
