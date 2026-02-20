package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QZipCode_ZipCodeId is a Querydsl query type for ZipCodeId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QZipCode_ZipCodeId extends BeanPath<ZipCode.ZipCodeId> {

    private static final long serialVersionUID = 1761473823L;

    public static final QZipCode_ZipCodeId zipCodeId = new QZipCode_ZipCodeId("zipCodeId");

    public final NumberPath<Long> sn = createNumber("sn", Long.class);

    public final StringPath zip = createString("zip");

    public QZipCode_ZipCodeId(String variable) {
        super(ZipCode.ZipCodeId.class, forVariable(variable));
    }

    public QZipCode_ZipCodeId(Path<? extends ZipCode.ZipCodeId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QZipCode_ZipCodeId(PathMetadata metadata) {
        super(ZipCode.ZipCodeId.class, metadata);
    }

}

