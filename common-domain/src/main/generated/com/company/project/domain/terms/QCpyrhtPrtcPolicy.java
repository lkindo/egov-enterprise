package com.company.project.domain.terms;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QCpyrhtPrtcPolicy is a Querydsl query type for CpyrhtPrtcPolicy
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCpyrhtPrtcPolicy extends EntityPathBase<CpyrhtPrtcPolicy> {

    private static final long serialVersionUID = 308551059L;

    public static final QCpyrhtPrtcPolicy cpyrhtPrtcPolicy = new QCpyrhtPrtcPolicy("cpyrhtPrtcPolicy");

    public final StringPath cpyrhtId = createString("cpyrhtId");

    public final StringPath cpyrhtPrtcPolicyCn = createString("cpyrhtPrtcPolicyCn");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public QCpyrhtPrtcPolicy(String variable) {
        super(CpyrhtPrtcPolicy.class, forVariable(variable));
    }

    public QCpyrhtPrtcPolicy(Path<? extends CpyrhtPrtcPolicy> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCpyrhtPrtcPolicy(PathMetadata metadata) {
        super(CpyrhtPrtcPolicy.class, metadata);
    }

}

