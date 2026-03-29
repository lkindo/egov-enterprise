package com.company.project.foundation.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QAdministCode is a Querydsl query type for AdministCode
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAdministCode extends EntityPathBase<AdministCode> {

    private static final long serialVersionUID = -1398793241L;

    public static final QAdministCode administCode = new QAdministCode("administCode");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath ablDe = createString("ablDe");

    public final StringPath administZoneCode = createString("administZoneCode");

    public final StringPath administZoneNm = createString("administZoneNm");

    public final StringPath administZoneSe = createString("administZoneSe");

    public final StringPath creatDe = createString("creatDe");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath upperAdministZoneCode = createString("upperAdministZoneCode");

    public final StringPath useAt = createString("useAt");

    public QAdministCode(String variable) {
        super(AdministCode.class, forVariable(variable));
    }

    public QAdministCode(Path<? extends AdministCode> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAdministCode(PathMetadata metadata) {
        super(AdministCode.class, metadata);
    }

}

