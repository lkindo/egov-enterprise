package nuri.business.domain.code;

import nuri.business.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("공통코드 다중 페이지 안정 정렬 계약")
class CommonCodePagingOrderContractTest extends PersistenceTestSupport {

    @Autowired
    private CommonCodeCategoryRepository categoryRepository;

    @Autowired
    private CommonCodeGroupRepository groupRepository;

    @Autowired
    private CommonCodeRepository codeRepository;

    private static final Path REPOSITORY_DIR =
            Path.of("src", "main", "java", "nuri", "business", "domain", "code");

    private record RepositoryOrder(String fileName, String orderClause) {
    }

    private static final List<RepositoryOrder> ORDERS = List.of(
            new RepositoryOrder(
                    "CommonCodeCategoryRepositoryImpl.java",
                    ".orderBy(commonCodeCategory.clsfCd.asc())"),
            new RepositoryOrder(
                    "CommonCodeGroupRepositoryImpl.java",
                    ".orderBy(commonCodeGroup.cdId.asc())"),
            new RepositoryOrder(
                    "CommonCodeRepositoryImpl.java",
                    ".orderBy(commonCode.cdId.asc(), commonCode.dtlCd.asc())"));

    private static boolean ordersBeforePaging(String source, String orderClause) {
        int orderIndex = source.indexOf(orderClause);
        int offsetIndex = source.indexOf(".offset(pageable.getOffset())");
        return orderIndex >= 0 && offsetIndex >= 0 && orderIndex < offsetIndex;
    }

    @Test
    @DisplayName("세 목록 쿼리는 PK 정렬 뒤 offset/limit을 적용한다")
    void ordersByPrimaryKeyBeforeOffset() throws IOException {
        for (RepositoryOrder contract : ORDERS) {
            String source = Files.readString(
                    REPOSITORY_DIR.resolve(contract.fileName()),
                    StandardCharsets.UTF_8);

            assertThat(ordersBeforePaging(source, contract.orderClause()))
                    .as("%s가 안정 정렬 없이 페이지를 자릅니다", contract.fileName())
                    .isTrue();
        }
    }

    @Test
    @DisplayName("부정 제어: offset만 있는 쿼리는 안정 정렬로 인정하지 않는다")
    void rejectsPagingWithoutOrder() {
        String unordered = "selectFrom(entity).offset(pageable.getOffset()).limit(100)";

        assertThat(ordersBeforePaging(unordered, ".orderBy(entity.id.asc())")).isFalse();
    }

    @Test
    @DisplayName("역순 저장해도 두 페이지를 합치면 PK 순서로 중복·누락 없이 이어진다")
    void pagesByPrimaryKeyWithoutDuplicatesOrGaps() {
        categoryRepository.saveAll(List.of(
                category("PGCAT_C"),
                category("PGCAT_A"),
                category("PGCAT_B"),
                category("PGROOT")));
        groupRepository.saveAll(List.of(
                group("PGGRP_C", "PGROOT"),
                group("PGGRP_A", "PGROOT"),
                group("PGGRP_B", "PGROOT"),
                group("PGCMP_B", "PGROOT"),
                group("PGCMP_A", "PGROOT")));
        codeRepository.saveAll(List.of(
                detail("PGCMP_B", "A"),
                detail("PGCMP_A", "B"),
                detail("PGCMP_A", "A")));
        codeRepository.flush();

        List<String> categories = List.of(0, 1).stream()
                .flatMap(page -> categoryRepository
                        .searchCommonCodeCategories("1", "PGCAT_", PageRequest.of(page, 2))
                        .stream())
                .map(CommonCodeCategory::getClsfCd)
                .toList();
        List<String> groups = List.of(0, 1).stream()
                .flatMap(page -> groupRepository
                        .searchCommonCodeGroups("1", "PGGRP_", PageRequest.of(page, 2))
                        .stream())
                .map(CommonCodeGroupProjection::getCdId)
                .toList();
        List<String> details = List.of(0, 1).stream()
                .flatMap(page -> codeRepository
                        .searchCommonCodeDetails("1", "PGCMP_", PageRequest.of(page, 2))
                        .stream())
                .map(detail -> detail.getCdId() + ":" + detail.getDtlCd())
                .toList();

        assertThat(categories).containsExactly("PGCAT_A", "PGCAT_B", "PGCAT_C");
        assertThat(groups).containsExactly("PGGRP_A", "PGGRP_B", "PGGRP_C");
        assertThat(details).containsExactly("PGCMP_A:A", "PGCMP_A:B", "PGCMP_B:A");
    }

    private static CommonCodeCategory category(String id) {
        return CommonCodeCategory.builder()
                .clsfCd(id)
                .clsfCdNm(id)
                .useYn("Y")
                .build();
    }

    private static CommonCodeGroup group(String id, String categoryId) {
        return CommonCodeGroup.builder()
                .cdId(id)
                .cdIdNm(id)
                .clsfCd(categoryId)
                .useYn("Y")
                .build();
    }

    private static CommonCode detail(String groupId, String detailId) {
        return CommonCode.builder()
                .cdId(groupId)
                .dtlCd(detailId)
                .dtlCdNm(detailId)
                .useYn("Y")
                .build();
    }
}
