package com.dativa.user;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
    private final UserService users;

    public AdminUserController(UserService users) {
        this.users = users;
    }

    @GetMapping
    public List<UserAdminResponse> list() {
        return users.list();
    }

    @PostMapping
    public UserAdminResponse create(Authentication authentication, @Valid @RequestBody CreateUserRequest request) {
        AppUser actor = users.requireByEmail(authentication.getName());
        return users.create(actor, request.name(), request.email(), request.password(), request.role());
    }

    @PatchMapping("/{id}")
    public UserAdminResponse update(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        AppUser actor = users.requireByEmail(authentication.getName());
        return users.update(actor, id, request.name(), request.email(), request.role(), request.active());
    }
}
