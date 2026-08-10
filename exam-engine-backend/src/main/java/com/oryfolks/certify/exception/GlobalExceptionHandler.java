package com.oryfolks.certify.exception;

import com.oryfolks.certify.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Handles all application exceptions globally and returns
 * a standardized API response.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

        /**
         * Handles resource not found exceptions.
         */
        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(
                        ResourceNotFoundException ex) {

                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(ApiResponse.error(ex.getMessage()));
        }

        /**
         * Handles invalid request exceptions.
         */
        @ExceptionHandler(BadRequestException.class)
        public ResponseEntity<ApiResponse<Void>> handleBadRequest(
                        BadRequestException ex) {

                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(ApiResponse.error(ex.getMessage()));
        }

        /**
         * Handles unauthorized exceptions.
         */
        @ExceptionHandler(UnauthorizedException.class)
        public ResponseEntity<ApiResponse<Void>> handleUnauthorized(
                        UnauthorizedException ex) {

                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(ApiResponse.error(ex.getMessage()));
        }

        /**
         * Handles Spring Security access denied exceptions.
         */
        @ExceptionHandler(AccessDeniedException.class)
        public ResponseEntity<ApiResponse<Void>> handleAccessDenied(
                        AccessDeniedException ex) {

                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(ApiResponse.error(
                                                "You do not have permission to perform this action."));
        }

        /**
         * Handles request validation failures.
         */
        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(
                        MethodArgumentNotValidException ex) {

                Map<String, String> errors = new HashMap<>();

                ex.getBindingResult()
                                .getFieldErrors()
                                .forEach(error -> errors.put(
                                                error.getField(),
                                                error.getDefaultMessage()));

                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(ApiResponse.error(
                                                "Validation failed.",
                                                errors));
        }

        /**
         * Handles all unexpected exceptions.
         */
        @ExceptionHandler(Exception.class)
        public ResponseEntity<ApiResponse<String>> handleException(Exception ex) {

                ex.printStackTrace();

                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(ApiResponse.error(ex.getMessage()));
        }
}