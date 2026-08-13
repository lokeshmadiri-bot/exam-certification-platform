package com.oryfolks.certify.security;
 
import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.nio.charset.StandardCharsets;
 
public class EncryptionUtils {
    private static final String KEY = "OryFolksCertifyK"; // 16 bytes key
    private static final String IV = "OryFolksCertifyI"; // 16 bytes IV
 
    public static String decrypt(String encryptedBase64) {
        if (encryptedBase64 == null) {
            return null;
        }
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(encryptedBase64);
        } catch (Exception e) {
            // Not Base64, return original input
            return encryptedBase64;
        }
 
        try {
            SecretKeySpec secretKeySpec = new SecretKeySpec(KEY.getBytes(StandardCharsets.UTF_8), "AES");
            IvParameterSpec ivParameterSpec = new IvParameterSpec(IV.getBytes(StandardCharsets.UTF_8));
 
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, ivParameterSpec);
 
            byte[] decrypted = cipher.doFinal(decoded);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // Base64 decoded successfully but decryption failed, return decoded string
            return new String(decoded, StandardCharsets.UTF_8);
        }
    }
}