package com.company.project.domain.anniversary;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QAnniversary is a Querydsl query type for Anniversary
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAnniversary extends EntityPathBase<Anniversary> {

    private static final long serialVersionUID = 1050248955L;

    public static final QAnniversary anniversary = new QAnniversary("anniversary");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath annId = createString("annId");

    public final StringPath annvrsryBeginDe = createString("annvrsryBeginDe");

    public final StringPath annvrsryDe = createString("annvrsryDe");

    public final StringPath annvrsryNm = createString("annvrsryNm");

    public final StringPath annvrsrySe = createString("annvrsrySe");

    public final StringPath annvrsrySetup = createString("annvrsrySetup");

    public final StringPath cldrSe = createString("cldrSe");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath memo = createString("memo");

    public final StringPath reptitAt = createString("reptitAt");

    public final StringPath usid = createString("usid");

    public QAnniversary(String variable) {
        super(Anniversary.class, forVariable(variable));
    }

    public QAnniversary(Path<? extends Anniversary> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAnniversary(PathMetadata metadata) {
        super(Anniversary.class, metadata);
    }

}
