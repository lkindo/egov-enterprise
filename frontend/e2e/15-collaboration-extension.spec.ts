import { test } from './fixtures/base-test';
import { ScrapPage } from './pages/ScrapPage';

test.describe('Tier 15: Collaboration & Knowledge Extension', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let scrapPage: ScrapPage;

    test.beforeEach(async ({ page }) => {
        scrapPage = new ScrapPage(page);
    });

    // [2026-08-10 정정] 종전 본문은 `if (listItems.count() > 0) … else …` 로 **두 갈래 모두 통과**였다.
    //   스크랩은 BBS 글에서 파생되는데 이 테스트는 아무것도 만들지 않으므로, 목록이 비어 있는지
    //   차 있는지는 앞선 테스트들이 남긴 잔여 데이터에 달려 있었다 — 즉 무엇을 검증하는지가
    //   실행 순서에 따라 달라지는 단언이었다. 그 분기를 지우고, 이 테스트가 실제로 보장할 수 있는
    //   것(스크랩 관리 화면이 인증 상태로 정상 렌더된다)만 남긴다.
    //   ScrapPage.goto() 가 라우트 진입 + '스크랩 목록' 헤딩 가시성을 단언하므로 그것이 검증 본체다.
    //   ⚠ 스크랩 **생성→조회→삭제** 라운드트립은 여전히 어디에도 없다. 되살리려면 BBS 글을 시딩해
    //     스크랩을 만든 뒤 고유 제목으로 확인하는 형태여야 한다(24·25 방식).
    test('should render the scrap management hub for an authenticated admin', async () => {
        await scrapPage.goto();
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'should manage Knowledge (FAQ/Q&A)' — KnowledgePage.gotoFAQ/createFAQ로
    // 동일 board(BBSMSTR_AAAAAAAAAAAA)에 쓰는 FAQ 생성-검증 라운드트립을 05-public-experience가 소유(포털 노출까지 검증).
});
