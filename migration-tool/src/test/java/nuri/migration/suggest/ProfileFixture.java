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
        long values = text + number + temporal;
        CommentEvidence evidence = comment == null
                ? new CommentEvidence(null, false, null, "ABSENT")
                : new CommentEvidence(comment, false, null, "MATCH");
        return new ColumnProfile(name, 1, "VARCHAR", 12, 100L, null, true, values, 0, 0, text, number, temporal,
                0, 0, null, maxLength, 0, 0, frequencies.size(), false, patterns, ymd8Invalid, null, null, false,
                frequencies, rareRows, rareRows == 0 ? 0 : 1, omitted, evidence);
    }
}
