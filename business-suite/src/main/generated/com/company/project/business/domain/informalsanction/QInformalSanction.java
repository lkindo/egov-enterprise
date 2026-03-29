package com.company.project.business.domain.informalsanction;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QInformalSanction is a Querydsl query type for InformalSanction
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QInformalSanction extends EntityPathBase<InformalSanction> {

    private static final long serialVersionUID = 1515700383L;

    public static final QInformalSanction informalSanction = new QInformalSanction("informalSanction");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath applicantId = createString("applicantId");

    public final StringPath confmAt = createString("confmAt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath informalSanctionId = createString("informalSanctionId");

    public final StringPath jobSeCode = createString("jobSeCode");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath requestDe = createString("requestDe");

    public final StringPath returnResn = createString("returnResn");

    public final DateTimePath<java.time.LocalDateTime> sanctionDt = createDateTime("sanctionDt", java.time.LocalDateTime.class);

    public final StringPath sanctionerId = createString("sanctionerId");

    public QInformalSanction(String variable) {
        super(InformalSanction.class, forVariable(variable));
    }

    public QInformalSanction(Path<? extends InformalSanction> path) {
        super(path.getType(), path.getMetadata());
    }

    public QInformalSanction(PathMetadata metadata) {
        super(InformalSanction.class, metadata);
    }

}

