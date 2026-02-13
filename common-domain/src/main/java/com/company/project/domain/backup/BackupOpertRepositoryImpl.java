package com.company.project.domain.backup;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;

import static com.company.project.domain.backup.QBackupOpert.backupOpert;
import static com.company.project.domain.backup.QBackupSchdulDfk.backupSchdulDfk;

@RequiredArgsConstructor
public class BackupOpertRepositoryImpl implements BackupOpertRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<BackupOpert> searchBackupOperts(String searchCondition, String searchKeyword, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();
        builder.and(backupOpert.useAt.eq("Y"));

        if (StringUtils.hasText(searchKeyword)) {
            if ("0".equals(searchCondition)) { // 백업작업명
                builder.and(backupOpert.backupOpertNm.contains(searchKeyword));
            } else if ("1".equals(searchCondition)) { // 백업원본디렉토리
                builder.and(backupOpert.backupOrginlDrctry.contains(searchKeyword));
            }
        }

        List<BackupOpert> content = queryFactory
                .selectFrom(backupOpert)
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(backupOpert.backupOpertId.asc())
                .fetch();

        long total = queryFactory
                .select(backupOpert.count())
                .from(backupOpert)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    @Override
    public Optional<BackupOpert> findByIdWithDfk(String backupOpertId) {
        return Optional.ofNullable(queryFactory
                .selectFrom(backupOpert)
                .leftJoin(backupOpert.executSchdulDfkSes, backupSchdulDfk).fetchJoin()
                .where(backupOpert.backupOpertId.eq(backupOpertId)
                        .and(backupOpert.useAt.eq("Y")))
                .fetchOne());
    }
}
