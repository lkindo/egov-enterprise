package com.company.project.domain.note;

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

    private static final long serialVersionUID = 1230448753L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QNoteRecptn noteRecptn = new QNoteRecptn("noteRecptn");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

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