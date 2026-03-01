package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.file.*;
import com.company.project.service.file.dto.FileDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

/**
 * FileService ??•Ïêû ???í™??
 */
@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock
    private FileMasterRepository fileMasterRepository;

    @Mock
    private FileDetailRepository fileDetailRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    @InjectMocks
    private FileService fileService;

    @Test
    @DisplayName("Ôß£‚ë§????î™ Ôßè‚ë∏Ï§?Ë≠∞Í≥†???ÍπÉÎÇ¨")
    void getFileList_success() {
        // given
        String atchFileId = "FILE_001";
        FileMaster master = FileMaster.builder().atchFileId(atchFileId).build();

        FileDetail detail = FileDetail.builder()
                .fileSn(1)
                .orignlFileNm("test.pdf")
                .fileExtsn("pdf")
                .fileMg(1024L)
                .build();
        detail.setFileMaster(master);

        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.of(master));
        given(fileDetailRepository.findByFileMaster(master)).willReturn(List.of(detail));

        // when
        List<FileDto> result = fileService.getFileList(atchFileId);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getOrignlFileNm()).isEqualTo("test.pdf");
    }

    @Test
    @DisplayName("Ë≠∞ÎåÅ???? ??ÖÎíó ???î™IDÊø?Ë≠∞Í≥†??????âÏáÖ Ë´õÏíñÍπ?)
    void getFileList_notFound() {
        // given
        String atchFileId = "NOT_EXIST";
        given(fileMasterRepository.findById(atchFileId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> fileService.getFileList(atchFileId))
                .isInstanceOf(BusinessException.class);
    }
}
