package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QAdministCode is a Querydsl query type for AdministCode
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAdministCode extends EntityPathBase<AdministCode> {

    private static final long serialVersionUID = 1611381138L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QAdministCode administCode = new QAdministCode("administCode");

    public final StringPath ablDe = createString("ablDe");

    public final StringPath administZoneNm = createString("administZoneNm");

    public final StringPath creatDe = createString("creatDe");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final QAdministCode_AdministCodeId id;

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath upperAdministZoneCode = createString("upperAdministZoneCode");

    public final StringPath useAt = createString("useAt");

    public QAdministCode(String variable) {
        this(AdministCode.class, forVariable(variable), INITS);
    }

    public QAdministCode(Path<? extends AdministCode> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QAdministCode(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QAdministCode(PathMetadata metadata, PathInits inits) {
        this(AdministCode.class, metadata, inits);
    }

    public QAdministCode(Class<? extends AdministCode> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QAdministCode_AdministCodeId(forProperty("id")) : null;
    }

}

