package com.company.project.domain.board;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QBoard is a Querydsl query type for Board
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBoard extends EntityPathBase<Board> {

    private static final long serialVersionUID = -746451929L;

    public static final QBoard board = new QBoard("board");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath bbsId = createString("bbsId");

    public final StringPath blogId = createString("blogId");

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final NumberPath<Integer> inqireCo = createNumber("inqireCo", Integer.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> modifiedDate = createDateTime("modifiedDate", java.time.LocalDateTime.class);

    public final StringPath noticeAt = createString("noticeAt");

    public final StringPath ntceBgnde = createString("ntceBgnde");

    public final StringPath ntceEndde = createString("ntceEndde");

    public final StringPath ntcrId = createString("ntcrId");

    public final StringPath ntcrNm = createString("ntcrNm");

    public final StringPath nttCn = createString("nttCn");

    public final NumberPath<Long> nttId = createNumber("nttId", Long.class);

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
        super(Board.class, forVariable(variable));
    }

    public QBoard(Path<? extends Board> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBoard(PathMetadata metadata) {
        super(Board.class, metadata);
    }

}

