package com.company.project.domain.zip;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QZip is a Querydsl query type for Zip
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QZip extends EntityPathBase<Zip> {

    private static final long serialVersionUID = -1378829923L;

    public static final QZip zip1 = new QZip("zip1");

    public final StringPath ctprvnNm = createString("ctprvnNm");

    public final StringPath emdNm = createString("emdNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath liBuldNm = createString("liBuldNm");

    public final StringPath lnbrDongHo = createString("lnbrDongHo");

    public final StringPath signguNm = createString("signguNm");

    public final NumberPath<Integer> sn = createNumber("sn", Integer.class);

    public final StringPath zip = createString("zip");

    public QZip(String variable) {
        super(Zip.class, forVariable(variable));
    }

    public QZip(Path<? extends Zip> path) {
        super(path.getType(), path.getMetadata());
    }

    public QZip(PathMetadata metadata) {
        super(Zip.class, metadata);
    }

}

