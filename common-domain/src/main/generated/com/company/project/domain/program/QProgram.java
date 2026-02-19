package com.company.project.domain.program;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QProgram is a Querydsl query type for Program
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProgram extends EntityPathBase<Program> {

    private static final long serialVersionUID = 131742435L;

    public static final QProgram program = new QProgram("program");

    public final StringPath progrmDc = createString("progrmDc");

    public final StringPath progrmFileNm = createString("progrmFileNm");

    public final StringPath progrmKoreanNm = createString("progrmKoreanNm");

    public final StringPath progrmStrePath = createString("progrmStrePath");

    public final StringPath url = createString("url");

    public QProgram(String variable) {
        super(Program.class, forVariable(variable));
    }

    public QProgram(Path<? extends Program> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProgram(PathMetadata metadata) {
        super(Program.class, metadata);
    }

}

