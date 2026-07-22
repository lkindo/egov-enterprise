package nuri.business.domain.code;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;
import org.springframework.lang.NonNull;
import java.io.Serializable;
import java.util.Objects;

/**
 * 공통코드 엔티티 (CCMMNCODE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_com_cd")
public class CommonCodeGroup extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "cd_id", length = 20)
    @NonNull
    private String cdId;

    @OneToMany(mappedBy = "commonCodeGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<CommonCode> commonCodes = new java.util.ArrayList<>();

    @Column(length = 100)
    @NonNull
    private String cdIdNm;

    @Column(length = 4000)
    private String cdIdExpln;

    @Column(length = 12)
    private String clsfCd;

    @Column(length = 1)
    private String useYn;

    // 정적 팩토리에 빌더 배치 (Phase 5.2). 기존 CommonCodeGroup.builder()...build() 호출부 그대로 동작.
    // 감사 필드(frstRgtrId/lastMdfrId)는 auditing 이 채우므로 파라미터에서 제외.
    @Builder
    public static CommonCodeGroup create(@NonNull String cdId, java.util.List<CommonCode> commonCodes,
            @NonNull String cdIdNm, String cdIdExpln, String clsfCd, String useYn) {
        return new CommonCodeGroup(cdId, commonCodes, cdIdNm, cdIdExpln, clsfCd, useYn);
    }

    private CommonCodeGroup(@NonNull String cdId, java.util.List<CommonCode> commonCodes,
            @NonNull String cdIdNm, String cdIdExpln, String clsfCd, String useYn) {
        this.cdId = Objects.requireNonNull(cdId);
        // @Builder.Default 재현: null 이면 빈 컬렉션으로 병합
        this.commonCodes = commonCodes == null ? new java.util.ArrayList<>() : commonCodes;
        this.cdIdNm = Objects.requireNonNull(cdIdNm);
        this.cdIdExpln = cdIdExpln;
        this.clsfCd = clsfCd;
        this.useYn = useYn == null ? "Y" : useYn;
    }

    public void update(@NonNull String cdIdNm, String cdIdExpln, String useYn, String lastUpdusrId) {
        this.cdIdNm = Objects.requireNonNull(cdIdNm);
        this.cdIdExpln = cdIdExpln;
        this.useYn = useYn;
        this.lastMdfrId = lastUpdusrId;
    }

    /**
     * 코드 탐색기(드래그앤드롭)의 계층 재배치 결과를 반영한다.
     * update() 는 clsfCd 를 건드리지 않으므로 소속 분류 이동 전용 메서드를 둔다.
     * 정렬 순서는 tb_com_cd 에 물리 컬럼이 없어 반영 대상이 아니다.
     */
    public void updateClassification(@NonNull String clsfCd) {
        this.clsfCd = Objects.requireNonNull(clsfCd);
    }

    public void delete() {
        this.useYn = "N";
    }
}
