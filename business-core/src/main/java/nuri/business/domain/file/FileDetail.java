package nuri.business.domain.file;
import nuri.foundation.domain.common.BaseEntity;
import lombok.Builder;

import jakarta.persistence.*;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 파일 상세 엔티티 (NFILEDETAIL 테이블)
 *
 * <p>[Phase 5.2 규범 적용 예시] 클래스 레벨 {@code @SuperBuilder} 를 제거하고, 빌더는 정적 팩토리
 * {@link #create}에 {@code @Builder} 로 배치한다. 이렇게 하면 빌더 노출 표면이 '의미 있는 비즈니스
 * 필드'로 한정되어(id/감사 필드 제외 무분별한 초기화 차단) 헌법 제16조 규범을 만족하면서도, 기존
 * 호출부의 {@code FileDetail.builder()...build()} 사용성은 그대로 유지된다. 기본 생성자는 JPA 프록시
 * 보장을 위해 {@code protected} 로 제한한다.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_file_detail", uniqueConstraints = {
    @UniqueConstraint(name = "uk_tb_file_detail_sn", columnNames = {"ATCH_FILE_ID", "atch_file_seq"})
})
public class FileDetail extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "file_detail_id", updatable = false, nullable = false)
    private java.util.UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ATCH_FILE_ID", nullable = false)
    @Setter
    private FileMaster fileMaster;

        private Integer atchFileSeq;

    @Column(length = 1000)
    private String fileStrgPath; // 파일저장경로

    @Column(length = 100)
    private String strgFileNm; // 저장파일명

    @Column(length = 100)
    private String orgnlFileNm; // 원본파일명

    @Column(length = 20)
    private String fileEstn; // 확장자

    @Column
    private Long fileSz; // 파일크기

    @Column(length = 4000)
    private String fileCn; // 파일내용

    private FileDetail(FileMaster fileMaster, Integer atchFileSeq, String fileStrgPath, String strgFileNm,
            String orgnlFileNm, String fileEstn, Long fileSz, String fileCn) {
        this.fileMaster = fileMaster;
        this.atchFileSeq = atchFileSeq;
        this.fileStrgPath = fileStrgPath;
        this.strgFileNm = strgFileNm;
        this.orgnlFileNm = orgnlFileNm;
        this.fileEstn = fileEstn;
        this.fileSz = fileSz;
        this.fileCn = fileCn;
    }

    /**
     * 파일 상세 생성 정적 팩토리(빌더 진입점). 첨부 마스터·순번·저장 메타데이터를 명시적으로 받는다.
     * {@code @Builder} 를 이 메서드에 배치하므로 {@code FileDetail.builder()...build()} 는 그대로 동작한다.
     */
    @Builder
    public static FileDetail create(FileMaster fileMaster, Integer atchFileSeq, String fileStrgPath,
            String strgFileNm, String orgnlFileNm, String fileEstn, Long fileSz, String fileCn) {
        return new FileDetail(fileMaster, atchFileSeq, fileStrgPath, strgFileNm, orgnlFileNm, fileEstn, fileSz, fileCn);
    }
}
