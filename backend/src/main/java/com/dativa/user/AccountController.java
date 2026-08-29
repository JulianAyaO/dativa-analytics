package com.dativa.user;

import com.dativa.auth.LoginResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
public class AccountController {
    private final UserService users;

    public AccountController(UserService users) {
        this.users = users;
    }

    @PatchMapping("/profile")
    public LoginResponse updateProfile(
            Authentication authentication, @Valid @RequestBody UpdateProfileRequest request) {
        AppUser actor = users.requireByEmail(authentication.getName());
        return users.updateProfile(actor, request.name(), request.email(), request.emailConfirm());
    }

    @PostMapping("/password")
    public void changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
        AppUser actor = users.requireByEmail(authentication.getName());
        users.changePassword(actor, request.currentPassword(), request.newPassword(), request.newPasswordConfirm());
    }
}
