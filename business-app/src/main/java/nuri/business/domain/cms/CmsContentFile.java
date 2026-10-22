package nuri.business.domain.cms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 콘텐츠 페이지에 귀속된 첨부 하나(ADR-0039 결정 8). 한 첨부는 한 페이지에만 속하고({@code atch_file_sn} 유니크), 파일 상세의
 * (마스터, 순서) 유니크를 가리키는 FK 가 일반 파일 API 의 삭제를 막는다. 귀속은 추가만 한다.
 */
@Entity
@Immutable
@Table(name = "tb_cms_conts_file", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tb_cms_conts_file_atch_file_sn", columnNames = "atch_file_sn"),
        @UniqueConstraint(name = "uk_tb_cms_conts_file_conts_sn_conts_file_sn", columnNames = {"conts_sn", "conts_file_sn"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CmsContentFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "conts_file_sn", nullable = false, updatable = false)
    private Long contsFileSn;

    @Column(name = "conts_sn", nullable = false, updatable = false)
    private Long contsSn;

    @Column(name = "atch_file_sn", nullable = false, updatable = false)
    private Long atchFileSn;

    @Column(name = "atch_file_seq", nullable = false, updatable = false)
    private Integer atchFileSeq;

    @Column(name = "frst_rgtr_id", length = 20, updatable = false)
    private String frstRgtrId;

    @Column(name = "crt_dt", nullable = false, updatable = false)
    private LocalDateTime crtDt;

    public static CmsContentFile create(Long contsSn, Long atchFileSn, Integer atchFileSeq,
            String frstRgtrId, LocalDateTime crtDt) {
        CmsContentFile file = new CmsContentFile();
        file.contsSn = Objects.requireNonNull(contsSn);
        file.atchFileSn = Objects.requireNonNull(atchFileSn);
        file.atchFileSeq = Objects.requireNonNull(atchFileSeq);
        file.frstRgtrId = frstRgtrId;
        file.crtDt = Objects.requireNonNull(crtDt);
        return file;
    }
}
