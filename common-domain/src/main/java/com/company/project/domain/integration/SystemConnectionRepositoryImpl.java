package com.company.project.domain.integration;

import static com.company.project.domain.integration.QIntegrationInstitution.integrationInstitution;
import static com.company.project.domain.integration.QSystemConnection.systemConnection;
import static com.company.project.domain.integration.QTransmitReceiveLog.transmitReceiveLog;

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
                                                systemConnection.cntcId,
                                                systemConnection.cntcNm,
                                                systemConnection.cntcType,
                                                new CaseBuilder()
                                                                .when(transmitReceiveLog.transmitReceiveSeCode.in("S01",
                                                                                "S04"))
                                                                .then(1L)
                                                                .otherwise(0L).sum().as("cntAll"),
                                                new CaseBuilder()
                                                                .when(transmitReceiveLog.transmitReceiveSeCode.in("S02",
                                                                                "S05"))
                                                                .then(1L)
                                                                .otherwise(0L).sum().as("cntSuccess"),
                                                new CaseBuilder()
                                                                .when(transmitReceiveLog.transmitReceiveSeCode.in("S03",
                                                                                "S06"))
                                                                .then(1L)
                                                                .otherwise(0L).sum().as("cntFail"),
                                                systemConnection.provdInsttId,
                                                systemConnection.provdSysId,
                                                systemConnection.provdSvcId,
                                                systemConnection.requstInsttId,
                                                systemConnection.requstSysId,
                                                provdInstt.insttNm,
                                                requstInstt.insttNm))
                                .from(systemConnection)
                                .leftJoin(transmitReceiveLog).on(systemConnection.cntcId.eq(transmitReceiveLog.cntcId))
                                .leftJoin(provdInstt).on(systemConnection.provdInsttId.eq(provdInstt.insttId))
                                .leftJoin(requstInstt).on(systemConnection.requstInsttId.eq(requstInstt.insttId))
                                .where(containsKeyword(searchKeyword))
                                .groupBy(
                                                systemConnection.cntcId,
                                                systemConnection.cntcNm,
                                                systemConnection.cntcType,
                                                systemConnection.provdInsttId,
                                                systemConnection.provdSysId,
                                                systemConnection.provdSvcId,
                                                systemConnection.requstInsttId,
                                                systemConnection.requstSysId,
                                                provdInstt.insttNm,
                                                requstInstt.insttNm)
                                .fetch();
        }

        @Override
        public List<SystemConnection> searchSystemConnections(String searchKeyword) {
                return queryFactory
                                .selectFrom(systemConnection)
                                .where(containsKeyword(searchKeyword))
                                .fetch();
        }

        @Override
        public long countSystemConnections(String searchKeyword) {
                return queryFactory
                                .select(systemConnection.count())
                                .from(systemConnection)
                                .where(containsKeyword(searchKeyword))
                                .fetchOne();
        }

        private BooleanExpression containsKeyword(String searchKeyword) {
                return (searchKeyword == null || searchKeyword.isEmpty()) ? null
                                : systemConnection.cntcNm.contains(searchKeyword);
        }
}
