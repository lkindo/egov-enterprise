package nuri.business.domain.code;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 코드 계열 엔티티의 <b>기본값 분기</b> 테스트.
 *
 * <p>[2026-08-09 신설] PIT 이 이 엔티티들의 생성자에서 {@code negated conditional} 을 살려 보냈다.
 * 대상은 전부 같은 모양이다 — {@code this.useYn = useYn == null ? "Y" : useYn;}
 *
 * <p>이 조건을 뒤집으면 <b>정반대로 동작한다</b>: 값을 명시했는데 무시하고 "Y" 를 넣거나,
 * 값을 안 줬는데 {@code null} 을 그대로 넣는다. 전자는 <b>사용중지하려던 코드가 계속 살아 있고</b>,
 * 후자는 {@code useYn IS NULL} 이 되어 {@code useYn = 'Y'} 필터에서 조용히 사라진다.
 * 어느 쪽이든 예외 없이 데이터만 틀어지므로 발견이 늦다.
 *
 * <p>기본값은 사소해 보이지만 <b>이 값으로 조회 필터가 걸리는 컬럼</b>이라 사소하지 않다.
 */
@DisplayName("코드 엔티티 기본값 테스트")
class CodeEntityDefaultTest {

    @Test
    @DisplayName("상세코드: useYn 미지정은 'Y', 지정하면 지정값을 그대로 쓴다")
    void commonCodeUseYnDefault() {
        assertThat(CommonCode.builder()
                .cdId("G").dtlCd("D").dtlCdNm("N").build().getUseYn())
                .as("미지정이면 사용중(Y)").isEqualTo("Y");

        // 이쪽을 빠뜨리면 조건을 뒤집은 뮤턴트가 살아남는다 — 양방향을 함께 봐야 한다.
        assertThat(CommonCode.builder()
                .cdId("G").dtlCd("D").dtlCdNm("N").useYn("N").build().getUseYn())
                .as("지정값을 덮어쓰면 사용중지가 무시된다").isEqualTo("N");
    }

    @Test
    @DisplayName("코드그룹: useYn 기본값과 상세코드 컬렉션 기본값")
    void commonCodeGroupDefaults() {
        CommonCodeGroup defaults = CommonCodeGroup.builder().cdId("G").cdIdNm("이름").build();
        assertThat(defaults.getUseYn()).isEqualTo("Y");
        // commonCodes 를 null 로 두면 NPE 가 아니라 빈 컬렉션이어야 한다.
        assertThat(defaults.getCommonCodes()).isNotNull().isEmpty();

        CommonCodeGroup explicit = CommonCodeGroup.builder()
                .cdId("G").cdIdNm("이름").useYn("N")
                .commonCodes(new java.util.ArrayList<>(java.util.List.of(
                        CommonCode.builder().cdId("G").dtlCd("D").dtlCdNm("N").build())))
                .build();
        assertThat(explicit.getUseYn()).isEqualTo("N");
        assertThat(explicit.getCommonCodes()).hasSize(1);
    }

    @Test
    @DisplayName("코드분류: useYn 미지정은 'Y', 지정하면 지정값을 그대로 쓴다 (형제와 정렬)")
    void commonCodeCategoryUseYnDefault() {
        // [2026-08-09 거동 정렬] 종전 이 엔티티만 형제들과 달랐다.
        //   기본값 "Y" 를 넣는 생성자는 죽은 코드였고, 실제로 쓰이는 생성자는 null 을 그대로 뒀다.
        //   그 결과 useYn 없이 만든 분류는 use_yn IS NULL 이 되어
        //   코드그룹 검색의 `commonCodeCategory.useYn.eq("Y")` 필터에서 조용히 사라졌다.
        //   (물리 컬럼은 nullable·DEFAULT 없음 — DB 도 막아주지 않는다.)
        assertThat(CommonCodeCategory.builder()
                .clsfCd("C").clsfCdNm("이름").build().getUseYn())
                .as("미지정이면 사용중(Y) — CommonCode·CommonCodeGroup 과 동일").isEqualTo("Y");

        // 조건을 뒤집은 뮤턴트를 잡으려면 지정값 보존도 함께 봐야 한다.
        assertThat(CommonCodeCategory.builder()
                .clsfCd("C").clsfCdNm("이름").useYn("N").build().getUseYn()).isEqualTo("N");
        assertThat(CommonCodeCategory.builder()
                .clsfCd("C").clsfCdNm("이름").useYn("Y").build().getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("코드분류: update() 는 기본값을 넣지 않는다 — 세 엔티티가 동일하다")
    void commonCodeCategoryUpdateHasNoDefault() {
        // 생성자와 달리 update() 는 넘어온 값을 그대로 쓴다. 이건 세 엔티티가 이미 일관되며,
        //   "명시적으로 NULL 로 되돌리기" 를 막는 것은 별개 결정이라 현행을 그대로 고정한다.
        //   (API 경계에서는 CmmnClCodeDto.useYn 의 @NotBlank 가 NULL 을 막는다.)
        CommonCodeCategory c = CommonCodeCategory.builder().clsfCd("C").clsfCdNm("이름").build();
        c.update("바뀐이름", "설명", null, "tester");
        assertThat(c.getUseYn()).as("update 는 기본값을 적용하지 않는다").isNull();
    }

    @Test
    @DisplayName("기관코드 수신로그: procSe 미지정은 '0'(미처리), 지정하면 지정값을 그대로 쓴다")
    void institutionCodeRecptnLogProcSeDefault() {
        // 처리구분이 뒤집히면 **미처리 건이 처리됨으로 보이거나 그 반대**가 된다 —
        // 수신 로그의 처리 여부는 재처리 대상 판정 기준이라 조용히 틀리면 누락으로 이어진다.
        assertThat(logWithProcSe(null).getProcSe()).as("미지정은 미처리(0)").isEqualTo("0");
        assertThat(logWithProcSe("1").getProcSe()).as("지정값을 덮어쓰면 안 된다").isEqualTo("1");
    }

    private static InstitutionCodeRecptnLog logWithProcSe(String procSe) {
        return InstitutionCodeRecptnLog.builder()
                .chgSeCd("I")
                .procSe(procSe)
                .allInstNm("기관")
                .build();
    }
}
