package nuri.business.core.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 데모 게시판 인스턴스 ID 설정({@code nuri.boards.*}) 바인딩.
 *
 * <p>종전에는 {@code business-core}의 {@code MenuIntegrationService}(2026-10-04 퇴역)가 데모 시드
 * ({@code R__seed_demo.sql})의 {@code BBSMSTR_*} 인스턴스 ID를 직접 하드코딩해, 재사용 코어가
 * 특정 제품의 시드 데이터에 결합돼 있었다. 이 클래스는 그 결합을 설정으로 역전한다.
 *
 * <p>기본값은 종전 하드코딩 리터럴과 동일하므로 설정이 없어도 거동이 완전히 같고,
 * 다른 제품은 {@code api-server}의 {@code application.yml}({@code nuri.boards.*})만 바꿔
 * 코어 수정 없이 자기 게시판 ID를 연결한다.
 *
 * <p>주의(H3/H4): 같은 인스턴스 ID라도 사용처 의미가 다르다 — {@code BBSMSTR_AAAAAAAAAAAA}는
 * 공지 게시판이면서 FAQ 통합 게시판이기도 하다. 값 변경 시 의미 축별로 따로 판정할 것.
 *
 * <p>[2026-10-26 ADR-0043 결정 4] 지정 용도는 다섯이다(공지·FAQ·업무·Q&A·위키). 지정 게시판은 영구 삭제를 거부한다. 화면도 같은
 * 대응을 상수({@code frontend/src/config/board-ids.ts})로 들고 있어, 지정을 바꾸려면 이 설정과 화면 상수를 함께 바꾼다. 두 기본값이
 * 같은지는 {@code frontend/src/__tests__/cross-stack/designated-board-ids-contract.test.ts} 가 대조한다(과도기 가드 — 환경별로 바꾼 값은 이 설정이 정본이다).
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "nuri.boards")
public class BoardIdProperties {

    /** 공지사항 게시판 ID — 업무 홈 공지 카드와 공지 편집 권한(NOTICE_EDIT) 판별에 사용. */
    private String noticeId = "BBSMSTR_AAAAAAAAAAAA";

    /** 업무 게시판 ID — 업무 홈 업무 게시판 카드에 사용. */
    private String taskId = "BBSMSTR_CCCCCCCCCCCC";

    /** FAQ 통합 게시판 ID — 데모 시드에서는 공지 게시판과 같은 인스턴스로 통합돼 있다. */
    private String faqId = "BBSMSTR_AAAAAAAAAAAA";

    /** Q&A 게시판 ID — 도움말 센터 1:1 문의(비밀글)와 지식 허브 질의응답 탭이 쓴다(ADR-0043 결정 4). */
    private String qnaId = "BBSMSTR_DDDDDDDDDDDD";

    /** 위키 게시판 ID — 지식 허브 위키 탭이 쓴다. 데모 시드에서는 '일정 게시판' 인스턴스다(ADR-0043 결정 4). */
    private String wikiId = "BBSMSTR_EEEEEEEEEEEE";
}
