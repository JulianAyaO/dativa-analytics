package com.dativa.user;

import com.dativa.activity.ActivityService;
import com.dativa.auth.LoginResponse;
import com.dativa.notifications.NotificationService;
import com.dativa.security.JwtService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ActivityService activity;
    private final NotificationService notifications;

    public UserService(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            ActivityService activity,
            NotificationService notifications) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.activity = activity;
        this.notifications = notifications;
    }

    @Transactional
    public LoginResponse login(String email, String password) {
        AppUser user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!user.isActive() || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        user.setLastLoginAt(Instant.now());
        users.save(user);
        return toLogin(user);
    }

    @Transactional
    public LoginResponse register(String name, String email, String password, String passwordConfirm) {
        if (!password.equals(passwordConfirm)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        requireStrong(password);
        requireUniqueEmail(email, null);
        AppUser user = newUser(name, email, password, Role.VIEWER);
        users.save(user);
        activity.record(user, "user.created", "user", "Registro de " + user.getFullName());
        user.setLastLoginAt(Instant.now());
        return toLogin(user);
    }

    public List<UserAdminResponse> list() {
        return users.findAll().stream().map(UserAdminResponse::from).toList();
    }

    @Transactional
    public UserAdminResponse create(AppUser actor, String name, String email, String password, Role role) {
        requireStrong(password);
        requireUniqueEmail(email, null);
        AppUser user = newUser(name, email, password, role);
        users.save(user);
        activity.record(actor, "user.created", "user", "Se creó " + user.getFullName() + " (" + role + ")");
        return UserAdminResponse.from(user);
    }

    @Transactional
    public UserAdminResponse update(
            AppUser actor, UUID id, String name, String email, Role role, boolean active) {
        AppUser user = users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        requireUniqueEmail(email, id);
        if (user.getRole() == Role.ADMIN && role != Role.ADMIN && lastActiveAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot disable the last admin");
        }
        if (user.getRole() == Role.ADMIN && user.isActive() && !active && lastActiveAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot disable the last admin");
        }
        Role previousRole = user.getRole();
        boolean wasActive = user.isActive();
        user.setFullName(name.trim());
        user.setEmail(email.trim().toLowerCase());
        user.setRole(role);
        user.setActive(active);
        users.save(user);
        if (previousRole != role) {
            activity.record(
                    actor,
                    "user.role_changed",
                    "user",
                    "Rol de " + user.getFullName() + ": " + previousRole + " → " + role);
        }
        if (wasActive && !active) {
            activity.record(actor, "user.disabled", "user", "Se desactivó " + user.getFullName());
            notifications.broadcast("user_disabled", "Usuario desactivado", "Se desactivó " + user.getFullName());
        }
        if (!wasActive && active) {
            activity.record(actor, "user.enabled", "user", "Se activó " + user.getFullName());
            notifications.broadcast("user_enabled", "Usuario activado", "Se activó " + user.getFullName());
        }
        return UserAdminResponse.from(user);
    }

    @Transactional
    public LoginResponse updateProfile(AppUser actor, String name, String email, String emailConfirm) {
        if (!email.trim().equalsIgnoreCase(emailConfirm.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Emails do not match");
        }
        requireUniqueEmail(email, actor.getId());
        actor.setFullName(name.trim());
        actor.setEmail(email.trim().toLowerCase());
        users.save(actor);
        return toLogin(actor);
    }

    @Transactional
    public void changePassword(AppUser actor, String current, String next, String confirm) {
        if (!next.equals(confirm)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        if (!passwordEncoder.matches(current, actor.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        requireStrong(next);
        actor.setPasswordHash(passwordEncoder.encode(next));
        users.save(actor);
    }

    public AppUser requireByEmail(String email) {
        return users.findByEmailIgnoreCase(email)
                .filter(AppUser::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    }

    private AppUser newUser(String name, String email, String password, Role role) {
        AppUser user = new AppUser();
        user.setId(UUID.randomUUID());
        user.setFullName(name.trim());
        user.setEmail(email.trim().toLowerCase());
        user.setRole(role);
        user.setActive(true);
        user.setPasswordHash(passwordEncoder.encode(password));
        return user;
    }

    private void requireUniqueEmail(String email, UUID exceptId) {
        users.findByEmailIgnoreCase(email.trim()).ifPresent(existing -> {
            if (exceptId == null || !existing.getId().equals(exceptId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
            }
        });
    }

    private boolean lastActiveAdmin(AppUser user) {
        return users.countByRoleAndActiveTrue(Role.ADMIN) <= 1 && user.getRole() == Role.ADMIN && user.isActive();
    }

    private static void requireStrong(String password) {
        if (!PasswordRules.isStrong(password)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be at least 8 characters and include a letter and a number");
        }
    }

    private LoginResponse toLogin(AppUser user) {
        return new LoginResponse(jwtService.issueToken(user), "Bearer", LoginResponse.UserResponse.from(user));
    }
}
