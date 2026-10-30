package nuri.business.service.file.dto;

import nuri.business.domain.file.FileDetail;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** 첨부 조회 한 번의 불변 값. 저장소 식별자는 서버 내부 비교에만 쓰고 API에는 toFileDtos()만 전달한다. */
public record FileReadSnapshot(List<Entry> files) {

    public FileReadSnapshot {
        files = List.copyOf(files);
    }

    public static FileReadSnapshot empty() {
        return new FileReadSnapshot(List.of());
    }

    public List<FileDto> toFileDtos() {
        return files.stream().map(Entry::toDto).toList();
    }

    public record Entry(UUID id, Long atchFileSn, Integer atchFileSeq, String strgFileNm,
                        String fileStrgPath, String orgnlFileNm, String fileEstn, Long fileSz,
                        String fileCn, LocalDateTime crtDt) {
        public static Entry from(FileDetail detail) {
            return new Entry(detail.getId(), detail.getFileMaster().getAtchFileSn(), detail.getAtchFileSeq(),
                    detail.getStrgFileNm(), detail.getFileStrgPath(), detail.getOrgnlFileNm(), detail.getFileEstn(),
                    detail.getFileSz(), detail.getFileCn(), detail.getCrtDt());
        }

        public FileDto toDto() {
            return FileDto.builder().atchFileSn(atchFileSn).fileSn(atchFileSeq).orignlFileNm(orgnlFileNm)
                    .fileExtsn(fileEstn).fileMg(fileSz).fileCn(fileCn).crtDt(crtDt).build();
        }
    }
}
