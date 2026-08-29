package com.dativa.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import com.dativa.security.JwtService;
import com.dativa.user.AppUser;
import com.dativa.user.Role;
import com.dativa.user.AppUserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StompAuthInterceptorTest {
    @Mock
    private JwtService jwtService;

    @Mock
    private AppUserRepository users;

    @Test
    void acceptsABearerTokenForAnActiveUser() {
        UUID userId = UUID.randomUUID();
        AppUser user = new AppUser();
        user.setId(userId);
        user.setEmail("analyst@dativa.app");
        user.setRole(Role.ANALYST);
        user.setActive(true);

        when(jwtService.readUserId("good.token")).thenReturn(userId);
        when(users.findById(userId)).thenReturn(Optional.of(user));

        StompAuthInterceptor interceptor = new StompAuthInterceptor(jwtService, users);

        assertThat(interceptor.authenticate("Bearer good.token")).isNotNull();
        assertThat(interceptor.authenticate("Bearer good.token").getName()).isEqualTo("analyst@dativa.app");
    }

    @Test
    void rejectsMissingOrInvalidTokens() {
        StompAuthInterceptor interceptor = new StompAuthInterceptor(jwtService, users);

        assertThat(interceptor.authenticate(null)).isNull();
        assertThat(interceptor.authenticate("Basic abc")).isNull();
        assertThat(interceptor.authenticate("Bearer")).isNull();
    }
}
