package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QIntegrationInstitution is a Querydsl query type for IntegrationInstitution
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIntegrationInstitution extends EntityPathBase<IntegrationInstitution> {

    private static final long serialVersionUID = 74350645L;

    public static final QIntegrationInstitution integrationInstitution = new QIntegrationInstitution("integrationInstitution");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final StringPath insttId = createString("insttId");

    public final StringPath insttNm = createString("insttNm");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath useAt = createString("useAt");

    public QIntegrationInstitution(String variable) {
        super(IntegrationInstitution.class, forVariable(variable));
    }

    public QIntegrationInstitution(Path<? extends IntegrationInstitution> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIntegrationInstitution(PathMetadata metadata) {
        super(IntegrationInstitution.class, metadata);
    }

}
