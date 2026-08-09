package nuri.business.domain.code;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공통분류코드 엔티티 (CCMMNCLCODE 테이블 매핑)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_com_clsf_cd")
public class CommonCodeCategory extends BaseEntity {

    @Id
    @Column(length = 12)
    private String clsfCd;

    @Column(length = 100)
    private String clsfCdNm;

    @Column(length = 4000)
    private String clsfCdExpln;

    @Column(length = 1)
    private String useYn;

    // 정적 팩토리 create() 위임용 private 생성자. 감사 필드는 JPA Auditing 이 채운다.
    //
    // [2026-08-09] 종전에는 생성자가 둘이었고 기본값 처리가 서로 엇갈렸다.
    //   · 5-인자 생성자 — useYn 기본값 "Y" 를 적용했으나, 주석이 스스로 밝히듯
    //     "new 사용처 없음" 인 죽은 코드였다(@SuppressWarnings("unused") 까지 달려 있었다).
    //   · 4-인자 생성자 — 실제 create() 팩토리가 쓰는 경로인데 기본값을 적용하지 않았다.
    //   그래서 "기본값이 있다" 는 착시만 남고 실제로는 적용되지 않았다. 죽은 쪽을 지우고
    //   살아 있는 쪽에 기본값을 옮겨, 형제 엔티티(CommonCode·CommonCodeGroup)와 거동을 맞춘다.
    private CommonCodeCategory(String clsfCd, String clsfCdNm, String clsfCdExpln, String useYn) {
        this.clsfCd = clsfCd;
        this.clsfCdNm = clsfCdNm;
        this.clsfCdExpln = clsfCdExpln;
        // useYn 미지정은 "사용중"이다. null 로 두면 tb_com_clsf_cd.use_yn 이 NULL 이 되고
        //   (물리 컬럼은 nullable·DEFAULT 없음 — 2026-08-09 information_schema 실측),
        //   코드그룹 검색의 `commonCodeCategory.useYn.eq("Y")` 필터에서 **조용히 사라진다.**
        //   NULL 이 바람직한 경우가 없으므로 형제 엔티티와 같이 "Y" 로 채운다.
        this.useYn = useYn == null ? "Y" : useYn;
    }

    @Builder
    public static CommonCodeCategory create(String clsfCd, String clsfCdNm, String clsfCdExpln, String useYn) {
        return new CommonCodeCategory(clsfCd, clsfCdNm, clsfCdExpln, useYn);
    }

    public void update(String clsfCdNm, String clsfCdExpln, String useYn, String lastUpdusrId) {
        this.clsfCdNm = clsfCdNm;
        this.clsfCdExpln = clsfCdExpln;
        this.useYn = useYn;
        this.lastMdfrId = lastUpdusrId;
    }

    public void delete() {
        this.useYn = "N";
    }
}
