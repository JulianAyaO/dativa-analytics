package com.dativa.user;

public final class PasswordRules {
    private PasswordRules() {}

    public static boolean isStrong(String password) {
        return password != null
                && password.length() >= 8
                && password.chars().anyMatch(Character::isLetter)
                && password.chars().anyMatch(Character::isDigit);
    }
}
