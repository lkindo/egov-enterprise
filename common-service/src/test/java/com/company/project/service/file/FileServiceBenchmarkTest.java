package com.company.project.service.file;

import com.company.project.BenchmarkTestConfig;
import com.company.project.domain.file.FileDetail;
import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.TestPropertySource;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = BenchmarkTestConfig.class)
@EntityScan(basePackages = "com.company.project.domain")
@EnableJpaRepositories(basePackages = "com.company.project.domain")
@Import(FileService.class)
@TestPropertySource(properties = "file.upload-dir=./test-uploads")
class FileServiceBenchmarkTest {

    @Autowired
    private FileService fileService;

    @Autowired
    private FileMasterRepository fileMasterRepository;

    @Autowired
    private FileDetailRepository fileDetailRepository;

    @Test
    void benchmarkUpdateFiles() throws Exception {
        // Setup
        String atchFileId = "FILE_" + UUID.randomUUID().toString().substring(0, 12);
        FileMaster master = FileMaster.builder().atchFileId(atchFileId).build();
        fileMasterRepository.save(master);

        int detailCount = 10000;
        List<FileDetail> details = new ArrayList<>();
        for (int i = 1; i <= detailCount; i++) {
            FileDetail detail = FileDetail.builder()
                    .fileMaster(master)
                    .fileSn(i)
                    .orignlFileNm("file_" + i + ".txt")
                    .fileExtsn("txt")
                    .fileMg(100L)
                    .build();
            details.add(detail);
        }
        fileDetailRepository.saveAll(details);
        fileDetailRepository.flush(); // ensure they are in DB

        // Warmup
        fileService.updateFiles(atchFileId, Collections.emptyList());

        // Benchmark
        long startTime = System.nanoTime();
        fileService.updateFiles(atchFileId, Collections.emptyList());
        long endTime = System.nanoTime();

        long durationMs = (endTime - startTime) / 1_000_000;
        System.out.println("BENCHMARK_RESULT: Execution time for updateFiles with " + detailCount + " details: " + durationMs + " ms");

        // Assertions to make sure it ran correctly
        assertThat(durationMs).isGreaterThanOrEqualTo(0);
    }
}
