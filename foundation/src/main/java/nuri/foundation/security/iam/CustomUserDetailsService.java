package nuri.foundation.security.iam;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomUserDetailsService implements UserDetailsService {

        private final UserAuthPort userAuthPort;

        @Override
        @Transactional(readOnly = true)
        public UserDetails loadUserByUsername(String username)
                        throws UsernameNotFoundException {
                UserDetails userDetails = userAuthPort.loadUserByUsername(username);
                if (userDetails == null) {
                        throw new UsernameNotFoundException("User not found: " + username);
                }
                return userDetails;
        }
}
