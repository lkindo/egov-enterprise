package nuri.business.service.user;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.user.repository.UserRepository;
import nuri.foundation.core.user.UserDisplayNameLookup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserDisplayNameLookupService implements UserDisplayNameLookup {

    private final UserRepository userRepository;

    @Override
    public Map<String, String> findDisplayNames(Collection<String> esntlIds) {
        if (esntlIds == null || esntlIds.isEmpty()) {
            return Map.of();
        }
        var ids = new LinkedHashSet<String>();
        esntlIds.stream().filter(StringUtils::hasText).forEach(ids::add);
        if (ids.isEmpty()) {
            return Map.of();
        }
        var names = new LinkedHashMap<String, String>();
        for (var user : userRepository.findByEsntlIdIn(ids)) {
            if (ids.contains(user.getEsntlId()) && StringUtils.hasText(user.getUserNm())) {
                names.put(user.getEsntlId(), user.getUserNm());
            }
        }
        return Map.copyOf(names);
    }
}
