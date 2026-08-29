package com.dativa.imports;

import com.dativa.user.UserService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/imports")
public class ImportController {
    private final ImportService imports;
    private final UserService users;

    public ImportController(ImportService imports, UserService users) {
        this.imports = imports;
        this.users = users;
    }

    @PostMapping
    public Map<String, Integer> commit(Authentication authentication, @Valid @RequestBody ImportCommitRequest request) {
        ImportCommitResult result = imports.commit(users.requireByEmail(authentication.getName()), request);
        return Map.of("imported", result.imported(), "skippedDuplicates", result.skippedDuplicates());
    }
}
