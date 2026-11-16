package nuri.business.domain.scrap;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScrapRepository extends JpaRepository<Scrap, Long> {
    /**
     * 한 사용자의 보관함 목록 — 최근 스크랩이 먼저다(2026-11-16). 종전에는 정렬 없이 쪽을 나눠(컨트롤러는 요청 정렬을 받지 않는다)
     * DB 가 돌려주는 순서가 쪽마다 달라질 수 있었고, 쪽을 넘기면 같은 항목이 다시 나오거나 빠졌다. 일련번호는 유일해 순서가 하나로
     * 정해진다.
     */
    Page<Scrap> findByFrstRgtrIdAndUseYnOrderByScrapSnDesc(String frstRgtrId, String useYn, Pageable pageable);

    /**
     * 한 사용자가 같은 주소로 남긴 스크랩 — 사용 여부와 무관하다. DB 유일 제약
     * ({@code uk_tb_bbs_scrap_frst_rgtr_id_scrap_url})과 같은 범위라 보통 0~1건이지만, 제약을 적용하기 전의 DB 에
     * 중복이 남아 있어도 단건 조회 예외(500)로 죽지 않도록 목록으로 받는다.
     */
    List<Scrap> findByFrstRgtrIdAndScrapUrlOrderByScrapSnAsc(String frstRgtrId, String scrapUrl);
}
