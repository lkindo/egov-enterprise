package com.company.project.business.domain.note;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QNoteTrnsmit is a Querydsl query type for NoteTrnsmit
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNoteTrnsmit extends EntityPathBase<NoteTrnsmit> {

    private static final long serialVersionUID = 1523600726L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QNoteTrnsmit noteTrnsmit = new QNoteTrnsmit("noteTrnsmit");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath deleteAt = createString("deleteAt");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final QNote note;

    public final StringPath noteTrnsmitId = createString("noteTrnsmitId");

    public final StringPath trnsmiterId = createString("trnsmiterId");

    public QNoteTrnsmit(String variable) {
        this(NoteTrnsmit.class, forVariable(variable), INITS);
    }

    public QNoteTrnsmit(Path<? extends NoteTrnsmit> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QNoteTrnsmit(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QNoteTrnsmit(PathMetadata metadata, PathInits inits) {
        this(NoteTrnsmit.class, metadata, inits);
    }

    public QNoteTrnsmit(Class<? extends NoteTrnsmit> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.note = inits.isInitialized("note") ? new QNote(forProperty("note")) : null;
    }

}

