package com.oryfolks.certify.util;

import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Optional;

@Component
public class AdminUserHelper {

    private final UserRepository userRepository;

    public AdminUserHelper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String resolveAdminName(Principal principal) {
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            String pName = principal.getName();
            Optional<User> u = userRepository.findByUsername(pName);
            if (u.isPresent() && u.get().getFullName() != null && !u.get().getFullName().isBlank()) {
                return u.get().getFullName();
            }
            if (!"admin".equalsIgnoreCase(pName) && !"Admin User".equalsIgnoreCase(pName)) {
                return pName;
            }
        }
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null && !auth.getName().isBlank() && !"anonymousUser".equals(auth.getName())) {
                String aName = auth.getName();
                Optional<User> u = userRepository.findByUsername(aName);
                if (u.isPresent() && u.get().getFullName() != null && !u.get().getFullName().isBlank()) {
                    return u.get().getFullName();
                }
                if (!"admin".equalsIgnoreCase(aName) && !"Admin User".equalsIgnoreCase(aName)) {
                    return aName;
                }
            }
        } catch (Exception ignored) {}

        Optional<User> aaravOpt = userRepository.findByUsername("aarav");
        if (aaravOpt.isPresent() && aaravOpt.get().getFullName() != null && !aaravOpt.get().getFullName().isBlank()) {
            return aaravOpt.get().getFullName();
        }

        return "Aarav Mehta";
    }
}
