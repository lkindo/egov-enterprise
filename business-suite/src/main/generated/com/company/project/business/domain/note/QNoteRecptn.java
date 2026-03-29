package com.company.project.business.domain.note;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QNoteRecptn is a Querydsl query type for NoteRecptn
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNoteRecptn extends EntityPathBase<NoteRecptn> {

    private static final long serialVersionUID = -851730023L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QNoteRecptn noteRecptn = new QNoteRecptn("noteRecptn");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final QNote note;

    public final StringPath noteRecptnId = createString("noteRecptnId");

    public final QNoteTrnsmit noteTrnsmit;

    public final StringPath openYn = createString("openYn");

    public final StringPath rcverId = createString("rcverId");

    public final StringPath recptnSe = createString("recptnSe");

    public QNoteRecptn(String variable) {
        this(NoteRecptn.class, forVariable(variable), INITS);
    }

    public QNoteRecptn(Path<? extends NoteRecptn> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QNoteRecptn(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QNoteRecptn(PathMetadata metadata, PathInits inits) {
        this(NoteRecptn.class, metadata, inits);
    }

    public QNoteRecptn(Class<? extends NoteRecptn> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.note = inits.isInitialized("note") ? new QNote(forProperty("note")) : null;
        this.noteTrnsmit = inits.isInitialized("noteTrnsmit") ? new QNoteTrnsmit(forProperty("noteTrnsmit"), inits.get("noteTrnsmit")) : null;
    }

}

