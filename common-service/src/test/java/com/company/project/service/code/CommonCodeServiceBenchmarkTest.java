package com.company.project.service.code;

import com.company.project.BenchmarkTestConfig;
import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeCategoryRepository;
import com.company.project.domain.code.CommonCodeGroupRepository;
import com.company.project.domain.code.CommonCodeRepository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.Collections;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest(classes = BenchmarkTestConfig.class)
public class CommonCodeServiceBenchmarkTest {

    @Autowired
    private CommonCodeService commonCodeService;

    @MockBean
    private CommonCodeRepository commonCodeRepository;

    @MockBean
    private CommonCodeCategoryRepository commonCodeCategoryRepository;

    @MockBean
    private CommonCodeGroupRepository commonCodeGroupRepository;

    @Test
    public void benchmarkGetCodesByGroup() {
        String codeGroupId = "TEST_GROUP";
        CommonCode commonCode = CommonCode.builder()
                .codeGroupId(codeGroupId)
                .code("TEST_CODE")
                .codeNm("Test Code")
                .useAt("Y")
                .build();

        given(commonCodeRepository.findByCodeGroupIdAndUseAt(codeGroupId, "Y"))
                .willReturn(Collections.singletonList(commonCode));

        // Warmup
        for (int i = 0; i < 100; i++) {
            commonCodeService.getCodesByGroup(codeGroupId);
        }

        long startTime = System.nanoTime();
        int iterations = 1000;
        for (int i = 0; i < iterations; i++) {
            commonCodeService.getCodesByGroup(codeGroupId);
        }
        long endTime = System.nanoTime();

        System.out.println(
                "Execution time for " + iterations + " iterations: " + (endTime - startTime) / 1_000_000.0 + " ms");

        // Should be called only once due to caching
        verify(commonCodeRepository, times(1)).findByCodeGroupIdAndUseAt(codeGroupId, "Y");
    }
}
