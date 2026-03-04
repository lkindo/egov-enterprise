package com.company.project.domain.board;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QBoardId is a Querydsl query type for BoardId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QBoardId extends BeanPath<BoardId> {

    private static final long serialVersionUID = -80762974L;

    public static final QBoardId boardId = new QBoardId("boardId");

    public final StringPath bbsId = createString("bbsId");

    public final NumberPath<Long> nttId = createNumber("nttId", Long.class);

    public QBoardId(String variable) {
        super(BoardId.class, forVariable(variable));
    }

    public QBoardId(Path<? extends BoardId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBoardId(PathMetadata metadata) {
        super(BoardId.class, metadata);
    }

}