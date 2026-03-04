package com.company.project.domain.terms;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QIndvdlInfoPolicy is a Querydsl query type for IndvdlInfoPolicy
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIndvdlInfoPolicy extends EntityPathBase<IndvdlInfoPolicy> {

    private static final long serialVersionUID = -496148547L;

    public static final QIndvdlInfoPolicy indvdlInfoPolicy = new QIndvdlInfoPolicy("indvdlInfoPolicy");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath indvdlInfoPolicyAgreAt = createString("indvdlInfoPolicyAgreAt");

    public final StringPath indvdlInfoPolicyCn = createString("indvdlInfoPolicyCn");

    public final StringPath indvdlInfoPolicyId = createString("indvdlInfoPolicyId");

    public final StringPath indvdlInfoPolicyNm = createString("indvdlInfoPolicyNm");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public QIndvdlInfoPolicy(String variable) {
        super(IndvdlInfoPolicy.class, forVariable(variable));
    }

    public QIndvdlInfoPolicy(Path<? extends IndvdlInfoPolicy> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIndvdlInfoPolicy(PathMetadata metadata) {
        super(IndvdlInfoPolicy.class, metadata);
    }

}