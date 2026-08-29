package com.dativa.realtime;

import com.dativa.security.JwtService;
import com.dativa.user.AppUser;
import com.dativa.user.AppUserRepository;
import java.util.List;
import org.springframework.lang.Nullable;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

@Component
public class StompAuthInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;
    private final AppUserRepository users;

    public StompAuthInterceptor(JwtService jwtService, AppUserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (accessor.getCommand() == StompCommand.CONNECT) {
            Authentication authentication = authenticate(accessor.getFirstNativeHeader("Authorization"));
            if (authentication == null) {
                throw new MessagingException("Unauthorized");
            }
            accessor.setUser(authentication);
        }

        return message;
    }

    @Nullable
    Authentication authenticate(@Nullable String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }

        try {
            var userId = jwtService.readUserId(authorization.substring(7));
            return users.findById(userId)
                    .filter(AppUser::isActive)
                    .map(StompAuthInterceptor::authentication)
                    .orElse(null);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static Authentication authentication(AppUser user) {
        return new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }
}
