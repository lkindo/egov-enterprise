package com.company.project.domain.log;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static com.company.project.domain.log.QPrivacyLog.privacyLog;

@RequiredArgsConstructor
public class PrivacyLogRepositoryImpl implements PrivacyLogRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<PrivacyLog> searchPrivacyLogs(String searchWrd, String searchBgnDe, String searchEndDe,
                        Pageable pageable) {
                List<PrivacyLog> content = queryFactory
                                .selectFrom(privacyLog)
                                .where(
                                                inquiryInfoLike(searchWrd),
                                                inquiryDatetimeBetween(searchBgnDe, searchEndDe))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(privacyLog.inquiryDatetime.desc())
                                .fetch();

                long total = queryFactory
                                .select(privacyLog.count())
                                .from(privacyLog)
                                .where(
                                                inquiryInfoLike(searchWrd),
                                                inquiryDatetimeBetween(searchBgnDe, searchEndDe))
                                .fetchOne();

                return new PageImpl<>(content, pageable, total);
        }

        private BooleanExpression inquiryInfoLike(String searchWrd) {
                return StringUtils.hasText(searchWrd) ? privacyLog.inquiryInfo.contains(searchWrd) : null;
        }

        private BooleanExpression inquiryDatetimeBetween(String searchBgnDe, String searchEndDe) {
                if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
                        return null;
                }
                try {
                        LocalDateTime start = LocalDate.parse(searchBgnDe, DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                                        .atStartOfDay();
                        LocalDateTime end = LocalDate.parse(searchEndDe, DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                                        .atTime(LocalTime.MAX);
                        return privacyLog.inquiryDatetime.between(start, end);
                } catch (Exception e) {
                        return null;
                }
        }
}
