package nuri.business.domain.cms;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Objects;

/**
 * 콘텐츠 페이지(ADR-0039). 페이지마다 초안 하나를 이 행에 두고, 게시본은 불변 리비전({@link CmsContentRevision})으로 쌓는다.
 *
 * <p>현재 게시본은 {@link #contsRvsnSn} 포인터 하나로 가리킨다 — 비어 있으면 미게시이거나 게시 중지다. 문서({@link #contsDocCn})는
 * 서버 검증기({@code CmsDocumentValidator})를 통과한 정규화 JSON 이며, 화면은 그것을 HTML 문자열 없이 그린다.
 */
@Entity
@Table(name = "tb_cms_conts", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tb_cms_conts_conts_path_nm", columnNames = "conts_path_nm")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CmsContent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long contsSn;

    /** /pages/ 뒤 주소. 게시 이력이 생기면 바꾸지 않는다(서비스가 판정). */
    @Column(length = 100, nullable = false)
    private String contsPathNm;

    /** 현재 초안의 제목. */
    @Column(length = 256, nullable = false)
    private String contsTtl;

    /** 현재 초안의 요약. */
    @Column(length = 4000)
    private String contsExpln;

    /** 현재 초안 문서(jsonb). H2 시험 구성에서는 json 형이 된다 — columnDefinition 을 두지 않는다. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private String contsDocCn;

    /** 현재 게시본. 비어 있으면 미게시 또는 게시 중지다. */
    private Long contsRvsnSn;

    /** Y 면 보관 — 게시 중이 아니어야 한다(DB CHECK). */
    @Column(length = 1, nullable = false)
    private String kpngYn;

    /** 낙관적 잠금(DEC-OPS-378). 게시·게시 중지도 이 값을 올리므로 열어 둔 편집기는 409 로 최신 상태를 다시 읽는다. */
    @Version
    private Integer version;

    public static CmsContent create(String contsPathNm, String contsTtl, String contsExpln, String contsDocCn) {
        CmsContent content = new CmsContent();
        content.contsPathNm = Objects.requireNonNull(contsPathNm);
        content.contsTtl = Objects.requireNonNull(contsTtl);
        content.contsExpln = contsExpln;
        content.contsDocCn = Objects.requireNonNull(contsDocCn);
        content.kpngYn = "N";
        return content;
    }

    public void updateDraft(String contsPathNm, String contsTtl, String contsExpln, String contsDocCn) {
        this.contsPathNm = Objects.requireNonNull(contsPathNm);
        this.contsTtl = Objects.requireNonNull(contsTtl);
        this.contsExpln = contsExpln;
        this.contsDocCn = Objects.requireNonNull(contsDocCn);
    }

    public void publish(Long contsRvsnSn) {
        this.contsRvsnSn = Objects.requireNonNull(contsRvsnSn);
    }

    public void unpublish() {
        this.contsRvsnSn = null;
    }

    public void archive() {
        this.kpngYn = "Y";
    }

    public void unarchive() {
        this.kpngYn = "N";
    }

    public boolean isPublished() {
        return contsRvsnSn != null;
    }

    public boolean isArchived() {
        return "Y".equals(kpngYn);
    }
}
