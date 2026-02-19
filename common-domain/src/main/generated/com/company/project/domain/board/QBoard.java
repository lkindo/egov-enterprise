package com.company.project.domain.board;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBoard is a Querydsl query type for Board
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBoard extends EntityPathBase<Board> {

    private static final long serialVersionUID = -746451929L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBoard board = new QBoard("board");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath blogId = createString("blogId");

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final QBoardId id;

    public final NumberPath<Integer> inqireCo = createNumber("inqireCo", Integer.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> modifiedDate = createDateTime("modifiedDate", java.time.LocalDateTime.class);

    public final StringPath noticeAt = createString("noticeAt");

    public final StringPath ntceBgnde = createString("ntceBgnde");

    public final StringPath ntceEndde = createString("ntceEndde");

    public final StringPath ntcrId = createString("ntcrId");

    public final StringPath ntcrNm = createString("ntcrNm");

    public final StringPath nttCn = createString("nttCn");

    public final NumberPath<Long> nttNo = createNumber("nttNo", Long.class);

    public final StringPath nttSj = createString("nttSj");

    public final NumberPath<Long> parnts = createNumber("parnts", Long.class);

    public final StringPath password = createString("password");

    public final StringPath replyAt = createString("replyAt");

    public final NumberPath<Integer> replyLc = createNumber("replyLc", Integer.class);

    public final StringPath secretAt = createString("secretAt");

    public final StringPath sjBoldAt = createString("sjBoldAt");

    public final NumberPath<Long> sortOrdr = createNumber("sortOrdr", Long.class);

    public final StringPath useAt = createString("useAt");

    public QBoard(String variable) {
        this(Board.class, forVariable(variable), INITS);
    }

    public QBoard(Path<? extends Board> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBoard(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBoard(PathMetadata metadata, PathInits inits) {
        this(Board.class, metadata, inits);
    }

    public QBoard(Class<? extends Board> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QBoardId(forProperty("id")) : null;
    }

}

