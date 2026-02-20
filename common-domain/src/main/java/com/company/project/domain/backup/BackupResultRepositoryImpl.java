package com.company.project.domain.backup;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

import static com.company.project.domain.backup.QBackupOpert.backupOpert;
import static com.company.project.domain.backup.QBackupResult.backupResult;

@RequiredArgsConstructor
public class BackupResultRepositoryImpl implements BackupResultRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<BackupResult> searchBackupResults(String sttus, String searchKeywordFrom, String searchKeywordTo,
            String searchCondition, String searchKeyword, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(sttus) && !"00".equals(sttus)) {
            builder.and(backupResult.sttus.eq(sttus));
        }

        if (StringUtils.hasText(searchKeywordFrom)) {
            builder.and(backupResult.executBeginTime.substring(0, 8).goe(searchKeywordFrom));
        }

        if (StringUtils.hasText(searchKeywordTo)) {
            builder.and(backupResult.executBeginTime.substring(0, 8).loe(searchKeywordTo));
        }

        if (StringUtils.hasText(searchKeyword)) {
            if ("0".equals(searchCondition)) { // 獄쏄퉮毓?臾믩씜筌?
                builder.and(backupOpert.backupOpertNm.contains(searchKeyword));
            } else if ("1".equals(searchCondition)) { // 獄쏄퉮毓?臾믩씜ID
                builder.and(backupResult.backupOpert.backupOpertId.contains(searchKeyword));
            }
        }

        List<BackupResult> content = queryFactory
                .selectFrom(backupResult)
                .leftJoin(backupResult.backupOpert, backupOpert).fetchJoin()
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(backupResult.backupResultId.desc())
                .fetch();

        long total = queryFactory
                .select(backupResult.count())
                .from(backupResult)
                .leftJoin(backupResult.backupOpert, backupOpert)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }
}
