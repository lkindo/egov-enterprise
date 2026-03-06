package com.company.project.domain.integration;

import java.util.List;

import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;

public class SystemConnectionRepositoryImpl extends QuerydslRepositorySupport
                implements SystemConnectionRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        public SystemConnectionRepositoryImpl(JPAQueryFactory queryFactory) {
                super(SystemConnection.class);
                this.queryFactory = queryFactory;
        }

        @Override
        public List<SystemConnectionStatsDto> findSystemConnectionStats(String searchKeyword) {
                QIntegrationInstitution provdInstt = new QIntegrationInstitution("provdInstt");
                QIntegrationInstitution requstInstt = new QIntegrationInstitution("requstInstt");

                return queryFactory
                                .select(Projections.constructor(SystemConnectionStatsDto.class,
                                                QSystemConnection.systemConnection.cntcId,
                                                QSystemConnection.systemConnection.cntcNm,
                                                QSystemConnection.systemConnection.cntcType,
                                                new CaseBuilder()
                                                                .when(QTransmitReceiveLog.transmitReceiveLog.transmitReceiveSeCode
                                                                                .in("S01",
                                                                                                "S04"))
                                                                .then(1L)
                                                                .otherwise(0L).sum().as("cntAll"),
                                                new CaseBuilder()
                                                                .when(QTransmitReceiveLog.transmitReceiveLog.transmitReceiveSeCode
                                                                                .in("S02",
                                                                                                "S05"))
                                                                .then(1L)
                                                                .otherwise(0L).sum().as("cntSuccess"),
                                                new CaseBuilder()
                                                                .when(QTransmitReceiveLog.transmitReceiveLog.transmitReceiveSeCode
                                                                                .in("S03",
                                                                                                "S06"))
                                                                .then(1L)
                                                                .otherwise(0L).sum().as("cntFail"),
                                                QSystemConnection.systemConnection.provdInsttId,
                                                QSystemConnection.systemConnection.provdSysId,
                                                QSystemConnection.systemConnection.provdSvcId,
                                                QSystemConnection.systemConnection.requstInsttId,
                                                QSystemConnection.systemConnection.requstSysId,
                                                provdInstt.insttNm,
                                                requstInstt.insttNm))
                                .from(QSystemConnection.systemConnection)
                                .leftJoin(QTransmitReceiveLog.transmitReceiveLog)
                                .on(QSystemConnection.systemConnection.cntcId
                                                .eq(QTransmitReceiveLog.transmitReceiveLog.cntcId))
                                .leftJoin(provdInstt)
                                .on(QSystemConnection.systemConnection.provdInsttId.eq(provdInstt.insttId))
                                .leftJoin(requstInstt)
                                .on(QSystemConnection.systemConnection.requstInsttId.eq(requstInstt.insttId))
                                .where(containsKeyword(searchKeyword))
                                .groupBy(
                                                QSystemConnection.systemConnection.cntcId,
                                                QSystemConnection.systemConnection.cntcNm,
                                                QSystemConnection.systemConnection.cntcType,
                                                QSystemConnection.systemConnection.provdInsttId,
                                                QSystemConnection.systemConnection.provdSysId,
                                                QSystemConnection.systemConnection.provdSvcId,
                                                QSystemConnection.systemConnection.requstInsttId,
                                                QSystemConnection.systemConnection.requstSysId,
                                                provdInstt.insttNm,
                                                requstInstt.insttNm)
                                .fetch();
        }

        @Override
        public List<SystemConnection> searchSystemConnections(String searchKeyword) {
                return queryFactory
                                .selectFrom(QSystemConnection.systemConnection)
                                .where(containsKeyword(searchKeyword))
                                .fetch();
        }

        @Override
        public long countSystemConnections(String searchKeyword) {
                return queryFactory
                                .select(QSystemConnection.systemConnection.count())
                                .from(QSystemConnection.systemConnection)
                                .where(containsKeyword(searchKeyword))
                                .fetchOne();
        }

        private BooleanExpression containsKeyword(String searchKeyword) {
                return (searchKeyword == null || searchKeyword.isEmpty()) ? null
                                : QSystemConnection.systemConnection.cntcNm.contains(searchKeyword);
        }
}
