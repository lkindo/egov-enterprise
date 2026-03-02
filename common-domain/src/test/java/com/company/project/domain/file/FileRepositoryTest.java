package com.company.project.domain.file;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("File 관련 Repository 테스트")
class FileRepositoryTest {

    @Autowired
    private FileMasterRepository fileMasterRepository;

    @Autowired
    private FileDetailRepository fileDetailRepository;

    @Test
    @DisplayName("파일 마스터 및 상세 정보 저장 확인")
    void saveMasterAndDetail() {
        // Given
        FileMaster master = FileMaster.builder()
                .atchFileId("FILE_001")
                .build();

        FileDetail detail = FileDetail.builder()
                .fileSn(0)
                .orignlFileNm("test.txt")
                .streFileNm("stre_test.txt")
                .fileExtsn("txt")
                .fileMg(100L)
                .fileStreCours("/upload/test")
                .fileCn("This is a test file")
                .build();

        master.addFileDetail(detail);

        // When
        fileMasterRepository.save(master);
        Optional<FileMaster> foundMaster = fileMasterRepository.findById("FILE_001");

        // Then
        assertThat(foundMaster).isPresent();
        assertThat(foundMaster.get().getFileDetails()).hasSize(1);
        assertThat(foundMaster.get().getFileDetails().get(0).getOrignlFileNm()).isEqualTo("test.txt");
        assertThat(foundMaster.get().getFileDetails().get(0).getFileCn()).isEqualTo("This is a test file");
        assertThat(foundMaster.get().getFileDetails().get(0).getFileMg()).isEqualTo(100L);

        // When: 상세 정보 직접 조회 (복합 키)
        FileDetailId detailId = new FileDetailId("FILE_001", 0);
        Optional<FileDetail> foundDetail = fileDetailRepository.findById(detailId);

        // Then
        assertThat(foundDetail).isPresent();
        assertThat(foundDetail.get().getFileExtsn()).isEqualTo("txt");
    }

    @Test
    @DisplayName("파일 마스터 삭제 시 상세 정보 같이 삭제(Cascade) 확인")
    void deleteMasterWithDetails() {
        // Given
        FileMaster master = FileMaster.builder().atchFileId("FILE_002").build();
        master.addFileDetail(FileDetail.builder().fileSn(0).orignlFileNm("f1.png").build());
        master.addFileDetail(FileDetail.builder().fileSn(1).orignlFileNm("f2.png").build());
        fileMasterRepository.saveAndFlush(master);

        // When
        fileMasterRepository.deleteById("FILE_002");
        fileMasterRepository.flush();

        // Then
        assertThat(fileMasterRepository.findById("FILE_002")).isNotPresent();
        assertThat(fileDetailRepository.findById(new FileDetailId("FILE_002", 0))).isNotPresent();
    }
}
