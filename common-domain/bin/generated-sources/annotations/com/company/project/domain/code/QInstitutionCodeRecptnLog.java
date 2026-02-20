package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QInstitutionCodeRecptnLog is a Querydsl query type for InstitutionCodeRecptnLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QInstitutionCodeRecptnLog extends EntityPathBase<InstitutionCodeRecptnLog> {

    private static final long serialVersionUID = -457837201L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QInstitutionCodeRecptnLog institutionCodeRecptnLog = new QInstitutionCodeRecptnLog("institutionCodeRecptnLog");

    public final StringPath ablDe = createString("ablDe");

    public final StringPath ablEnnc = createString("ablEnnc");

    public final StringPath allInsttNm = createString("allInsttNm");

    public final StringPath bestInsttCode = createString("bestInsttCode");

    public final StringPath bsisDe = createString("bsisDe");

    public final StringPath changede = createString("changede");

    public final StringPath changeSeCode = createString("changeSeCode");

    public final StringPath changeTime = createString("changeTime");

    public final StringPath creatDe = createString("creatDe");

    public final StringPath etcCode = createString("etcCode");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final StringPath fxnum = createString("fxnum");

    public final QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId id;

    public final StringPath insttAbrvNm = createString("insttAbrvNm");

    public final StringPath insttOdr = createString("insttOdr");

    public final StringPath insttTyLclas = createString("insttTyLclas");

    public final StringPath insttTyMclas = createString("insttTyMclas");

    public final StringPath insttTySclas = createString("insttTySclas");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath lowestInsttNm = createString("lowestInsttNm");

    public final StringPath odr = createString("odr");

    public final StringPath ord = createString("ord");

    public final StringPath processSe = createString("processSe");

    public final StringPath reprsntInsttCode = createString("reprsntInsttCode");

    public final NumberPath<Integer> sortOrdr = createNumber("sortOrdr", Integer.class);

    public final StringPath telno = createString("telno");

    public final StringPath upperInsttCode = createString("upperInsttCode");

    public QInstitutionCodeRecptnLog(String variable) {
        this(InstitutionCodeRecptnLog.class, forVariable(variable), INITS);
    }

    public QInstitutionCodeRecptnLog(Path<? extends InstitutionCodeRecptnLog> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QInstitutionCodeRecptnLog(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QInstitutionCodeRecptnLog(PathMetadata metadata, PathInits inits) {
        this(InstitutionCodeRecptnLog.class, metadata, inits);
    }

    public QInstitutionCodeRecptnLog(Class<? extends InstitutionCodeRecptnLog> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId(forProperty("id")) : null;
    }

}

