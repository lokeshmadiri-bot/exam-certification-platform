package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.AuthRequest;
import com.oryfolks.certify.dto.AuthResponse;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.repository.UserRepository;
import com.oryfolks.certify.response.ApiResponse;
import com.oryfolks.certify.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

/**
 * AdminAuthController
 *
 * Bridges the A1 admin frontend's expected auth paths at /api/admin/auth/* to the
 * same authentication logic used by the main AuthController at /api/auth/*.
 *
 * This avoids duplicating JWT logic — it delegates to the same AuthenticationManager
 * and JwtUtils beans.
 *
 * Endpoints:
 *   POST /api/admin/auth/login   — authenticate admin user, return JWT token
 *   POST /api/admin/auth/logout  — stateless JWT; client clears token (returns ok: true)
 *   GET  /api/admin/auth/me      — return current user info from JWT Principal
 */
@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    /**
     * POST /api/admin/auth/login
     *
     * Accepts { username, password }, authenticates, returns JWT + user info.
     * The frontend stores the token in localStorage as "admin_token".
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found: " + loginRequest.getUsername()));

        String jwt = jwtUtils.generateJwtToken(user.getUsername(), user.getRole().name());

        AuthResponse authResponse = AuthResponse.builder()
                .token(jwt)
                .username(user.getUsername())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .title(user.getTitle())
                .userId(user.getId())
                .build();

        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    /**
     * POST /api/admin/auth/logout
     *
     * JWT is stateless — no server-side session to destroy. The client clears
     * localStorage. This endpoint exists to satisfy the frontend's logout call.
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> logout() {
        Map<String, Boolean> res = new HashMap<>();
        res.put("ok", true);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", res));
    }

    /**
     * GET /api/admin/auth/me
     *
     * Returns the currently authenticated user's profile from the JWT Principal.
     * Used by the admin shell to display user info without a separate DB round-trip.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Not authenticated"));
        }

        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found: " + principal.getName()));

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("name", user.getFullName());
        userInfo.put("email", user.getUsername());
        userInfo.put("role", user.getRole().name());
        userInfo.put("userId", user.getId());
        userInfo.put("title", user.getTitle());

        return ResponseEntity.ok(ApiResponse.success("User info retrieved", userInfo));
    }
}
