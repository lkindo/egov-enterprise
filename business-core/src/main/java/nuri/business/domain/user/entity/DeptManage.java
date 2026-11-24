package nuri.business.domain.user.entity;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 부서 정보 Entity
 * 매핑 테이블: NORGNZTINFO
 */
@Entity
@Table(name = "tb_ognz_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeptManage extends BaseEntity {

    @Id
    @Column(name = "ognz_id", length = 20)
    private String ognzId;

    @Column(length = 200, nullable = false)
    private String ognzNm;

    @Column(length = 4000)
    private String ognzExpln;

    /** 상위 조직 ID. NULL 이면 최상위(루트)다. FK 는 걸지 않고 순환/자기참조는 서비스에서 방어한다. [V2_26] */
    @Column(name = "up_ognz_id", length = 20)
    private String upOgnzId;

    /** 동일 상위 내 표시 순서. [V2_26] */
    @Column(name = "sort_ordr")
    private Integer sortOrdr;

    /**
     * 낙관적 잠금 버전(V2_155). 이름·설명 편집이 화면이 읽은 값과 대조한다(다르면 409). 조직도 일괄 편집(상위·순서)은 대조하지
     * 않지만 그 행의 버전은 올린다 — 수정자·수정 시각도 함께 바뀌기 때문이다. 그래서 다른 관리자가 끌어 옮긴 부서의 편집 창은
     * 저장할 때 409 를 받고 다시 불러온다.
     */
    @jakarta.persistence.Version
    private Integer version;

    private DeptManage(String ognzId, String ognzNm, String ognzExpln, String upOgnzId, Integer sortOrdr) {
        this.ognzId = ognzId;
        this.ognzNm = ognzNm;
        this.ognzExpln = ognzExpln;
        this.upOgnzId = upOgnzId;
        this.sortOrdr = sortOrdr;
    }

    @Builder
    public static DeptManage create(String ognzId, String ognzNm, String ognzExpln, String upOgnzId, Integer sortOrdr) {
        return new DeptManage(ognzId, ognzNm, ognzExpln, upOgnzId, sortOrdr);
    }

    public void update(String ognzNm, String ognzExpln) {
        this.ognzNm = ognzNm;
        this.ognzExpln = ognzExpln;
    }

    /** 조직도 편집(드래그앤드롭) 결과를 반영한다. 상위/순서만 바꾸며 명칭·설명은 건드리지 않는다. */
    public void updateHierarchy(String upOgnzId, Integer sortOrdr) {
        this.upOgnzId = upOgnzId;
        this.sortOrdr = sortOrdr;
    }

    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
