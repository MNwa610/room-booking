package com.example.room_booking.service;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.*;
import java.util.Base64;

public final class Passwords {
    private Passwords() {}

    public static String encode(String password) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt) + "." +
                Base64.getEncoder().encodeToString(derive(password, salt));
    }

    public static boolean matches(String password, String credential) {
        String[] parts = credential.split("[.]");
        return MessageDigest.isEqual(Base64.getDecoder().decode(parts[1]),
                derive(password, Base64.getDecoder().decode(parts[0])));
    }

    private static byte[] derive(String password, byte[] salt) {
        var spec = new PBEKeySpec(password.toCharArray(), salt, 600_000, 256);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException(ex);
        } finally {
            spec.clearPassword();
        }
    }
}
