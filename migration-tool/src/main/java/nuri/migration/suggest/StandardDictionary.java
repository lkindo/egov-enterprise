package nuri.migration.suggest;

import java.util.List;
import java.util.Objects;

/**
 * 후보 생성이 쓰는 live 표준 사전(ADR-0029 결정 1 식별 단계). 대상 DB 의 {@code meta_standard_terms}·
 * {@code meta_standard_words}·{@code meta_standard_domains} 를 그대로 옮긴다. 동의어·허용값·폐기 여부는 V2_128 이
 * 더한 값이다.
 */
public record StandardDictionary(List<Term> terms, List<Word> words, List<Domain> domains) {

    public StandardDictionary {
        terms = List.copyOf(Objects.requireNonNull(terms, "terms"));
        words = List.copyOf(Objects.requireNonNull(words, "words"));
        domains = List.copyOf(Objects.requireNonNull(domains, "domains"));
    }

    /** 표준 용어. {@code synonyms} 는 공통표준의 쉼표 구분 원문을 나눈 목록이다. */
    public record Term(String name, String engAbbr, String domain, List<String> synonyms, String allowedValues,
                       boolean deprecated) {

        public Term {
            synonyms = synonyms == null ? List.of() : List.copyOf(synonyms);
        }
    }

    /** 표준 단어. {@code representative} 는 같은 영문약어의 대표 단어 여부다. */
    public record Word(String name, String engAbbr, boolean representative) {}

    /** 표준 도메인. */
    public record Domain(String group, String name, String dataType, Integer length) {}
}
