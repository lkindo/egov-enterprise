package nuri.business.domain.menu;

import java.util.List;

/** 메뉴 행을 잠그며 읽는 경로. 잠금 절이 벤더마다 달라 네이티브 문장을 포트에서 받는다(ADR-0047). */
public interface MenuRowLockRepository {

    interface ParentLink {
        Long getMenuSn();
        Long getUpMenuSn();
    }

    /**
     * [2026-10-02] 메뉴 구조 편집기가 읽는 한 행. 구조 버전은 이 일곱 칸의 요약값이다.
     * [2026-10-05] 레거시 연결 프로그램(prgrm_file_nm)은 앱이 읽지 않으므로 뺐다(DEC-OPS-231).
     */
    interface StructureRow {
        Long getMenuSn();
        Long getUpMenuSn();
        Integer getMenuOrdr();
        String getMenuNm();
        String getUseYn();
        String getModernRoute();
        String getMenuExpln();
    }

    /** 권한 관리와 같은 메뉴 번호 순서로 잠근다. 자기 FK의 KEY SHARE와는 충돌하지 않는다. */
    List<ParentLink> findParentLinksForUpdate();

    /** 구조 저장이 잠그고 읽는다. 잠금 순서·방식은 {@link #findParentLinksForUpdate()} 와 같다(메뉴 → ADMIN). */
    List<StructureRow> findStructureRowsForUpdate();
}
