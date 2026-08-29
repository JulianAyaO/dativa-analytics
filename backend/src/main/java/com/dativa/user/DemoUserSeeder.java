package com.dativa.user;

import java.util.UUID;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoUserSeeder implements CommandLineRunner {
    private static final String DEMO_PASSWORD = "Dativa123!";

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;

    public DemoUserSeeder(AppUserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        createIfMissing("admin@dativa.app", "Ana Admin", Role.ADMIN);
        createIfMissing("analyst@dativa.app", "Luis Analista", Role.ANALYST);
        createIfMissing("viewer@dativa.app", "Marta Visualizadora", Role.VIEWER);
    }

    private void createIfMissing(String email, String name, Role role) {
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            return;
        }

        AppUser user = new AppUser();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setFullName(name);
        user.setRole(role);
        user.setActive(true);
        user.setPasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
        users.save(user);
    }
}
