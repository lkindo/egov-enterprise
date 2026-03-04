package com.company.project.domain.file;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QFileMaster is a Querydsl query type for FileMaster
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileMaster extends EntityPathBase<FileMaster> {

    private static final long serialVersionUID = 1468537017L;

    public static final QFileMaster fileMaster = new QFileMaster("fileMaster");

    public final StringPath atchFileId = createString("atchFileId");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final ListPath<FileDetail, QFileDetail> fileDetails = this.<FileDetail, QFileDetail>createList("fileDetails", FileDetail.class, QFileDetail.class, PathInits.DIRECT2);

    public final StringPath useAt = createString("useAt");

    public QFileMaster(String variable) {
        super(FileMaster.class, forVariable(variable));
    }

    public QFileMaster(Path<? extends FileMaster> path) {
        super(path.getType(), path.getMetadata());
    }

    public QFileMaster(PathMetadata metadata) {
        super(FileMaster.class, metadata);
    }

}
