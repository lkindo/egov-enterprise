package nuri.business.domain.cms;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 게시본이 쓰는 첨부 집합(ADR-0039). 게시할 때 리비전과 같은 트랜잭션에서 더하고 고치거나 지우지 않는다(DB 트리거).
 * 첨부 열람 판정은 현재 게시 리비전의 이 집합으로 "공개된 첨부" 를 가린다.
 */
@Entity
@Immutable
@Table(name = "tb_cms_conts_rvsn_file")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CmsContentRevisionFile {

    @EmbeddedId
    private CmsContentRevisionFileId id;

    /** 리비전과 첨부가 같은 페이지임을 묶는 FK 의 짝이다. */
    @Column(name = "conts_sn", nullable = false, updatable = false)
    private Long contsSn;

    @Column(name = "frst_rgtr_id", length = 20, updatable = false)
    private String frstRgtrId;

    @Column(name = "crt_dt", nullable = false, updatable = false)
    private LocalDateTime crtDt;

    public static CmsContentRevisionFile create(Long contsRvsnSn, Long contsFileSn, Long contsSn,
            String frstRgtrId, LocalDateTime crtDt) {
        CmsContentRevisionFile file = new CmsContentRevisionFile();
        file.id = new CmsContentRevisionFileId(contsRvsnSn, contsFileSn);
        file.contsSn = Objects.requireNonNull(contsSn);
        file.frstRgtrId = frstRgtrId;
        file.crtDt = Objects.requireNonNull(crtDt);
        return file;
    }
}
