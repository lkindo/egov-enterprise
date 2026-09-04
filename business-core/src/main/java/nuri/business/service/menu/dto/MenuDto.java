package nuri.business.service.menu.dto;

import jakarta.validation.constraints.*;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "메뉴 정보 DTO")
public class MenuDto {
    @Schema(description = "시스템 고유 ID", example = "1")
    private Long id;

    @Schema(description = "메뉴 번호", example = "1000000")
    private Long menuNo;

    @Schema(description = "메뉴 명칭", example = "시스템관리")
    @Size(max = 100)
    @NotBlank
    private String menuNm;

    @Schema(description = "프로그램 파일 명칭", example = "EgovMain")
    @Size(max = 100)
    private String prgrmFileNm;

    @Schema(description = "상위 메뉴 번호", example = "0")
    private Long upMenuSn;

    @Schema(description = "상위 메뉴 ID", example = "0")
    private Long upperMenuId;

    @Schema(description = "메뉴 순서", example = "1")
    @NotNull
    private Integer menuOrdr;

    @Schema(description = "URL 패턴", example = "/admin/**")
    private String chkURL;

    @Schema(description = "메뉴 설명", example = "시스템 전반을 관리하는 최상위 메뉴")
    @Size(max = 4000)
    private String menuExpln;

    @Schema(description = "관련 이미지 경로", example = "/images/menu/")
    @Size(max = 100)
    private String relImgPath;

    @Schema(description = "관련 이미지 명칭", example = "icon_system.png")
    @Size(max = 100)
    private String relImgNm;

    /**
     * 현대화 라우트. <b>DB 가 소유하는 URL 공간이므로 저장 시점에 형식을 제한한다.</b>
     *
     * <p>[2026-09-04 · PD-UX-002 Q3] 종전에는 {@code @Size(max = 500)} 뿐이었다. 그런데 이 값은
     * 프런트의 {@code normalizeInternalRoute} 를 지나 <b>그대로 URL 이 된다</b> — 그 함수는
     * origin·제어문자·경로 모호성만 보고 <b>쿼리는 의도적으로 보존</b>한다("Query strings and
     * fragments remain intact"). 즉 관리자가 메뉴 관리 화면('연결 라우트' 자유 입력칸)에
     * {@code /admin/x?q=홍길동} 을 타이핑하면 그것이 사용자 URL 이 됐다.
     * 방어선은 이 DTO 의 길이 제한 하나뿐이었고 DB 에도 형식 CHECK 제약이 없다(실측 확인).
     *
     * <p><b>왜 읽기 쪽이 아니라 저장 시점인가.</b> 정규화기에서 잘라내면 이미 저장된 값이 조용히
     * 달라져 관리자가 이유를 모른다. 저장에서 거부하면 <b>입력한 사람에게 즉시 사유를 말할 수 있다.</b>
     *
     * <p><b>허용 범위</b> — 경로는 절대경로(빈 세그먼트·역슬래시 금지) 또는 레거시 {@code .do},
     * 쿼리 키는 {@code tab}·{@code bbsId} 만, 프래그먼트 허용.
     * 이 둘이 실제로 쓰이는 전부다(2026-09-04 실측: 메뉴 90행 중 쿼리 보유 12행,
     * distinct 키는 {@code tab} 1종·값 12개 전부 열거형. {@code bbsId} 는 게시판 생성 마법사가
     * 런타임에 {@code modern_route} 에 써 넣는 형태다).
     *
     * <p><b>운영(OCI) 실측으로 배포 안전을 확인했다(2026-09-04, 읽기 전용).</b>
     * 메뉴 84행 · {@code modern_route} 보유 70 · 쿼리 보유 12행이고 distinct 키는 시드와 똑같이
     * {@code tab} <b>1종</b>(값 12개 동일)이다. 그 70행 전부를 이 패턴에 넣어 <b>불통과 0</b> 을 확인했다 —
     * 즉 이 제약으로 편집이 막히는 기존 메뉴는 없다.
     *
     * <p>⚠ 키를 늘리려면 이 패턴과 {@code MenuRouteQueryKeyTest} 를 함께 고쳐야 한다.
     * ⚠ 허용 밖 키를 단 메뉴가 나중에 생기면 그 메뉴의 <b>수정 저장이 막힌다</b>(조회·표시는 영향 없다).
     *   그때는 패턴을 넓히기 전에 그 키가 URL 에 실려도 되는 값인지부터 판정한다.
     */
    @Schema(description = "현대화된 라우트 경로 (Next.js). 쿼리 키는 tab·bbsId 만 허용한다.",
            example = "/admin/survey/hub?tab=manage")
    @Size(max = 500)
    // ⚠ 빈 문자열을 반드시 허용해야 한다. 라우트가 없는 폴더 메뉴가 실재하고(운영 실측 14행이
    //   modern_route NULL), 관리자 화면의 폼은 그 경우 null 이 아니라 ''를 보낸다.
    //   Bean Validation 의 @Pattern 은 null 만 건너뛰고 ''는 검사하므로, 빈 문자열을 별도 분기로
    //   열지 않으면 **폴더 메뉴 저장이 통째로 막힌다**(MenuAdminClient 계약 3건이 이를 잡았다).
    @Pattern(
            regexp = "^$|^(?:/(?:[^\\s?#/\\\\]+/?)*|(?:[A-Za-z0-9._~-]+/)*[A-Za-z0-9._~-]+\\.do)"
                    + "(?:\\?(?:tab|bbsId)=[^&#\\s]*(?:&(?:tab|bbsId)=[^&#\\s]*)*)?(?:#[^\\s]*)?$",
            message = "연결 라우트 형식이 올바르지 않습니다. 절대경로(/로 시작) 또는 레거시 .do 경로여야 하고, "
                    + "쿼리는 tab·bbsId 키만 쓸 수 있습니다.")
    private String modernRoute;

    @Schema(description = "생성자 ID", example = "admin")
    @Size(max = 20)
    private String crtrId;

    @Schema(description = "사용 여부", example = "Y")
    @Size(max = 1)
    private String useYn;

    @Builder.Default
    @Schema(description = "하위 메뉴 목록")
    private List<MenuDto> children = new ArrayList<>();

    public void addChild(MenuDto child) {
        this.children.add(child);
    }
}


