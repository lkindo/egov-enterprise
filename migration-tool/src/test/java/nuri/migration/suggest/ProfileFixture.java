package nuri.migration.suggest;

import nuri.migration.profile.SourceProfile.ColumnProfile;
import nuri.migration.profile.SourceProfile.CommentEvidence;
import nuri.migration.profile.SourceProfile.ValueFrequency;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 후보·적합성 시험이 쓰는 컬럼 프로파일. 필요한 집계만 정하고 나머지는 비운다. */
final class ProfileFixture {

    private final String name;
    private String comment;
    private long text;
    private long number;
    private long temporal;
    private Integer maxLength;
    private long ymd8Invalid;
    private long ymdhms14Invalid;
    private long blanks;
    private long lob;
    private long other;
    private String nativeType = "VARCHAR";
    private int jdbcType = 12;
    private Long declaredSize = 100L;
    private Integer declaredScale;
    private long rareRows;
    private String omitted;
    private final Map<String, Long> patterns = new HashMap<>();
    private final List<ValueFrequency> frequencies = new ArrayList<>();

    private ProfileFixture(String name) {
        this.name = name;
    }

    static ProfileFixture column(String name) {
        return new ProfileFixture(name);
    }

    ProfileFixture comment(String value) {
        comment = value;
        return this;
    }

    ProfileFixture text(long rows) {
        text = rows;
        return this;
    }

    ProfileFixture number(long rows) {
        number = rows;
        return this;
    }

    ProfileFixture temporal(long rows) {
        temporal = rows;
        return this;
    }

    ProfileFixture maxLength(int value) {
        maxLength = value;
        return this;
    }

    ProfileFixture pattern(String pattern, long rows) {
        patterns.put(pattern, rows);
        return this;
    }

    ProfileFixture invalidDates(long rows) {
        ymd8Invalid = rows;
        return this;
    }

    ProfileFixture invalidDateTimes(long rows) {
        ymdhms14Invalid = rows;
        return this;
    }

    ProfileFixture blanks(long rows) {
        blanks = rows;
        return this;
    }

    ProfileFixture lob(long rows) {
        lob = rows;
        return this;
    }

    ProfileFixture other(long rows) {
        other = rows;
        return this;
    }

    ProfileFixture declaredType(String type, int sqlType) {
        nativeType = type;
        jdbcType = sqlType;
        return this;
    }

    ProfileFixture declared(Long size, Integer scale) {
        declaredSize = size;
        declaredScale = scale;
        return this;
    }

    ProfileFixture value(String value, long rows) {
        frequencies.add(new ValueFrequency(value, rows));
        return this;
    }

    ProfileFixture rare(long rows) {
        rareRows = rows;
        return this;
    }

    ProfileFixture omitted(String reason) {
        omitted = reason;
        return this;
    }

    ColumnProfile build() {
        long values = text + number + temporal + blanks + lob + other;
        CommentEvidence evidence = comment == null
                ? new CommentEvidence(null, false, null, "ABSENT")
                : new CommentEvidence(comment, false, null, "MATCH");
        return new ColumnProfile(name, 1, nativeType, jdbcType, declaredSize, declaredScale, true, values, 0, blanks,
                text, number, temporal, lob, other, null, maxLength, 0, 0, frequencies.size(), false, patterns,
                ymd8Invalid, ymdhms14Invalid, null, null, false,
                frequencies, rareRows, rareRows == 0 ? 0 : 1, omitted, evidence);
    }
}
