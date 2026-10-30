package nuri.business.domain.menu;

import jakarta.persistence.EntityManager;
import java.util.List;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.persistence.VendorSqlDialect;
import nuri.foundation.core.persistence.VendorSqlDialect.RowLock;

@RequiredArgsConstructor
public class MenuRowLockRepositoryImpl implements MenuRowLockRepository {

    private record ParentLinkRow(Long menuSn, Long upMenuSn) implements ParentLink {
        @Override public Long getMenuSn() { return menuSn; }
        @Override public Long getUpMenuSn() { return upMenuSn; }
    }

    private record StructureRowValue(Long menuSn, Long upMenuSn, Integer menuOrdr, String menuNm, String useYn,
            String modernRoute, String menuExpln) implements StructureRow {
        @Override public Long getMenuSn() { return menuSn; }
        @Override public Long getUpMenuSn() { return upMenuSn; }
        @Override public Integer getMenuOrdr() { return menuOrdr; }
        @Override public String getMenuNm() { return menuNm; }
        @Override public String getUseYn() { return useYn; }
        @Override public String getModernRoute() { return modernRoute; }
        @Override public String getMenuExpln() { return menuExpln; }
    }

    private final EntityManager entityManager;
    private final VendorSqlDialect vendorSql;

    @Override
    public List<ParentLink> findParentLinksForUpdate() {
        return lockedRows("menu_sn, up_menu_sn").stream()
                .<ParentLink>map(row -> new ParentLinkRow(toLong(row[0]), toLong(row[1])))
                .toList();
    }

    @Override
    public List<StructureRow> findStructureRowsForUpdate() {
        return lockedRows("menu_sn, up_menu_sn, menu_ordr, menu_nm, use_yn, modern_route, menu_expln").stream()
                .<StructureRow>map(row -> new StructureRowValue(toLong(row[0]), toLong(row[1]),
                        row[2] == null ? null : ((Number) row[2]).intValue(), text(row[3]), text(row[4]),
                        text(row[5]), text(row[6])))
                .toList();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lockedRows(String columns) {
        return entityManager.createNativeQuery(vendorSql.selectForLock(columns, "tb_menu_info", "ORDER BY menu_sn",
                RowLock.FOR_NO_KEY_UPDATE)).getResultList();
    }

    /** 네이티브 조회는 길이 1 인 varchar 를 Character 로 돌려준다({@code use_yn}). */
    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    private static Long toLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }
}
